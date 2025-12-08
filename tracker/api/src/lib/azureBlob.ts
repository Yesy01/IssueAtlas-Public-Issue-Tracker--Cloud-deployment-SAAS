import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { randomUUID } from "crypto";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const containerName = process.env.AZURE_STORAGE_CONTAINER || "issues";

if (!accountName) {
  console.warn(
    "[azureBlob] AZURE_STORAGE_ACCOUNT_NAME is not set. Blob uploads will fail."
  );
}

// Prefer connection string if present (useful for local dev with keys)
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

function getBlobServiceClient(): BlobServiceClient {
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  if (!accountName) {
    throw new Error(
      "AZURE_STORAGE_ACCOUNT_NAME is required when no connection string is set"
    );
  }

  const credential = new DefaultAzureCredential();

  return new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
}

export async function uploadIssueFile(
  file: Express.Multer.File,
  opts?: { issueId?: string }
): Promise<{ key: string; url: string }> {
  const issueId = opts?.issueId || "unassigned";
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  // get extension from filename if possible
  let ext = "bin";
  const original = file.originalname || "";
  const lastDot = original.lastIndexOf(".");
  if (lastDot !== -1 && lastDot < original.length - 1) {
    ext = original.substring(lastDot + 1).toLowerCase();
  }

  const blobName = `${year}/${month}/${issueId}/${randomUUID()}.${ext}`;

  const service = getBlobServiceClient();
  const containerClient = service.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype || "application/octet-stream",
    },
  });

  const key = blobName;
  const url = `/api/images/${encodeURIComponent(key)}`;
  return { key, url };
}

export async function downloadIssueFile(key: string): Promise<{
  stream: NodeJS.ReadableStream;
  contentType?: string;
}> {
  const service = getBlobServiceClient();
  const containerClient = service.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(key);

  const resp = await blobClient.download();
  const stream = resp.readableStreamBody;
  if (!stream) {
    throw new Error("No stream returned from blob download");
  }

  return {
    stream,
    contentType:
      resp.contentType || resp.details.contentType || "application/octet-stream",
  };
}
