import { identifyDeviceFromImage, observeDeviceProblem } from "@/server/clients/gemini";
import type { DeviceIdentification } from "@/shared/types";

export async function identifyDevice(imageBase64: string): Promise<DeviceIdentification> {
  const [identifyResult, observationResult] = await Promise.allSettled([
    identifyDeviceFromImage(imageBase64),
    observeDeviceProblem(imageBase64),
  ]);

  if (identifyResult.status === "rejected") {
    const reason =
      identifyResult.reason instanceof Error
        ? identifyResult.reason.message
        : "Gemini identification failed";
    throw new Error(reason);
  }

  const identification: DeviceIdentification = identifyResult.value;

  if (observationResult.status === "fulfilled") {
    identification.problemObservation = observationResult.value;
  }

  return identification;
}
