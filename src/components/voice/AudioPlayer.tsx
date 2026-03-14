"use client";

// feat/voice — owns this component
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string | null;
}

export default function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!src || !audioRef.current) return;
    setBlocked(false);
    audioRef.current.src = src;
    audioRef.current.play().catch(() => setBlocked(true));
  }, [src]);

  function handleManualPlay() {
    audioRef.current?.play().catch(console.error);
    setBlocked(false);
  }

  return (
    <>
      <audio ref={audioRef} hidden />
      {blocked && (
        <button
          onClick={handleManualPlay}
          className="w-full rounded-xl bg-brand-surface border border-brand-green/40 py-3 text-brand-green text-sm font-medium hover:bg-brand-green/10 transition-colors"
        >
          Tap to hear instructions
        </button>
      )}
    </>
  );
}
