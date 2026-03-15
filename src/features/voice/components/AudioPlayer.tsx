"use client";

// feat/voice — owns this component
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string | null;
  onPlaybackChange?: (playing: boolean) => void;
}

export default function AudioPlayer({ src, onPlaybackChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!src || !audioRef.current) return;
    setBlocked(false);
    audioRef.current.src = src;
    audioRef.current.play().then(() => {
      onPlaybackChange?.(true);
    }).catch(() => setBlocked(true));
  }, [src]);

  useEffect(() => {
    function handleListenStart() {
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      onPlaybackChange?.(false);
    }

    function handleStopMedia() {
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      onPlaybackChange?.(false);
      setBlocked(false);
    }

    window.addEventListener("fixit:voice-listen-start", handleListenStart);
    window.addEventListener("fixit:stop-media", handleStopMedia);
    return () => {
      window.removeEventListener("fixit:voice-listen-start", handleListenStart);
      window.removeEventListener("fixit:stop-media", handleStopMedia);
    };
  }, [onPlaybackChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handlePlay() {
      onPlaybackChange?.(true);
    }

    function handleStop() {
      onPlaybackChange?.(false);
    }

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleStop);
    audio.addEventListener("pause", handleStop);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleStop);
      audio.removeEventListener("pause", handleStop);
    };
  }, [onPlaybackChange]);

  function handleManualPlay() {
    audioRef.current?.play().then(() => onPlaybackChange?.(true)).catch(console.error);
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
