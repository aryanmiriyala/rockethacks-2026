"use client";

// feat/camera-capture — owns this component
import { useEffect, useState } from "react";
import Button from "@/shared/ui/Button";

interface Props {
  blob: Blob;
  onConfirm: () => void;
  onRetake: () => void;
}

export default function PhotoPreview({ blob, onConfirm, onRetake }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <div className="fixed inset-0 flex flex-col">
      {src && (
        <img src={src} alt="Captured device" className="w-full flex-1 min-h-0 object-cover" />
      )}

      <div className="p-4 flex gap-3">
        <Button variant="ghost" onClick={onRetake} className="flex-1">
          Retake
        </Button>
        <Button variant="primary" onClick={onConfirm} className="flex-1">
          Looks Good
        </Button>
      </div>
    </div>
  );
}
