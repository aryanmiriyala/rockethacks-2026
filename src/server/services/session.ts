import {
  createSession,
  getSession,
  updateSession,
} from "@/server/clients/aws/dynamodb";
import { generateRepairStep } from "@/server/services/repair";
import type {
  DeviceIdentification,
  RepairSession,
  UpdateSessionRequest,
} from "@/shared/types";

export async function createRepairSession(
  identification: DeviceIdentification
): Promise<string> {
  const sessionId = await createSession(identification);

  const firstStep = await generateRepairStep({
    sessionId,
    device: identification.device,
    part: identification.part,
    stepNumber: 1,
    previousSteps: [],
    problemObservation: identification.problemObservation,
  });

  await updateSession(sessionId, {
    status: firstStep.isTerminal ? "complete" : "in_progress",
    currentStepNumber: 1,
    steps: [firstStep],
  });

  return sessionId;
}

export async function getRepairSession(
  sessionId: string
): Promise<RepairSession | null> {
  return getSession(sessionId);
}

export async function updateRepairSession(
  sessionId: string,
  patch: UpdateSessionRequest
): Promise<RepairSession> {
  return updateSession(sessionId, patch);
}
