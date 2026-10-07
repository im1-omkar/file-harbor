import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  verifyR2Object,
  deleteR2Object,
} from "../lib/r2.js";

export const fileRouter = Router();

fileRouter.use(requireAuth);

const uploadUrlSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z.number().positive("File size must be positive"),
  mimeType: z.string().min(1, "MIME type is required"),
  folderId: z.string().optional().nullable(),
});

/**
 * POST /api/files/upload-url
 * Generate short-lived presigned R2 PUT URL for direct browser upload
 */
fileRouter.post("/upload-url", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, size, mimeType, folderId } = uploadUrlSchema.parse(req.body);
    const userId = req.user!.id;
    const requestedSize = BigInt(size);

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.storageUsed + requestedSize > user.storageLimit) {
      res.status(400).json({ error: "Storage quota exceeded (5 GiB limit)" });
      return;
    }

    const file = await prisma.file.create({
      data: {
        name,
        objectKey: "pending",
        size: requestedSize,
        mimeType,
        userId,
        folderId: folderId || null,
        status: "UPLOADING",
      },
    });

    const objectKey = `users/${userId}/${file.id}`;

    await prisma.file.update({
      where: { id: file.id },
      data: { objectKey },
    });

    const uploadUrl = await generatePresignedUploadUrl(objectKey, mimeType);

    res.status(201).json({
      fileId: file.id,
      uploadUrl,
      objectKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Upload URL generation error:", error);
    res.status(500).json({ error: "Failed to prepare file upload" });
  }
});

/**
 * POST /api/files/:id/complete
 * Verify object on R2 using HeadObject, compare size, mark READY, update storageUsed
 */
fileRouter.post("/:id/complete", async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const file = await prisma.file.findFirst({
      where: { id, userId, status: "UPLOADING" },
    });

    if (!file) {
      res.status(404).json({ error: "File record not found or already completed" });
      return;
    }

    const r2Result = await verifyR2Object(file.objectKey);

    if (!r2Result.exists) {
      await prisma.file.update({
        where: { id },
        data: { status: "FAILED" },
      });
      res.status(400).json({ error: "File object not found on R2 storage" });
      return;
    }

    const actualSize = r2Result.size > 0n ? r2Result.size : file.size;

    const updatedFile = await prisma.$transaction(async (tx) => {
      const updated = await tx.file.update({
        where: { id },
        data: {
          status: "READY",
          size: actualSize,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          storageUsed: {
            increment: actualSize,
          },
        },
      });

      return updated;
    });

    res.json({
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        size: updatedFile.size.toString(),
        mimeType: updatedFile.mimeType,
        folderId: updatedFile.folderId,
        status: updatedFile.status,
        createdAt: updatedFile.createdAt,
      },
    });
  } catch (error) {
    console.error("Complete file upload error:", error);
    res.status(500).json({ error: "Failed to finalize file upload" });
  }
});

/**
 * GET /api/files?folderId=
 * List user's READY files in given folder
 */
fileRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const folderIdQuery = req.query.folderId;
    const folderId = typeof folderIdQuery === "string" && folderIdQuery.trim() ? folderIdQuery.trim() : null;

    const files = await prisma.file.findMany({
      where: {
        userId,
        folderId,
        status: "READY",
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size.toString(),
        mimeType: f.mimeType,
        folderId: f.folderId,
        status: f.status,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

/**
 * GET /api/files/:id/download
 * Generate presigned R2 GET URL
 */
fileRouter.get("/:id/download", async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const file = await prisma.file.findFirst({
      where: { id, userId, status: "READY" },
    });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const downloadUrl = await generatePresignedDownloadUrl(file.objectKey, file.name);

    res.json({
      downloadUrl,
      name: file.name,
    });
  } catch (error) {
    console.error("Download URL generation error:", error);
    res.status(500).json({ error: "Failed to prepare download" });
  }
});

/**
 * DELETE /api/files/:id
 * Delete object from R2, decrement storageUsed, remove DB record
 */
fileRouter.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const file = await prisma.file.findFirst({
      where: { id, userId },
    });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    await deleteR2Object(file.objectKey);

    await prisma.$transaction(async (tx) => {
      await tx.file.delete({ where: { id } });

      if (file.status === "READY" && file.size > 0n) {
        await tx.user.update({
          where: { id: userId },
          data: {
            storageUsed: {
              decrement: file.size,
            },
          },
        });
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});
