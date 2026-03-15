"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CAMERA_ROUTES = new Set(["/repair/new", "/test/demo"]);

function stopActiveCameraStreams() {
  for (const video of Array.from(document.querySelectorAll("video"))) {
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
      video.pause();
      video.srcObject = null;
    }
  }
}

function stopActiveMedia() {
  stopActiveCameraStreams();
  window.dispatchEvent(new CustomEvent("fixit:stop-media"));
}

export default function RouteCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    if (!CAMERA_ROUTES.has(pathname)) {
      stopActiveMedia();
    }
  }, [pathname]);

  useEffect(() => {
    const handlePageHide = () => stopActiveMedia();

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return null;
}
