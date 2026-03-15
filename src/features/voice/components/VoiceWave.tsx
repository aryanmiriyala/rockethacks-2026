"use client";

interface Props {
  active: boolean;
  tone?: "listening" | "speaking";
  className?: string;
}

export default function VoiceWave({ active, tone = "listening", className = "" }: Props) {
  const colorClass = tone === "speaking" ? "bg-white/85" : "bg-brand-green";

  return (
    <div className={`flex h-8 items-end gap-1 ${className}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className={`${colorClass} w-1.5 rounded-full transition-all ${
            active ? "animate-[voicewave_1s_ease-in-out_infinite]" : "opacity-50"
          }`}
          style={{
            height: active ? `${12 + ((index % 3) + 1) * 6}px` : `${8 + ((index % 2) + 1) * 4}px`,
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}
