import { getRepairStep } from "@/server/clients/featherless";
import type { RepairStep, RepairStepRequest } from "@/shared/types";

export async function generateRepairStep(
  request: RepairStepRequest
): Promise<RepairStep> {
  try {
    return await getRepairStep(request);
  } catch {
    const fallbackInstruction =
      request.stepNumber === 1
        ? `Unplug the ${request.device} and inspect the ${request.part} closely for visible damage, looseness, cracks, or buildup before touching anything else.`
        : request.stepNumber === 2
          ? `Using a basic household tool if needed, gently test whether the ${request.part} can be cleaned, tightened, or repositioned without forcing it.`
          : `If the ${request.part} is visibly damaged, replace that part if possible; otherwise stop and consider a repair shop or a sustainable replacement part.`;

    const isTerminal = request.stepNumber >= 3;

    return {
      stepNumber: request.stepNumber,
      instruction: fallbackInstruction,
      voicePrompt: fallbackInstruction,
      isTerminal,
    };
  }
}
