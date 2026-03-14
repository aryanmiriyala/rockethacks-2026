"use client";

// feat/camera-capture — owns this page
// Teammate: wire up CameraCapture + PhotoPreview, then POST to /api/upload -> /api/identify -> /api/session

import { useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/camera/CameraCapture";
import PhotoPreview from "@/components/camera/PhotoPreview";
import Spinner from "@/components/ui/Spinner";
import ErrorBanner from "@/components/ui/ErrorBanner";
import type { DeviceIdentification, UploadUrlResponse, IdentifyResponse, CreateSessionResponse } from "@/lib/types";

type Stage = "capture" | "preview" | "identifying" | "error";

export default function NewRepairPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("capture");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoConfirmed(blob: Blob) {
    setPhotoBlob(blob);
    setStage("identifying");
    setError(null);

    try {
      // 1. Get presigned S3 upload URL
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "device.jpg", contentType: "image/jpeg" } satisfies import("@/lib/types").UploadUrlRequest),
      });
      const { uploadUrl, s3Key }: UploadUrlResponse = await uploadRes.json();

      // 2. Upload photo directly to S3
      await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });

      // 3. Identify device via Gemini Vision
      const identifyRes = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3Key } satisfies import("@/lib/types").IdentifyRequest),
      });
      const { identification }: IdentifyResponse = await identifyRes.json();

      // 4. Create repair session in DynamoDB
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identification } satisfies import("@/lib/types").CreateSessionRequest),
      });
      const { sessionId }: CreateSessionResponse = await sessionRes.json();

      router.push(`/repair/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStage("error");
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
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
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white">
          <Spinner />
          <p className="text-brand-muted">Identifying your device...</p>
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
