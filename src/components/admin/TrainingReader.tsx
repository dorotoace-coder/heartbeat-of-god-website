"use client";
import { useState } from "react";
import { Download, Printer, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { TrainingModule } from "@/lib/training/types";
import type { LearnerRow, ProgressRow } from "@/lib/training/content";
import { trainingOfflineHtml } from "@/lib/training/offline";

export default function TrainingReader({
  course,
  learner,
  progress,
  onSaved,
}: {
  course: TrainingModule;
  learner?: LearnerRow;
  progress?: ProgressRow;
  onSaved: () => void;
}) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [panel, setPanel] = useState("lessons");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    correct: number;
    total: number;
  } | null>(null);
  const lesson = course.lessons[lessonIndex];
  async function save(quiz: boolean) {
    if (!learner) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("training_record", {
        p_learner: learner.id,
        p_module: course.id,
        p_revision: course.revision,
        p_lessons: quiz ? (progress?.read_lesson_ids ?? []) : [lesson.id],
        p_answers: quiz ? answers : null,
      });
      if (error) throw error;
      if (quiz)
        setResult({ correct: data.quiz_correct, total: data.quiz_total });
      setMessage(
        quiz
          ? data.quiz_passed
            ? "Knowledge check passed. Your leader will review attendance and practical service."
            : "Review the explanations, then try again when ready."
          : "Reading progress saved.",
      );
      onSaved();
    } catch {
      setMessage(
        "Progress could not be saved. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([trainingOfflineHtml(course)], {
        type: "text/html;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `HBG-${course.id}-v${course.revision}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Reading copy downloaded. Keep it private on shared devices. Progress is saved only while connected in Pulse OS.",
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-600">
          Revision {course.revision} ·{" "}
          {course.status === "published"
            ? "Published teaching"
            : "Draft for review"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={download}
            className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"
          >
            <Download size={16} />
            Offline reading
          </button>
          <button
            onClick={() => window.print()}
            className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"
          >
            <Printer size={16} />
            Print / PDF
          </button>
        </div>
      </div>
      <div id="training-print">
        <header className="mb-6">
          <p className="text-sm font-semibold text-purple-700">
            Heartbeat of God · Workers Training
          </p>
          <p className="hidden text-sm font-semibold print:block">
            {course.status === "published"
              ? `Published · Revision ${course.revision}`
              : `DRAFT · For pastoral review · Revision ${course.revision}`}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">{course.title}</h2>
          <p className="mt-3 text-lg text-slate-600">{course.summary}</p>
        </header>
        <nav
          aria-label="Training sections"
          className="mb-6 flex flex-wrap gap-2 print:hidden"
        >
          {[
            ["lessons", "Lessons"],
            ["role", "Role & standards"],
            ["scripts", "Scripts"],
            ["practice", "Practice"],
            ["checklist", "Checklist"],
            ["quiz", "Knowledge check"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPanel(id)}
              aria-pressed={panel === id}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${panel === id ? "bg-purple-900 text-white" : "bg-purple-50 text-purple-950"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {learner && course.status === "published" && (
          <p className="mb-5 rounded-xl bg-purple-50 p-3 text-sm leading-6 print:hidden">
            {progress?.read_lesson_ids.length ?? 0} / {course.lessons.length}{" "}
            lessons read ·{" "}
            {progress?.quiz_passed
              ? "Knowledge check passed"
              : "Knowledge check pending"}{" "}
            ·{" "}
            {progress?.approved_at
              ? "Assessment approved"
              : "Leader assessment pending"}
          </p>
        )}
        <div className={panel === "lessons" ? "" : "hidden print:block"}>
          <nav
            aria-label="Lessons"
            className="mb-5 flex flex-wrap gap-2 print:hidden"
          >
            {course.lessons.map((l, index) => (
              <button
                key={l.id}
                aria-current={lessonIndex === index ? "step" : undefined}
                onClick={() => setLessonIndex(index)}
                className={`min-h-11 rounded-xl px-3 py-2 text-sm ${lessonIndex === index ? "bg-purple-900 text-white" : "bg-slate-100"}`}
              >
                {index + 1}. {l.title}
                {progress?.read_lesson_ids.includes(l.id) && (
                  <CheckCircle2
                    aria-label="Read"
                    className="ml-2 inline"
                    size={14}
                  />
                )}
              </button>
            ))}
          </nav>
          {course.lessons.map((l, index) => (
            <section
              key={l.id}
              className={`${index === lessonIndex ? "" : "hidden print:block"} mb-8 space-y-4`}
            >
              <h3 className="text-2xl font-semibold">{l.title}</h3>
              <p className="rounded-xl bg-purple-50 p-4 font-medium text-purple-950">
                {l.objective}
              </p>
              {l.paragraphs.map((p, i) => (
                <p className="text-base leading-8 text-slate-700" key={i}>
                  {p}
                </p>
              ))}
              {l.scripture.map((s, i) => (
                <blockquote
                  key={i}
                  className="border-l-4 border-purple-300 pl-4 leading-7"
                >
                  <p>{s.text}</p>
                  <cite className="mt-2 block text-sm not-italic text-purple-800">
                    {s.reference} · {s.version}
                  </cite>
                </blockquote>
              ))}
              <p className="rounded-xl border border-purple-100 p-4 leading-7">
                <strong>Reflect and practise: </strong>
                {l.reflection}
              </p>
              {course.status !== "published" && l.sourceNote && (
                <p className="rounded-xl border border-amber-200 p-4 text-sm leading-7 text-amber-950">
                  <strong>Leader’s review note: </strong>
                  {l.sourceNote}
                </p>
              )}
            </section>
          ))}
          {learner && course.status === "published" && (
            <button
              disabled={busy}
              onClick={() => save(false)}
              className="mb-6 min-h-12 rounded-xl bg-purple-900 px-5 text-white disabled:opacity-50 print:hidden"
            >
              {busy ? "Saving…" : "Mark this lesson read"}
            </button>
          )}
          <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
            <button
              disabled={lessonIndex === 0}
              onClick={() => setLessonIndex((i) => i - 1)}
              className="min-h-11 rounded-xl border px-4 disabled:opacity-40"
            >
              Previous lesson
            </button>
            <button
              disabled={lessonIndex === course.lessons.length - 1}
              onClick={() => setLessonIndex((i) => i + 1)}
              className="min-h-11 rounded-xl border px-4 disabled:opacity-40"
            >
              Next lesson
            </button>
          </div>
        </div>
        <Section visible={panel === "role"} title="Your role">
          <List items={course.role.duties} />
          <h4 className="mt-4 font-semibold">Boundaries</h4>
          <List items={course.role.boundaries} />
          <p className="mt-4">Reporting line: {course.role.reportsTo}</p>
        </Section>
        <Section visible={panel === "role"} title="Standards for service">
          <List items={course.standards} />
        </Section>
        <Section
          visible={panel === "scripts"}
          title="Words for real situations"
        >
          {course.scripts.map((s, i) => (
            <div
              key={i}
              className="my-5 break-inside-avoid rounded-xl bg-slate-50 p-4"
            >
              <h4 className="font-semibold">
                {i + 1}. {s.situation}
              </h4>
              <p className="mt-2 leading-7">“{s.words}”</p>
            </div>
          ))}
        </Section>
        <Section visible={panel === "practice"} title="Practise together">
          {course.drills.map((d, i) => (
            <div key={i} className="my-5 space-y-3 break-inside-avoid">
              <h4 className="font-semibold">{d.situation}</h4>
              <p className="rounded-xl border border-rose-100 p-4">
                <strong>Wrong response: </strong>
                {d.wrong}
              </p>
              <p className="rounded-xl border border-emerald-100 p-4">
                <strong>Better response: </strong>
                {d.right}
              </p>
            </div>
          ))}
        </Section>
        <Section visible={panel === "checklist"} title="Service checklist">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold">Before service</h4>
              <Checklist items={course.checklist.before} />
            </div>
            <div>
              <h4 className="font-semibold">After service</h4>
              <Checklist items={course.checklist.after} />
            </div>
          </div>
        </Section>
        <Section visible={panel === "quiz"} title="Knowledge check">
          <p className="mb-4 text-sm text-slate-600">
            Answer all three correctly. Review and retry as needed. Attendance
            and practical approval are separate.
          </p>
          {course.quiz.map((q, i) => (
            <fieldset
              key={q.id}
              className="my-5 min-w-0 break-inside-avoid rounded-xl border p-4"
            >
              <legend className="px-1 font-semibold">
                {i + 1}. {q.question}
              </legend>
              {q.options.map((option, n) => (
                <label
                  key={n}
                  className="my-2 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-purple-50"
                >
                  <input
                    type="radio"
                    name={`${course.id}-${q.id}`}
                    value={n}
                    checked={answers[q.id] === n}
                    onChange={() => setAnswers((p) => ({ ...p, [q.id]: n }))}
                    className="mt-1"
                  />
                  <span>{option}</span>
                </label>
              ))}
              {result && (
                <p className="mt-3 rounded-lg bg-purple-50 p-3 text-sm">
                  {q.explanation}
                </p>
              )}
            </fieldset>
          ))}
          {learner && course.status === "published" && (
            <button
              disabled={
                busy || course.quiz.some((q) => answers[q.id] === undefined)
              }
              onClick={() => save(true)}
              className="min-h-12 rounded-xl bg-purple-900 px-5 text-white disabled:opacity-50 print:hidden"
            >
              Submit knowledge check
            </button>
          )}
          {result && (
            <p className="mt-3 font-semibold">
              {result.correct} / {result.total} correct
            </p>
          )}
        </Section>
        <Section visible={panel === "practice"} title="Worker testimony">
          <p className="leading-7">
            {course.testimony.kind === "placeholder" && (
              <strong>Placeholder — </strong>
            )}
            {course.testimony.text}
          </p>
        </Section>
        <footer className="mt-8 border-t pt-4 text-xs text-slate-500">
          Heartbeat of God · {course.title} · Revision {course.revision} ·{" "}
          {course.status === "published"
            ? "Published"
            : "Draft — not approved for teaching"}
        </footer>
      </div>
      <p
        role="status"
        className="text-sm leading-6 text-purple-950 print:hidden"
      >
        {message}
      </p>
      <style>{`@media print {
      body {background:white!important;margin:0!important}
      body *:has(#training-print) {display:block!important;margin:0!important;padding:0!important;border:0!important;background:white!important;min-height:0!important;max-width:none!important;width:auto!important}
      body *:not(:has(#training-print)):not(#training-print):not(#training-print *) {display:none!important}
      #training-print {position:static!important;width:auto!important;padding:0!important;background:white;color:#111}
      #training-print .print\\:hidden {display:none!important}
      #training-print .print\\:block {display:block!important}
      #training-print h2,#training-print h3,#training-print h4 {break-after:avoid}
      #training-print p,#training-print li,#training-print blockquote {font-size:11pt!important;line-height:1.6!important;orphans:3;widows:3}
      #training-print footer {break-before:avoid}
      @page {size:A4;margin:16mm}
    }`}</style>
    </div>
  );
}
function Section({
  title,
  children,
  visible,
}: {
  title: string;
  children: React.ReactNode;
  visible: boolean;
}) {
  return (
    <section
      className={`${visible ? "" : "hidden print:block"} my-8 border-t border-purple-100 pt-6`}
    >
      <h3 className="mb-4 text-xl font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 leading-7">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {items.map((item, i) => (
        <li key={i}>
          <label className="flex items-start gap-3 leading-7">
            <input type="checkbox" className="mt-2" />
            {item}
          </label>
        </li>
      ))}
    </ul>
  );
}
