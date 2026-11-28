"use client";

import { useState } from "react";
import { linkProblem } from "./links";

type Result = { error: { code?: string } | null; status: number };

/**
 * Runs a save with a request id that is kept for an unconfirmed retry and
 * dropped once the database answers. A different save is blocked while an
 * earlier one is unconfirmed, so a retry can never become a second record.
 */
export function useSafeSave(onSaved: () => void, onRefresh: () => void = onSaved) {
  const [request, setRequest] = useState<{ id: string; signature: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(signature: string, call: (id: string) => PromiseLike<Result>) {
    if (request && request.signature !== signature) {
      setMessage("The last save was not confirmed. Retry it unchanged, or refresh before changing it.");
      return false;
    }
    const attempt = request ?? { id: crypto.randomUUID(), signature };
    setRequest(attempt); setBusy(true); setMessage("");
    try {
      const result = await call(attempt.id);
      if (!result.error) { setRequest(null); onSaved(); return true; }
      const problem = linkProblem(result.error.code, result.status);
      if (!problem.retry) setRequest(null);
      setMessage(problem.message);
      if (problem.refresh) onRefresh();
    } catch { setMessage(linkProblem(null, 0).message); }
    finally { setBusy(false); }
    return false;
  }

  return { run, busy, message, setMessage };
}
