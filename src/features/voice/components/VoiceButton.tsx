"use client";

// feat/voice — owns this component
interface Props {
  listening: boolean;
  onPress: (onCommand: (cmd: string) => void) => void;
  onVoiceCommand: (cmd: string) => void;
}

export default function VoiceButton({ listening, onPress, onVoiceCommand }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <button
        onClick={() => onPress(onVoiceCommand)}
        disabled={listening}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg
          ${listening
            ? "bg-red-500 scale-110 animate-pulse"
            : "bg-brand-surface border-2 border-brand-green hover:bg-brand-green/10 active:scale-95"
          }`}
        aria-label={listening ? "Listening..." : "Tap to speak"}
      >
        <MicIcon className={listening ? "text-white" : "text-brand-green"} />
      </button>
      <p className="text-xs text-brand-muted">
        {listening ? "Listening..." : 'Tap or say "Done"'}
      </p>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 ${className}`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </svg>
  );
}
