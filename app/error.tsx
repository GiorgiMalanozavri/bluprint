"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-2">Something went wrong</h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          An unexpected error occurred. Your data is safe — try refreshing.
        </p>
        <button
          onClick={reset}
          className="btn-primary h-11 px-8 text-sm inline-flex items-center gap-2"
        >
          <RefreshCcw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}
