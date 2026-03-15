// feat/vision-identify — owns this file
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { getAwsConfig } from "@/server/env";

let rekognitionClient: RekognitionClient | null = null;

function getBucketName(): string | null {
  return process.env.S3_BUCKET_NAME?.trim() || null;
}

function getRekognitionClient(): RekognitionClient {
  if (!rekognitionClient) {
    rekognitionClient = new RekognitionClient(getAwsConfig());
  }

  return rekognitionClient;
}

export async function validateLabels(s3Key: string): Promise<string[]> {
  const bucket = getBucketName();
  if (!bucket) {
    return [];
  }

  const result = await getRekognitionClient().send(
    new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: s3Key,
        },
      },
      MaxLabels: 10,
      MinConfidence: 70,
    })
  );

  return (result.Labels ?? []).map((l) => l.Name ?? "").filter(Boolean);
}
