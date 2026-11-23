"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trainingCatalogue } from "@/lib/training/catalogue";
import type { ProgressRow } from "@/lib/training/content";
export default function TrainingPersonSummary({
  personId,
}: {
  personId: string;
}) {
  const [currentRevisions, setCurrentRevisions] = useState<
    Record<string, number>
  >({});
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [message, setMessage] = useState("Loading training…");
  useEffect(() => {
    let active = true;
    async function load() {
      const [learner, library] = await Promise.all([
        supabase
          .from("training_learners")
          .select("id")
          .eq("person_id", personId)
          .maybeSingle(),
        supabase
          .from("training_modules")
          .select("id,revision")
          .eq("status", "published"),
      ]);
      if (!active) return;
      if (learner.error || library.error) {
        setMessage("Training records are unavailable.");
        return;
      }
      setCurrentRevisions(
        Object.fromEntries((library.data ?? []).map((r) => [r.id, r.revision])),
      );
      if (!learner.data) {
        setMessage("No training enrolment recorded.");
        return;
      }
      const result = await supabase
        .from("training_progress")
        .select("*")
        .eq("learner_id", learner.data.id)
        .order("revision", { ascending: false });
      if (!active) return;
      setRows(result.data ?? []);
      setMessage(
        result.error
          ? "Training records are unavailable."
          : result.data?.length
            ? ""
            : "Enrolled; learning has not yet been recorded.",
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [personId]);
  const latest = rows.filter(
    (row, index) =>
      rows.findIndex((r) => r.module_id === row.module_id) === index,
  );
  return (
    <div className="mt-4 rounded-xl bg-purple-50 p-4">
      <h3 className="font-semibold">Training progress</h3>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
      {latest.map((row) => (
        <p className="mt-2 text-sm" key={row.module_id}>
          {trainingCatalogue.find((c) => c.id === row.module_id)?.title ??
            row.module_id}{" "}
          · revision {row.revision} ·{" "}
          {currentRevisions[row.module_id] !== row.revision
            ? "Earlier revision; current learning review required"
            : row.approved_at
              ? "Assessment approved"
              : row.quiz_passed
                ? "Knowledge check passed; practical review pending"
                : "Learning in progress"}
        </p>
      ))}
      <a
        className="mt-3 inline-block min-h-11 text-sm text-purple-900 underline"
        href="/admin?view=training"
      >
        Open training workspace
      </a>
    </div>
  );
}
