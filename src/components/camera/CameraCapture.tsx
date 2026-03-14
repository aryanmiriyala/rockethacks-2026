"use client";

// feat/camera-capture — owns this component
import { useEffect } from "react";
import useCamera from "@/lib/hooks/useCamera";
import ErrorBanner from "@/components/ui/ErrorBanner";

interface Props {
  onCapture: (blob: Blob) => void;
}

export default function CameraCapture({ onCapture }: Props) {
  const { videoRef, error, startCamera, stopCamera, capturePhoto } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  function handleCapture() {
    const blob = capturePhoto();
    if (blob) onCapture(blob);
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {error && <ErrorBanner message={error} />}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full flex-1 object-cover bg-black"
      />

      {/* Capture button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleCapture}
          className="w-20 h-20 rounded-full bg-white border-4 border-brand-green shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Take photo"
        >
          <div className="w-14 h-14 rounded-full bg-brand-green" />
        </button>
      </div>

      <div className="absolute top-4 left-0 right-0 text-center">
        <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded-full">
          Point at the broken device
        </p>
      </div>
    </div>
  );
}
