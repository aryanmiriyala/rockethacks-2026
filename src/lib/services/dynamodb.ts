// feat/session-aws — owns this file
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DeviceIdentification, RepairSession, UpdateSessionRequest } from "@/lib/types";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE_NAME!;

export async function createSession(identification: DeviceIdentification): Promise<string> {
  const sessionId = randomUUID();
  const now = new Date().toISOString();

  const session: RepairSession = {
    sessionId,
    status: "identifying",
    createdAt: now,
    updatedAt: now,
    identification,
    currentStepNumber: 1,
    steps: [],
    jaseci: { graphId: null, nodeId: null },
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: session }));
  return sessionId;
}

export async function getSession(sessionId: string): Promise<RepairSession | null> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { sessionId } }));
  return (result.Item as RepairSession) ?? null;
}

export async function updateSession(
  sessionId: string,
  patch: UpdateSessionRequest
): Promise<RepairSession> {
  const now = new Date().toISOString();
  const updates = { ...patch, updatedAt: now };

  // Build DynamoDB UpdateExpression dynamically
  const keys = Object.keys(updates) as (keyof typeof updates)[];
  const updateExpr = "SET " + keys.map((k) => `#${k} = :${k}`).join(", ");
  const exprNames = Object.fromEntries(keys.map((k) => [`#${k}`, k]));
  const exprValues = Object.fromEntries(keys.map((k) => [`:${k}`, updates[k]]));

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { sessionId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as RepairSession;
}
