// feat/vision-identify — owns this file
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function validateLabels(s3Key: string): Promise<string[]> {
  const result = await rekognition.send(
    new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: process.env.S3_BUCKET_NAME!,
          Name: s3Key,
        },
      },
      MaxLabels: 10,
      MinConfidence: 70,
    })
  );

  return (result.Labels ?? []).map((l) => l.Name ?? "").filter(Boolean);
}
