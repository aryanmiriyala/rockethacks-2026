// feat/jaseci-orchestration — owns this Lambda
// Deployed on AWS Lambda as the orchestration proxy between Next.js and Jaseci Labs

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Jaseci Labs API base URL — set as Lambda environment variable
const JASECI_URL = process.env.JASECI_URL;
const JASECI_TOKEN = process.env.JASECI_TOKEN;
const TABLE = process.env.DYNAMODB_TABLE_NAME;

/**
 * Jaseci stateful repair graph event handler.
 *
 * Event shape: { sessionId, event: "start"|"step_done"|"skip"|"repeat", payload? }
 * Returns: { nodeId, nextStepNumber, isTerminal }
 */
exports.handler = async (event) => {
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
  const { sessionId, event: repairEvent, payload = {} } = body;

  // Call Jaseci Labs graph walker
  const jasRes = await fetch(`${JASECI_URL}/js/walker_run`, {
    method: "POST",
    headers: {
      "Authorization": `token ${JASECI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "repair_walker",
      ctx: { sessionId, event: repairEvent, ...payload },
    }),
  });

  if (!jasRes.ok) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `Jaseci error: ${jasRes.status}` }),
    };
  }

  const jasData = await jasRes.json();
  const { node_id: nodeId, next_step: nextStepNumber, is_terminal: isTerminal } = jasData;

  // Update DynamoDB session with new Jaseci graph position
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { sessionId },
    UpdateExpression: "SET jaseci.nodeId = :nodeId, currentStepNumber = :step, updatedAt = :ts, #status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":nodeId": nodeId,
      ":step": nextStepNumber,
      ":ts": new Date().toISOString(),
      ":status": isTerminal ? "complete" : "in_progress",
    },
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, nextStepNumber, isTerminal }),
  };
};
