import { getPresignedUploadUrl, putImageObject } from "@/server/clients/aws/s3";

export async function createUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; s3Key: string }> {
  const s3Key = `uploads/${Date.now()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(s3Key, contentType);
  return { uploadUrl, s3Key };
}

function formatKeyTimestamp(value: string): string {
  return value.replaceAll(":", "-").replaceAll(".", "-");
}

export async function uploadInspectionFrame(params: {
  sessionId: string;
  capturedAt: string;
  source: "manual" | "requested";
  imageBase64: string;
  contentType?: string;
}): Promise<{ s3Key: string }> {
  const contentType = params.contentType ?? "image/jpeg";
  const bytes = Buffer.from(params.imageBase64, "base64");
  const s3Key = `sessions/${params.sessionId}/frames/${formatKeyTimestamp(params.capturedAt)}-${params.source}.jpg`;

  await putImageObject(s3Key, bytes, contentType);

  return { s3Key };
}
