"use client";

interface Props {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-red-900/40 border border-red-500/30 p-4">
      <span className="text-red-400 text-lg">!</span>
      <p className="flex-1 text-sm text-red-300">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-200 text-sm">
          Dismiss
        </button>
      )}
    </div>
  );
}
