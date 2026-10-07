import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { deleteStorageObject } from "../lib/storage.js";

export const folderRouter = Router();

folderRouter.use(requireAuth);

const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100),
  parentId: z.string().optional().nullable(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100),
});

/**
 * POST /api/folders
 */
folderRouter.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, parentId } = createFolderSchema.parse(req.body);
    const userId = req.user!.id;

    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        res.status(404).json({ error: "Parent folder not found" });
        return;
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        userId,
        parentId: parentId || null,
      },
    });

    res.status(201).json({ folder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Create folder error:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

/**
 * GET /api/folders?parentId=
 */
folderRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const parentIdQuery = req.query.parentId;
    const parentId = typeof parentIdQuery === "string" && parentIdQuery.trim() ? parentIdQuery.trim() : null;

    const folders = await prisma.folder.findMany({
      where: {
        userId,
        parentId,
      },
      orderBy: { name: "asc" },
    });

    res.json({ folders });
  } catch (error) {
    console.error("Get folders error:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

/**
 * PATCH /api/folders/:id
 */
folderRouter.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const { name } = updateFolderSchema.parse(req.body);
    const userId = req.user!.id;

    const folder = await prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: { name },
    });

    res.json({ folder: updatedFolder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Update folder error:", error);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

/**
 * Helper to recursively gather all subfolder IDs and files for deletion
 */
async function getFolderContentRecursive(folderId: string, userId: string) {
  const folderIds: string[] = [folderId];
  let filesToDelete: { id: string; objectKey: string; size: bigint }[] = [];

  const directFiles = await prisma.file.findMany({
    where: { folderId, userId },
    select: { id: true, objectKey: true, size: true },
  });
  filesToDelete.push(...directFiles);

  const childFolders = await prisma.folder.findMany({
    where: { parentId: folderId, userId },
    select: { id: true },
  });

  for (const child of childFolders) {
    const subResult = await getFolderContentRecursive(child.id, userId);
    folderIds.push(...subResult.folderIds);
    filesToDelete.push(...subResult.filesToDelete);
  }

  return { folderIds, filesToDelete };
}

/**
 * DELETE /api/folders/:id
 */
folderRouter.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const folder = await prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const { folderIds, filesToDelete } = await getFolderContentRecursive(id, userId);

    let freedBytes = 0n;
    for (const file of filesToDelete) {
      await deleteStorageObject(file.objectKey);
      freedBytes += file.size;
    }

    await prisma.$transaction(async (tx) => {
      if (filesToDelete.length > 0) {
        await tx.file.deleteMany({
          where: { id: { in: filesToDelete.map((f) => f.id) } },
        });
      }

      await tx.folder.deleteMany({
        where: { id: { in: folderIds } },
      });

      if (freedBytes > 0n) {
        await tx.user.update({
          where: { id: userId },
          data: {
            storageUsed: {
              decrement: freedBytes,
            },
          },
        });
      }
    });

    res.json({ success: true, freedBytes: freedBytes.toString() });
  } catch (error) {
    console.error("Delete folder error:", error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});
