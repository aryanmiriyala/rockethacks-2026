import { getPresignedUploadUrl } from "@/server/clients/aws/s3";

export async function createUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; s3Key: string }> {
  const s3Key = `uploads/${Date.now()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(s3Key, contentType);
  return { uploadUrl, s3Key };
}
