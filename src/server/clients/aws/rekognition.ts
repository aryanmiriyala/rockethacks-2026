// feat/vision-identify — owns this file
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { getAwsConfig, getRequiredEnv } from "@/server/env";

const rekognition = new RekognitionClient(getAwsConfig());
const BUCKET = getRequiredEnv("S3_BUCKET_NAME");

export async function validateLabels(s3Key: string): Promise<string[]> {
  const result = await rekognition.send(
    new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: BUCKET,
          Name: s3Key,
        },
      },
      MaxLabels: 10,
      MinConfidence: 70,
    })
  );

  return (result.Labels ?? []).map((l) => l.Name ?? "").filter(Boolean);
}
