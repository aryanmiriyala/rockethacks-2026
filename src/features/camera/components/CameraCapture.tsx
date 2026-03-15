"use client";

// feat/camera-capture — owns this component
import { useEffect } from "react";
import useCamera from "@/features/camera/hooks/useCamera";
import ErrorBanner from "@/shared/ui/ErrorBanner";
import Spinner from "@/shared/ui/Spinner";

interface Props {
  onCapture: (blob: Blob) => void;
}

export default function CameraCapture({ onCapture }: Props) {
  const { videoRef, error, isReady, startCamera, stopCamera, capturePhoto } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  async function handleCapture() {
    const blob = await capturePhoto();
    if (blob) {
      stopCamera();
      onCapture(blob);
    }
  }

  return (
    <div className="fixed inset-0 bg-black">
      {error && <ErrorBanner message={error} />}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover bg-black"
      />

      {/* Loading overlay while camera initializes */}
      {!isReady && !error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <Spinner />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
        <div className="flex justify-center">
          <button
            onClick={handleCapture}
            disabled={!isReady}
            className="h-24 w-24 rounded-full border-4 border-brand-green bg-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Take photo"
          >
            <div className="h-16 w-16 rounded-full bg-brand-green" />
          </button>
        </div>
      </div>

      <div className="absolute left-0 right-0 top-[max(1rem,env(safe-area-inset-top))] z-30 text-center px-4">
        <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded-full">
          Point at the broken device
        </p>
      </div>
    </div>
  );
}
