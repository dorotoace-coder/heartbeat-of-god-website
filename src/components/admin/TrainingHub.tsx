"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  hydrateModule,
  contentProblems,
  type ModuleRow,
  type LearnerRow,
  type ProgressRow,
  type EnrolmentRow,
} from "@/lib/training/content";
import TrainingReader from "./TrainingReader";
import TrainingEditor from "./TrainingEditor";
import TrainingManagement from "./TrainingManagement";
import { BookOpen, ArrowUpRight, Layers3, Search } from "lucide-react";
import { trainingCatalogue } from "@/lib/training/catalogue";

export default function TrainingHub() {
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [enrolments, setEnrolments] = useState<EnrolmentRow[]>([]);
  const [editors, setEditors] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [isPastor, setIsPastor] = useState(false);
  const [status, setStatus] = useState("Opening the training library…");
  const [editing, setEditing] = useState(false);
  const [assistedLearnerId, setAssistedLearnerId] = useState("");
  const load = useCallback(async () => {
    const identity = await supabase.auth.getUser();
    if (!identity.data.user) {
      setStatus(
        "Sign in with your existing Pulse OS account to open training.",
      );
      return;
    }
    setUserId(identity.data.user.id);
    const access = await supabase.rpc("training_access");
    if (access.error) {
      setStatus(
        "The training library is not connected yet. No progress has been recorded.",
      );
      return;
    }
    if (!access.data?.allowed) {
      setStatus("Your training enrolment is awaiting a leader’s assignment.");
      return;
    }
    setIsPastor(Boolean(access.data.pastor));
    const [library, people, records, assignments, editorRows] =
      await Promise.all([
        supabase
          .from("training_modules")
          .select("*")
          .order("revision", { ascending: false }),
        supabase.from("training_learners").select("*"),
        supabase.from("training_progress").select("*"),
        supabase.from("training_enrolments").select("*"),
        supabase
          .from("training_editors")
          .select("module_id")
          .eq("user_id", identity.data.user.id),
      ]);
    if (
      [library, people, records, assignments, editorRows].some((r) => r.error)
    ) {
      setStatus("Training could not load. Check your connection and retry.");
      return;
    }
    setRows(library.data ?? []);
    setLearners(people.data ?? []);
    setProgress(records.data ?? []);
    setEnrolments(assignments.data ?? []);
    setEditors((editorRows.data ?? []).map((r) => r.module_id));
    setStatus(
      library.data?.length ? "" : "No curriculum has been published yet.",
    );
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("foundation");
  const activeModule = trainingCatalogue.find((m) => m.id === selected)!;
  const candidateRows = rows.filter((r) => r.id === selected);
  const row = editing
    ? (candidateRows.find(
        (r) => r.status === "draft" || r.status === "in_review",
      ) ?? candidateRows[0])
    : (candidateRows.find((r) => r.status === "published") ?? candidateRows[0]);
  const course =
    row && contentProblems(row.content).length === 0
      ? hydrateModule(row)
      : undefined;
  const ownLearner = learners.find((l) => l.user_id === userId);
  const ownEnrolment =
    ownLearner &&
    enrolments.find(
      (e) => e.learner_id === ownLearner.id && e.module_id === selected,
    );
  const canEdit = isPastor || editors.includes(selected);
  const canReview =
    isPastor ||
    enrolments.some(
      (e) => e.reviewer_id === userId && e.module_id === selected,
    );
  const assistedLearners = learners.filter(
    (l) =>
      !l.user_id &&
      enrolments.some(
        (e) =>
          e.learner_id === l.id &&
          e.module_id === selected &&
          (isPastor || e.reviewer_id === userId),
      ),
  );
  const recordingLearner =
    assistedLearners.find((l) => l.id === assistedLearnerId) ??
    (ownEnrolment ? ownLearner : undefined);
  const filtered = trainingCatalogue.filter((m) =>
    `${m.title} ${m.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section
      aria-labelledby="training-title"
      className="space-y-7 text-slate-950"
    >
      <Link href="/admin?view=help" className="inline-flex min-h-11 items-center rounded-xl border border-purple-200 bg-white px-4 text-sm font-semibold text-purple-950">How to use Pulse OS →</Link>
      <header className="relative overflow-hidden rounded-[2rem] bg-[#2e1252] p-7 text-white shadow-xl shadow-purple-950/10 sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 h-80 w-80 rounded-full border-[35px] border-white/10 shadow-[inset_0_0_70px_#7b2ff7,0_0_80px_#7b2ff755]"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-purple-200">
            HBG · Formation & Service
          </p>
          <h1
            id="training-title"
            className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl"
          >
            Grow in the Word.
            <br />
            Serve with purpose.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-purple-100">
            A shared place to learn, practise and grow into faithful service.
            Begin with Foundation School, then explore your department.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/20 px-4 py-2">
              Win Souls
            </span>
            <span className="rounded-full border border-white/20 px-4 py-2">
              Build Believers
            </span>
            <span className="rounded-full border border-white/20 px-4 py-2">
              Send Lights
            </span>
          </div>
        </div>
      </header>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <label className="block rounded-2xl border border-purple-100 bg-white p-4 text-sm font-semibold lg:hidden">
          Choose your training
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setEditing(false);
              setAssistedLearnerId("");
            }}
            className="mt-2 min-h-12 w-full rounded-xl border border-purple-200 p-3 text-base"
          >
            {trainingCatalogue.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <aside className="hidden min-w-0 rounded-3xl border border-purple-100 bg-white p-5 lg:block">
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search training</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find your department"
              className="min-w-0 w-full bg-transparent outline-none focus:ring-2 focus:ring-purple-500"
            />
          </label>
          <nav aria-label="Training modules" className="mt-4 space-y-1">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m.id);
                  setEditing(false);
                  setAssistedLearnerId("");
                }}
                aria-current={selected === m.id ? "page" : undefined}
                className={`flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium ${selected === m.id ? "bg-purple-100 text-purple-950" : "hover:bg-slate-50"}`}
              >
                {m.title}
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            ))}
          </nav>
          {!filtered.length && (
            <p className="p-4 text-sm text-slate-600">
              No departments match that search.
            </p>
          )}
        </aside>
        <article className="min-w-0 rounded-3xl border border-purple-100 bg-white p-7 sm:p-10">
          {status && (
            <p
              role="status"
              className="mb-5 rounded-xl bg-purple-50 p-4 text-sm leading-6"
            >
              {status}
            </p>
          )}
          {canReview && assistedLearners.length > 0 && (
            <label className="mb-5 block text-sm font-medium">
              In-person learner register
              <select
                className="mt-2 min-h-11 w-full rounded-xl border p-3"
                value={assistedLearnerId}
                onChange={(e) => setAssistedLearnerId(e.target.value)}
              >
                <option value="">My own learning / reading only</option>
                {assistedLearners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.display_name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block font-normal text-slate-600">
                Record the participant’s actual reading, teaching and answers.
                The leader’s identity is retained in the audit trail.
              </span>
            </label>
          )}
          {canEdit && course && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="mb-5 min-h-11 rounded-xl border px-4 text-sm"
            >
              {editing ? "Read teaching" : "Edit curriculum"}
            </button>
          )}
          {course ? (
            editing && canEdit && row ? (
              <TrainingEditor
                key={`${row.id}-${row.revision}-${row.updated_at}`}
                row={row}
                isPastor={isPastor}
                onSaved={() => void load()}
              />
            ) : (
              <TrainingReader
                key={`${course.id}-${course.revision}-${recordingLearner?.id ?? "reader"}`}
                course={course}
                learner={recordingLearner}
                progress={progress.find(
                  (p) =>
                    p.learner_id === recordingLearner?.id &&
                    p.module_id === course.id &&
                    p.revision === course.revision,
                )}
                onSaved={() => void load()}
              />
            )
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <BookOpen
                  className="text-purple-700"
                  size={32}
                  aria-hidden="true"
                />
                <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  Awaiting curriculum
                </span>
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-purple-700">
                {activeModule.track}
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                {activeModule.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {activeModule.summary}
              </p>
              <div className="mt-8 rounded-2xl bg-[#f8f5fc] p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Layers3 size={18} aria-hidden="true" />
                  Your learning pathway
                </h3>
                <ol className="mt-4 grid gap-3 text-sm text-slate-700">
                  <li>1. Read the lessons and reflect on Scripture.</li>
                  <li>2. Practise the scripts and service scenarios.</li>
                  <li>3. Complete the knowledge check.</li>
                  <li>
                    4. Receive attendance and practical assessment approval.
                  </li>
                </ol>
              </div>
            </>
          )}
          {(canReview || isPastor) && (
            <TrainingManagement
              course={course}
              learners={learners}
              enrolments={enrolments}
              progress={progress}
              isPastor={isPastor}
              userId={userId}
              onSaved={() => void load()}
            />
          )}
        </article>
      </div>
    </section>
  );
}
