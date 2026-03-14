# AWS Infrastructure — Fix-It-Flow

## Services

| Service | Purpose |
|---|---|
| **Amplify** | Hosts the Next.js PWA |
| **Lambda** | Orchestration proxy (Jaseci graph events) |
| **S3** | Photo uploads + repair manuals |
| **DynamoDB** | Session and repair state |
| **Rekognition** | Label validation backup for device identification |

---

## DynamoDB Table Schema

**Table name:** `fix-it-flow-sessions`
**Partition key:** `sessionId` (String)

```
sessionId        String   (PK)
status           String   "identifying" | "in_progress" | "complete" | "error"
createdAt        String   ISO timestamp
updatedAt        String   ISO timestamp
identification   Map      { device, part, confidence, s3Key, rekognitionLabels? }
currentStepNumber Number
steps            List     [ { stepNumber, instruction, voicePrompt, isTerminal } ]
jaseci           Map      { graphId, nodeId }
```

---

## Lambda Setup

**Function name:** `fix-it-flow-orchestrator`
**Runtime:** Node.js 20.x
**Handler:** `index.handler`
**Timeout:** 15 seconds

### Environment Variables (Lambda console)

```
JASECI_URL=https://your-jaseci-instance.com
JASECI_TOKEN=your-jaseci-token
DYNAMODB_TABLE_NAME=fix-it-flow-sessions
AWS_REGION=us-east-1
```

### IAM Role Permissions

The Lambda execution role needs:
- `dynamodb:UpdateItem` on the sessions table
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

---

## S3 Bucket Policy

Bucket: `fix-it-flow-uploads`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedUploads",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::YOUR_ACCOUNT:role/YOUR_NEXTJS_ROLE" },
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::fix-it-flow-uploads/*"
    }
  ]
}
```

**CORS config** (required for browser direct uploads):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["https://your-amplify-domain.com", "http://localhost:3000"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Amplify Deployment

1. Connect the GitHub repo to Amplify
2. Set all environment variables from `.env.local.example` in Amplify Console → Environment variables
3. Build settings are auto-detected for Next.js
