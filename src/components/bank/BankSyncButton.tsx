"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type State =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "done"; imported: number }
  | { status: "error"; message: string };

export function BankSyncButton() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });

  async function sync() {
    setState({ status: "syncing" });
    try {
      const res = await fetch("/api/bank/sync", { method: "POST", body: JSON.stringify({}) });
      const data = (await res.json()) as { imported?: number; error?: string };
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Synkronisering misslyckades" });
        return;
      }
      setState({ status: "done", imported: data.imported ?? 0 });
      router.refresh();
    } catch {
      setState({ status: "error", message: "Nätverksfel" });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sync}
        disabled={state.status === "syncing"}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50"
      >
        <RefreshCw size={15} className={state.status === "syncing" ? "animate-spin" : ""} />
        {state.status === "syncing" ? "Synkar..." : "Synka transaktioner"}
      </button>

      {state.status === "done" && (
        <span className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 size={15} />
          {state.imported} transaktioner hämtade
        </span>
      )}
      {state.status === "error" && (
        <span className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={15} />
          {state.message}
        </span>
      )}
    </div>
  );
}
