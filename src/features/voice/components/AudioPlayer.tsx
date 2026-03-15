"use client";

// feat/voice — owns this component
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string | null;
  fallbackText?: string;
  fallbackNonce?: number;
  onPlaybackChange?: (playing: boolean) => void;
}

export default function AudioPlayer({ src, fallbackText, fallbackNonce = 0, onPlaybackChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);

  function speakFallback() {
    if (!fallbackText || !("speechSynthesis" in window)) {
      onPlaybackChange?.(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fallbackText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => onPlaybackChange?.(true);
    utterance.onend = () => onPlaybackChange?.(false);
    utterance.onerror = () => onPlaybackChange?.(false);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!src || !audioRef.current) return;
    setBlocked(false);
    audioRef.current.src = src;
    audioRef.current.play().then(() => {
      onPlaybackChange?.(true);
    }).catch((error) => {
      console.error("Audio playback failed, falling back to speechSynthesis:", error);
      setBlocked(true);
      speakFallback();
    });
  }, [src, fallbackText]);

  useEffect(() => {
    if (fallbackNonce === 0) return;
    speakFallback();
  }, [fallbackNonce]);

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
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
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

    function handleEnded() {
      onPlaybackChange?.(false);
    }

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onPlaybackChange]);

  function handleManualPlay() {
    audioRef.current?.play().then(() => onPlaybackChange?.(true)).catch(() => speakFallback());
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
