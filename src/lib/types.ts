// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript interfaces — single source of truth for all teammates
// ─────────────────────────────────────────────────────────────────────────────

export type SessionStatus = "identifying" | "in_progress" | "complete" | "error";

export interface DeviceIdentification {
  device: string;       // e.g. "Floor Lamp"
  part: string;         // e.g. "Socket Tab"
  confidence: number;   // 0–1
  s3Key: string;        // uploaded photo key in S3
  rekognitionLabels?: string[];  // fallback labels from Rekognition
}

export interface RepairStep {
  stepNumber: number;
  instruction: string;
  voicePrompt: string;  // text sent to ElevenLabs (may differ from instruction)
  isTerminal: boolean;  // true = this is the last step
}

export interface RepairSession {
  sessionId: string;
  status: SessionStatus;
  createdAt: string;       // ISO timestamp
  updatedAt: string;
  identification: DeviceIdentification | null;
  currentStepNumber: number;
  steps: RepairStep[];
  jaseci: {
    graphId: string | null;
    nodeId: string | null;  // current Jaseci graph node
  };
}

// API request/response shapes

export interface CreateSessionRequest {
  identification: DeviceIdentification;
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface UpdateSessionRequest {
  status?: SessionStatus;
  currentStepNumber?: number;
  steps?: RepairStep[];
  jaseci?: RepairSession["jaseci"];
}

export interface IdentifyRequest {
  s3Key: string;
}

export interface IdentifyResponse {
  identification: DeviceIdentification;
}

export interface RepairStepRequest {
  sessionId: string;
  device: string;
  part: string;
  stepNumber: number;
  previousSteps: string[];
  userMessage?: string;
}

export interface RepairStepResponse {
  step: RepairStep;
}

export interface OrchestrateRequest {
  sessionId: string;
  event: "start" | "step_done" | "skip" | "repeat";
  payload?: Record<string, unknown>;
}

export interface OrchestrateResponse {
  nodeId: string;
  nextStepNumber: number;
  isTerminal: boolean;
}

export interface SpeakRequest {
  text: string;
  voiceId?: string;
}

export interface UploadUrlRequest {
  filename: string;
  contentType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}
