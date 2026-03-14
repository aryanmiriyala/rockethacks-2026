"use client";

// Voice layer test page — not part of the final app, for development only
// Visit http://localhost:3000/test/voice to test ElevenLabs TTS

import { useState, useRef } from "react";

export default function VoiceTestPage() {
  const [text, setText] = useState("I see you're working on a basic floor lamp. First, let's check the socket tab. Use a screwdriver to pull it up slightly. Tell me when you're done.");
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleSpeak() {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
        setStatus("playing");
        audioRef.current.onended = () => setStatus("idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-brand-dark p-6 flex flex-col gap-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Voice Layer Test</h1>
        <p className="text-brand-muted text-sm mt-1">ElevenLabs TTS — development only</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-brand-muted" htmlFor="tts-input">
          Text to speak
        </label>
        <textarea
          id="tts-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-xl bg-brand-surface border border-white/10 p-3 text-white text-sm resize-none focus:outline-none focus:border-brand-green"
        />
      </div>

      <button
        onClick={handleSpeak}
        disabled={status === "loading" || !text.trim()}
        className="rounded-xl bg-brand-green py-4 font-semibold text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {status === "loading" ? "Generating..." : status === "playing" ? "Playing..." : "Speak"}
      </button>

      {status === "error" && error && (
        <div className="rounded-xl bg-red-900/40 border border-red-500/30 p-4 text-red-300 text-sm">
          <p className="font-semibold mb-1">Error</p>
          <p>{error}</p>
        </div>
      )}

      {status === "playing" && (
        <div className="rounded-xl bg-brand-surface p-4 text-brand-green text-sm text-center">
          Playing audio...
        </div>
      )}

      <audio ref={audioRef} hidden />

      <div className="rounded-xl bg-brand-surface p-4 space-y-2 text-xs text-brand-muted">
        <p className="font-semibold text-white">Checklist</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Audio plays without errors → ElevenLabs API key + voice ID are valid</li>
          <li>Voice sounds natural → voice ID is correct</li>
          <li>Response feels fast (&lt;1s) → <code className="text-brand-green">eleven_turbo_v2_5</code> model is working</li>
          <li>If you see an error: check <code className="text-brand-green">ELEVENLABS_API_KEY</code> and <code className="text-brand-green">ELEVENLABS_VOICE_ID</code> in <code className="text-brand-green">.env.local</code></li>
        </ul>
      </div>
    </main>
  );
}
