"use client";

// feat/voice — owns this component
import { useEffect, useRef } from "react";

interface Props {
  src: string | null;
}

export default function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (src && audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().catch(console.error);
    }
  }, [src]);

  return <audio ref={audioRef} hidden />;
}
