"use client";

// feat/camera-capture — owns this page

import { useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/camera/CameraCapture";
import PhotoPreview from "@/components/camera/PhotoPreview";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ErrorBanner from "@/components/ui/ErrorBanner";
import type { DeviceIdentification, IdentifyResponse, CreateSessionResponse } from "@/lib/types";

type Stage = "capture" | "preview" | "identifying" | "identified" | "starting" | "error";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function NewRepairPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("capture");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [identification, setIdentification] = useState<DeviceIdentification | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoConfirmed(blob: Blob) {
    setStage("identifying");
    setError(null);
    setPhotoSrc(URL.createObjectURL(blob));

    try {
      const imageBase64 = await blobToBase64(blob);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const { identification }: IdentifyResponse = await res.json();
      setIdentification(identification);
      setStage("identified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStage("error");
    }
  }

  async function handleStartRepair() {
    if (!identification) return;
    setStage("starting");
    setError(null);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identification }),
      });
      if (!res.ok) throw new Error(`Session failed (${res.status})`);
      const { sessionId }: CreateSessionResponse = await res.json();
      router.push(`/repair/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStage("error");
    }
  }

  return (
    <main className="flex h-dvh flex-col">
      {stage === "capture" && (
        <CameraCapture onCapture={(blob) => { setPhotoBlob(blob); setStage("preview"); }} />
      )}

      {stage === "preview" && photoBlob && (
        <PhotoPreview
          blob={photoBlob}
          onConfirm={() => handlePhotoConfirmed(photoBlob)}
          onRetake={() => setStage("capture")}
        />
      )}

      {stage === "identifying" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Spinner />
          <p className="text-brand-muted text-sm">Analyzing your device...</p>
        </div>
      )}

      {stage === "identified" && identification && (
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 overflow-y-auto">
          {photoSrc && (
            <img
              src={photoSrc}
              alt="Captured device"
              className="w-full rounded-xl object-cover max-h-52"
            />
          )}

          <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-3">
            <div>
              <p className="text-brand-muted text-xs uppercase tracking-wide mb-0.5">Device</p>
              <p className="text-white font-semibold">{identification.device}</p>
            </div>
            <div>
              <p className="text-brand-muted text-xs uppercase tracking-wide mb-0.5">Issue area</p>
              <p className="text-brand-green font-medium">{identification.part}</p>
            </div>
          </div>

          {identification.problemObservation && (
            <div className="bg-brand-surface rounded-xl p-4">
              <p className="text-brand-green text-xs uppercase tracking-wide font-medium mb-2">
                What we found
              </p>
              <p className="text-white text-sm leading-relaxed">
                {identification.problemObservation}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStage("capture")} className="flex-1">
              Retake
            </Button>
            <Button variant="primary" onClick={handleStartRepair} className="flex-1">
              Start Repair
            </Button>
          </div>
        </div>
      )}

      {stage === "starting" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Spinner />
          <p className="text-brand-muted text-sm">Starting your repair...</p>
        </div>
      )}

      {stage === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 gap-4">
          <ErrorBanner message={error ?? "Unknown error"} onDismiss={() => setStage("capture")} />
        </div>
      )}
    </main>
  );
}
