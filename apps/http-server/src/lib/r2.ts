import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "file-harbor";

// Configure S3Client for Cloudflare R2 (or AWS S3 fallback)
export const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Generate a short-lived presigned PUT URL for browser direct upload
 */
export async function generatePresignedUploadUrl(
  objectKey: string,
  mimeType: string,
  expiresInSeconds = 900 // 15 mins
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ContentType: mimeType,
  });

  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a short-lived presigned GET URL for browser download
 */
export async function generatePresignedDownloadUrl(
  objectKey: string,
  filename: string,
  expiresInSeconds = 900 // 15 mins
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
  });

  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Inspect object headers on R2 to confirm upload completion and actual size
 */
export async function verifyR2Object(objectKey: string): Promise<{ exists: boolean; size: bigint }> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });
    const response = await r2Client.send(command);
    return {
      exists: true,
      size: BigInt(response.ContentLength || 0),
    };
  } catch (error) {
    console.error("R2 HeadObject error:", error);
    return { exists: false, size: 0n };
  }
}

/**
 * Delete object from R2
 */
export async function deleteR2Object(objectKey: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error("R2 DeleteObject error:", error);
    return false;
  }
}
