"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  contentProblems,
  type LearnerRow,
  type EnrolmentRow,
  type ProgressRow,
} from "@/lib/training/content";
import type { TrainingModule } from "@/lib/training/types";

type Person = { id: string; full_name: string };
type Staff = { user_id: string; full_name: string };
const input =
  "mt-1 min-h-11 w-full rounded-xl border border-purple-200 bg-white p-3";
export default function TrainingManagement({
  course,
  learners,
  enrolments,
  progress,
  isPastor,
  userId,
  onSaved,
}: {
  course?: TrainingModule;
  learners: LearnerRow[];
  enrolments: EnrolmentRow[];
  progress: ProgressRow[];
  isPastor: boolean;
  userId: string;
  onSaved: () => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [person, setPerson] = useState("");
  const [account, setAccount] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [classes, setClasses] = useState<{ id: string; title: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isPastor) return;
    let active = true;
    void Promise.all([
      supabase
        .from("congregation_people")
        .select("id,full_name")
        .order("full_name")
        .limit(1000),
      supabase.rpc("pastor_staff_access"),
      supabase
        .from("foundation_classes")
        .select("id,title")
        .order("starts_on", { ascending: false }),
    ]).then(([p, s, c]) => {
      if (active) {
        setPeople(p.data ?? []);
        setStaff(s.data ?? []);
        setClasses(c.data ?? []);
        if (p.error || s.error || c.error)
          setMessage("The people or staff directory could not load.");
      }
    });
    return () => {
      active = false;
    };
  }, [isPastor]);
  async function run(
    name: string,
    args: Record<string, unknown>,
    success: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const r = await supabase.rpc(name, args);
      if (r.error) throw new Error(r.error.message);
      setMessage(success);
      onSaved();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "The change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const value = JSON.parse(await file.text());
      const errors = contentProblems(value);
      if (errors.length) throw new Error(errors.join(" "));
      const r = await supabase.rpc("training_save_module", {
        p_id: value.id,
        p_revision: 0,
        p_content: value,
        p_expected_at: null,
      });
      if (r.error) throw new Error(r.error.message);
      setMessage("Imported as a draft. Review the teaching before publishing.");
      onSaved();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-purple-200 p-5">
      <h3 className="text-xl font-semibold">Training administration</h3>
      {isPastor && (
        <>
          <label className="block text-sm font-medium">
            Import a prepared curriculum module (.json)
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(e) => void importFile(e.target.files?.[0])}
              className="mt-2 block max-w-full text-sm"
            />
          </label>
          {course && (
            <details className="rounded-xl bg-purple-50 p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">
                Enrol a worker in {course.title}
              </summary>
              <fieldset disabled={busy} className="mt-3 min-w-0 space-y-3">
                <label className="block text-sm">
                  Existing person
                  <select
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    className={input}
                  >
                    <option value="">
                      Select a person (or an existing staff account below)
                    </option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Existing confirmed account (optional for in-person students)
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className={input}
                  >
                    <option value="">No linked account</option>
                    {staff.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Assessment reviewer
                  <select
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    className={input}
                  >
                    <option value="">Pastoral review only</option>
                    {staff.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Existing Foundation School class (optional)
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className={input}
                  >
                    <option value="">No class link</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={!person && !account}
                  onClick={() =>
                    run(
                      "training_enrol",
                      {
                        p_person: person || null,
                        p_user: account || null,
                        p_name:
                          people.find((p) => p.id === person)?.full_name ??
                          staff.find((s) => s.user_id === account)?.full_name,
                        p_module: course.id,
                        p_reviewer: reviewer || null,
                        p_class: classId || null,
                      },
                      "Enrolment saved.",
                    )
                  }
                  className="min-h-11 rounded-xl bg-purple-900 px-4 text-white disabled:opacity-50"
                >
                  Save enrolment
                </button>
                <label className="block text-sm">
                  Curriculum editor
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className={input}
                  >
                    <option value="">Choose staff account</option>
                    {staff.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[true, false].map((enabled) => (
                    <button
                      key={String(enabled)}
                      disabled={!account}
                      onClick={() =>
                        run(
                          "training_assign_editor",
                          {
                            p_user: account,
                            p_module: course.id,
                            p_enabled: enabled,
                          },
                          "Editor assignment updated.",
                        )
                      }
                      className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-50"
                    >
                      {enabled ? "Assign editor" : "Remove editor"}
                    </button>
                  ))}
                </div>
              </fieldset>
            </details>
          )}
        </>
      )}
      {course &&
        learners
          .filter((l) =>
            enrolments.some(
              (e) =>
                e.learner_id === l.id &&
                e.module_id === course.id &&
                (isPastor || e.reviewer_id === userId),
            ),
          )
          .map((l) => (
            <ReviewCard
              key={`${l.id}-${course.id}`}
              learner={l}
              course={course}
              progress={progress.find(
                (p) =>
                  p.learner_id === l.id &&
                  p.module_id === course.id &&
                  p.revision === course.revision,
              )}
              busy={busy}
              isPastor={isPastor}
              run={run}
            />
          ))}
      <p role="status" className="text-sm leading-6">
        {message}
      </p>
    </section>
  );
}
function ReviewCard({
  learner,
  course,
  progress,
  busy,
  isPastor,
  run,
}: {
  learner: LearnerRow;
  course: TrainingModule;
  progress?: ProgressRow;
  busy: boolean;
  isPastor: boolean;
  run: (
    name: string,
    args: Record<string, unknown>,
    success: string,
  ) => Promise<void>;
}) {
  const [attendance, setAttendance] = useState(
    progress?.attendance_approved ?? false,
  );
  const [practical, setPractical] = useState(
    progress?.practical_approved ?? false,
  );
  const [note, setNote] = useState("");
  const [equivalence, setEquivalence] = useState("");
  const [email, setEmail] = useState("");
  const [register, setRegister] = useState("");
  useEffect(() => {
    if (!learner.person_id) return;
    let active = true;
    void supabase
      .from("foundation_roll")
      .select("class_id,week,present")
      .eq("person_id", learner.person_id)
      .then((r) => {
        if (active)
          setRegister(
            r.error
              ? "Existing school register is unavailable to this account."
              : r.data?.length
                ? `Existing school register: ${r.data.filter((x) => x.present).length} present marks across ${r.data.length} recorded weekly marks. Review the class and any recovery teaching before approval.`
                : "No existing school attendance marks were found.",
          );
      });
    return () => {
      active = false;
    };
  }, [learner.person_id]);
  return (
    <details className="rounded-xl border p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">
        {learner.display_name} ·{" "}
        {progress?.approved_at
          ? "Approved"
          : progress?.quiz_passed
            ? "Awaiting practical review"
            : "Learning in progress"}
      </summary>
      <fieldset disabled={busy} className="mt-4 min-w-0 space-y-4">
        <p className="text-sm leading-6">{register}</p>
        {isPastor && !learner.user_id && (
          <>
            <label className="block text-sm">
              Link an existing confirmed sign-in email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </label>
            <button
              disabled={!email.includes("@")}
              onClick={() =>
                run(
                  "training_link_account",
                  { p_learner: learner.id, p_email: email },
                  "Existing account linked.",
                )
              }
              className="min-h-11 rounded-xl border px-4 disabled:opacity-50"
            >
              Link account
            </button>
          </>
        )}
        <p className="text-sm">
          Lessons read: {progress?.read_lesson_ids.length ?? 0} /{" "}
          {course.lessons.length}. Knowledge check:{" "}
          {progress?.quiz_passed ? "passed" : "not yet passed"}. Attempts:{" "}
          {progress?.quiz_attempts ?? 0}.
        </p>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={attendance}
            onChange={(e) => setAttendance(e.target.checked)}
          />
          Attendance or recovery teaching verified
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={practical}
            onChange={(e) => setPractical(e.target.checked)}
          />
          Practical drill and conduct reviewed
        </label>
        <label className="block text-sm">
          Assessment evidence
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={input}
            rows={3}
            placeholder="Record class attendance, recovery teaching and the practical exercise observed."
          />
        </label>
        <button
          disabled={!progress || note.trim().length < 10}
          onClick={() =>
            run(
              "training_review",
              {
                p_learner: learner.id,
                p_module: course.id,
                p_revision: course.revision,
                p_attendance: attendance,
                p_practical: practical,
                p_note: note,
              },
              "Assessment saved.",
            )
          }
          className="min-h-11 rounded-xl bg-purple-900 px-4 text-white disabled:opacity-50"
        >
          Save assessment
        </button>
        {isPastor && course.id === "foundation" && (
          <>
            <label className="block text-sm">
              Prior-learning equivalence evidence
              <textarea
                value={equivalence}
                onChange={(e) => setEquivalence(e.target.value)}
                className={input}
                rows={3}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[true, false].map((enabled) => (
                <button
                  key={String(enabled)}
                  disabled={enabled && equivalence.trim().length < 20}
                  onClick={() =>
                    run(
                      "training_equivalence",
                      {
                        p_learner: learner.id,
                        p_reason: equivalence,
                        p_enabled: enabled,
                      },
                      "Prior-learning decision saved.",
                    )
                  }
                  className="min-h-11 rounded-xl border px-4 disabled:opacity-50"
                >
                  {enabled
                    ? "Approve equivalent prior learning"
                    : "Revoke equivalence"}
                </button>
              ))}
            </div>
          </>
        )}
      </fieldset>
    </details>
  );
}
