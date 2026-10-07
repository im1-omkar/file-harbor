// Re-export from storage.ts for backward compatibility
export {
  BUCKET_NAME,
  storageClient as r2Client,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  verifyStorageObject as verifyR2Object,
  deleteStorageObject as deleteR2Object,
} from "./storage.js";
