// feat/session-aws — owns this file
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAwsConfig } from "@/server/env";

let s3Client: S3Client | null = null;

function getBucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  if (!bucket) {
    throw new Error("Missing required environment variable: S3_BUCKET_NAME");
  }

  return bucket;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(getAwsConfig());
  }

  return s3Client;
}

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 300 }); // 5 min
}

export async function putImageObject(key: string, bytes: Buffer, contentType: string): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );
}

export async function getImageObjectBase64(key: string): Promise<string> {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`S3 object has no body for key: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes).toString("base64");
}

export async function getManualUrl(deviceId: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: `manuals/${deviceId}.pdf`,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}
