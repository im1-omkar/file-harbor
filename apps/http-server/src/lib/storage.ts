import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.SUPABASE_S3_ENDPOINT || "";
const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY || "";
const region = process.env.SUPABASE_S3_REGION || "ap-southeast-1";
export const BUCKET_NAME = process.env.SUPABASE_S3_BUCKET_NAME || "file-harbor";

// Configure S3Client for Supabase Storage (S3 Protocol)
export const storageClient = new S3Client({
  region,
  endpoint: endpoint || undefined,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
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

  return getSignedUrl(storageClient, command, { expiresIn: expiresInSeconds });
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

  return getSignedUrl(storageClient, command, { expiresIn: expiresInSeconds });
}

/**
 * Inspect object headers on Supabase Storage to confirm upload completion and actual size
 */
export async function verifyStorageObject(
  objectKey: string
): Promise<{ exists: boolean; size: bigint }> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });
    const response = await storageClient.send(command);
    return {
      exists: true,
      size: BigInt(response.ContentLength || 0),
    };
  } catch (error: any) {
    if (error?.name !== "NotFound" && error?.$metadata?.httpStatusCode !== 404) {
      console.error("Storage HeadObject unexpected error:", error);
    }
    return { exists: false, size: 0n };
  }
}

/**
 * Delete object from Supabase Storage
 */
export async function deleteStorageObject(objectKey: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });
    await storageClient.send(command);
    return true;
  } catch (error) {
    console.error("Storage DeleteObject error:", error);
    return false;
  }
}
