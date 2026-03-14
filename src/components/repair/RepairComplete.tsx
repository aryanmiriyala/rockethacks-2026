"use client";

// feat/repair-walkthrough — owns this component
import Link from "next/link";
import type { RepairSession } from "@/lib/types";
import Button from "@/components/ui/Button";

interface Props {
  session: RepairSession;
}

export default function RepairComplete({ session }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center space-y-8">
      <div className="text-6xl">🔧</div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-white">Repair Complete!</h2>
        <p className="text-brand-muted">
          You successfully repaired your{" "}
          <span className="text-brand-green font-semibold">
            {session.identification?.device ?? "device"}
          </span>.
        </p>
        <p className="text-sm text-brand-muted">
          One less device in the landfill. Good work.
        </p>
      </div>

      <Link href="/repair/new" className="w-full max-w-xs">
        <Button variant="primary" className="w-full">
          Fix Another Device
        </Button>
      </Link>
    </div>
  );
}
