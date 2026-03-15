"use client";

// feat/camera-capture — owns this hook
import { useState, useRef, useCallback, useEffect } from "react";

export default function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        const video = videoRef.current;
        const markReady = () => setIsReady(true);

        video.srcObject = mediaStream;
        video.onloadedmetadata = markReady;
        video.onloadeddata = markReady;
        video.oncanplay = markReady;
        video.onplaying = markReady;

        await video.play().catch(() => {});

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          setIsReady(true);
        } else {
          // Some mobile browsers are slow to fire readiness events even after permission is granted.
          window.setTimeout(() => {
            if (streamRef.current && video.readyState > 0) {
              setIsReady(true);
            }
          }, 1200);
        }
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onloadeddata = null;
      videoRef.current.oncanplay = null;
      videoRef.current.onplaying = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    const handlePageHide = () => stopCamera();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopCamera();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopCamera();
    };
  }, [stopCamera]);

  const capturePhoto = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current) return resolve(null);
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return resolve(null);

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
  }, []);

  return { videoRef, error, isReady, startCamera, stopCamera, capturePhoto };
}
