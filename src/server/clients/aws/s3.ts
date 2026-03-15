// feat/session-aws — owns this file
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAwsConfig, getRequiredEnv } from "@/server/env";

const s3 = new S3Client(getAwsConfig());
const BUCKET = getRequiredEnv("S3_BUCKET_NAME");

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
}

export async function getManualUrl(deviceId: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: `manuals/${deviceId}.pdf`,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
