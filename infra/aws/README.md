# AWS Infrastructure — Fix-It-Flow

## Services Used

| Service      | Purpose                                          |
|--------------|--------------------------------------------------|
| **DynamoDB** | Session and conversation persistence (required)  |

> S3, Lambda, Rekognition, and Amplify are configured in the codebase but not active in the current application flow.

## DynamoDB Table Schema

**Table name:** `rockethacks-fix-it-flow-sessions` (set via `DYNAMODB_TABLE_NAME` env var)

**Partition key:** `sessionId` (String)

The table stores two session types under the same partition key.

### Repair Session

```text
sessionId           String   (PK)
status              String   "identifying" | "in_progress" | "complete" | "error"
createdAt           String   ISO timestamp
updatedAt           String   ISO timestamp
identification      Map      { device, part, confidence, problemObservation }
currentStepNumber   Number
steps               List     [ { stepNumber, instruction, voicePrompt, isTerminal } ]
```

### Inspection Session

```text
sessionId           String   (PK)
status              String   "active" | "complete" | "error"
createdAt           String   ISO timestamp
updatedAt           String   ISO timestamp
userProblem         String
itemLabel           String   (null until identified)
currentViewRequest  String   camera direction hint shown on screen
latestFinding       Map      { issueSummary, confidence, recommendedOutcome, rationale, requestedView, safetyWarnings }
messages            List     [ { role, content, createdAt } ]
frames              List     [ { capturedAt, source, geminiSummary } ]
```

## Setup

### 1. Create the DynamoDB Table

In the AWS Console or via CLI:

```bash
aws dynamodb create-table \
  --table-name rockethacks-fix-it-flow-sessions \
  --attribute-definitions AttributeName=sessionId,AttributeType=S \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. IAM Permissions

The IAM user or role running the app needs:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:UpdateItem"
  ],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/rockethacks-fix-it-flow-sessions"
}
```

### 3. Environment Variables

Add to `.env.local`:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_NAME=rockethacks-fix-it-flow-sessions
```
