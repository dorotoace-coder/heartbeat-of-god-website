"use client";
import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TrainingModule } from "@/lib/training/types";
import { contentProblems, type ModuleRow } from "@/lib/training/content";

const field =
  "mt-1 min-h-11 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-purple-500";
export default function TrainingEditor({
  row,
  isPastor,
  onSaved,
}: {
  row: ModuleRow;
  isPastor: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<TrainingModule>(
    structuredClone(row.content),
  );
  const [message, setMessage] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    void supabase
      .from("departments")
      .select("id,name")
      .order("name")
      .then((r) => {
        if (active) setDepartments(r.data ?? []);
      });
    return () => {
      active = false;
    };
  }, []);
  const [busy, setBusy] = useState(false);
  const problems = contentProblems(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row.content);
  function patch<K extends keyof TrainingModule>(
    key: K,
    value: TrainingModule[K],
  ) {
    setDraft((p) => ({ ...p, [key]: value }));
  }
  async function act(action: "save" | "submit" | "publish") {
    setBusy(true);
    setMessage("");
    try {
      if (problems.length) throw new Error(problems.join(" "));
      const result =
        action === "save"
          ? await supabase.rpc("training_save_module", {
              p_id: row.id,
              p_revision: row.revision,
              p_content: draft,
              p_expected_at: row.updated_at,
            })
          : await supabase.rpc("training_publish", {
              p_id: row.id,
              p_revision: row.revision,
              p_action: action,
            });
      if (result.error) throw new Error(result.error.message);
      setMessage(
        action === "save"
          ? "Draft saved. Published teaching stays unchanged until approval."
          : action === "submit"
            ? "Submitted for pastoral review."
            : "Published. This revision is now available to learners.",
      );
      onSaved();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "The change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5 rounded-2xl border border-purple-200 bg-purple-50/40 p-5">
      <h3 className="text-xl font-semibold">
        Edit curriculum · revision {row.revision}
      </h3>
      <p className="text-sm leading-6 text-slate-600">
        Save changes as a draft, then submit for pastoral approval. Editing
        published teaching creates a new revision. Save before submitting.
      </p>
      <fieldset disabled={busy} className="space-y-5">
        <label className="block text-sm font-medium">
          Existing Pulse OS department
          <select
            className={field}
            value={draft.departmentId ?? ""}
            onChange={(e) => patch("departmentId", e.target.value || null)}
          >
            <option value="">Foundation / mapping pending</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <Text
          label="Module title"
          value={draft.title}
          onChange={(v) => patch("title", v)}
        />
        <Text
          label="Summary"
          value={draft.summary}
          onChange={(v) => patch("summary", v)}
          multiline
        />
        {draft.lessons.map((lesson, i) => (
          <details key={lesson.id} className="rounded-xl border bg-white p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Lesson {i + 1}: {lesson.title}
            </summary>
            <div className="mt-4 space-y-4">
              <Text
                label="Lesson title"
                value={lesson.title}
                onChange={(v) =>
                  patch(
                    "lessons",
                    draft.lessons.map((l, n) =>
                      n === i ? { ...l, title: v } : l,
                    ),
                  )
                }
              />
              <Text
                label="Learning objective"
                value={lesson.objective}
                onChange={(v) =>
                  patch(
                    "lessons",
                    draft.lessons.map((l, n) =>
                      n === i ? { ...l, objective: v } : l,
                    ),
                  )
                }
                multiline
              />
              <Text
                label="Teaching — separate paragraphs with a blank line"
                value={lesson.paragraphs.join("\n\n")}
                onChange={(v) =>
                  patch(
                    "lessons",
                    draft.lessons.map((l, n) =>
                      n === i ? { ...l, paragraphs: v.split(/\n\s*\n/) } : l,
                    ),
                  )
                }
                multiline
              />
              {lesson.scripture.map((scripture, j) => (
                <div key={j} className="space-y-3 rounded-xl bg-purple-50 p-3">
                  <Text
                    label="Scripture reference (KJV)"
                    value={scripture.reference}
                    onChange={(v) =>
                      patch(
                        "lessons",
                        draft.lessons.map((l, n) =>
                          n === i
                            ? {
                                ...l,
                                scripture: l.scripture.map((s, k) =>
                                  k === j ? { ...s, reference: v } : s,
                                ),
                              }
                            : l,
                        ),
                      )
                    }
                  />
                  <Text
                    label="Exact KJV quotation"
                    value={scripture.text}
                    onChange={(v) =>
                      patch(
                        "lessons",
                        draft.lessons.map((l, n) =>
                          n === i
                            ? {
                                ...l,
                                scripture: l.scripture.map((s, k) =>
                                  k === j ? { ...s, text: v } : s,
                                ),
                              }
                            : l,
                        ),
                      )
                    }
                    multiline
                  />
                </div>
              ))}
              <Text
                label="Reflection and practice"
                value={lesson.reflection}
                onChange={(v) =>
                  patch(
                    "lessons",
                    draft.lessons.map((l, n) =>
                      n === i ? { ...l, reflection: v } : l,
                    ),
                  )
                }
                multiline
              />
              <Text
                label="Source or material still required"
                value={lesson.sourceNote ?? ""}
                onChange={(v) =>
                  patch(
                    "lessons",
                    draft.lessons.map((l, n) =>
                      n === i ? { ...l, sourceNote: v } : l,
                    ),
                  )
                }
                multiline
              />
            </div>
          </details>
        ))}
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          onClick={() =>
            patch("lessons", [
              ...draft.lessons,
              {
                id: `lesson-${crypto.randomUUID()}`,
                title: "New lesson",
                objective: "",
                paragraphs: [""],
                scripture: [{ reference: "", version: "KJV", text: "" }],
                reflection: "",
              },
            ])
          }
        >
          Add lesson
        </button>
        <Lines
          label="Role duties — one per line"
          values={draft.role.duties}
          onChange={(v) => patch("role", { ...draft.role, duties: v })}
        />
        <Lines
          label="Role boundaries — one per line"
          values={draft.role.boundaries}
          onChange={(v) => patch("role", { ...draft.role, boundaries: v })}
        />
        <Text
          label="Reports to"
          value={draft.role.reportsTo}
          onChange={(v) => patch("role", { ...draft.role, reportsTo: v })}
        />
        <Lines
          label="Service standards — one per line"
          values={draft.standards}
          onChange={(v) => patch("standards", v)}
        />
        {draft.scripts.map((script, i) => (
          <details key={i} className="rounded-xl border bg-white p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Script {i + 1}
            </summary>
            <Text
              label="Situation"
              value={script.situation}
              onChange={(v) =>
                patch(
                  "scripts",
                  draft.scripts.map((s, n) =>
                    n === i ? { ...s, situation: v } : s,
                  ),
                )
              }
            />
            <Text
              label="Exact words"
              value={script.words}
              onChange={(v) =>
                patch(
                  "scripts",
                  draft.scripts.map((s, n) =>
                    n === i ? { ...s, words: v } : s,
                  ),
                )
              }
              multiline
            />
          </details>
        ))}
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4"
          onClick={() =>
            patch("scripts", [...draft.scripts, { situation: "", words: "" }])
          }
        >
          Add script
        </button>
        {draft.drills.map((drill, i) => (
          <details key={i} className="rounded-xl border bg-white p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Practice scenario {i + 1}
            </summary>
            {(["situation", "wrong", "right"] as const).map((key) => (
              <Text
                key={key}
                label={
                  key === "wrong"
                    ? "Wrong response"
                    : key === "right"
                      ? "Better response"
                      : "Situation"
                }
                value={drill[key]}
                onChange={(v) =>
                  patch(
                    "drills",
                    draft.drills.map((d, n) =>
                      n === i ? { ...d, [key]: v } : d,
                    ),
                  )
                }
                multiline
              />
            ))}
          </details>
        ))}
        <Lines
          label="Before-service checklist"
          values={draft.checklist.before}
          onChange={(v) =>
            patch("checklist", { ...draft.checklist, before: v })
          }
        />
        <Lines
          label="After-service checklist"
          values={draft.checklist.after}
          onChange={(v) => patch("checklist", { ...draft.checklist, after: v })}
        />
        {draft.quiz.map((q, i) => (
          <details key={q.id} className="rounded-xl border bg-white p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Knowledge check {i + 1}
            </summary>
            <Text
              label="Question"
              value={q.question}
              onChange={(v) =>
                patch(
                  "quiz",
                  draft.quiz.map((x, n) =>
                    n === i ? { ...x, question: v } : x,
                  ),
                )
              }
              multiline
            />
            {q.options.map((option, j) => (
              <Text
                key={j}
                label={`Option ${j + 1}`}
                value={option}
                onChange={(v) =>
                  patch(
                    "quiz",
                    draft.quiz.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            options: x.options.map((o, k) => (k === j ? v : o)),
                          }
                        : x,
                    ),
                  )
                }
              />
            ))}
            <label className="block">
              Correct answer
              <select
                className={field}
                value={q.correctIndex}
                onChange={(e) =>
                  patch(
                    "quiz",
                    draft.quiz.map((x, n) =>
                      n === i
                        ? { ...x, correctIndex: Number(e.target.value) }
                        : x,
                    ),
                  )
                }
              >
                {q.options.map((_, j) => (
                  <option key={j} value={j}>
                    Option {j + 1}
                  </option>
                ))}
              </select>
            </label>
            <Text
              label="Explanation"
              value={q.explanation}
              onChange={(v) =>
                patch(
                  "quiz",
                  draft.quiz.map((x, n) =>
                    n === i ? { ...x, explanation: v } : x,
                  ),
                )
              }
              multiline
            />
          </details>
        ))}
        <Text
          label="Worker testimony"
          value={draft.testimony.text}
          onChange={(v) => patch("testimony", { ...draft.testimony, text: v })}
          multiline
        />
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={draft.testimony.kind === "approved"}
            onChange={(e) =>
              patch("testimony", {
                ...draft.testimony,
                kind: e.target.checked ? "approved" : "placeholder",
              })
            }
          />
          A real testimony, approved for this audience
        </label>
        {problems.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-amber-900">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => act("save")}
            className="min-h-12 rounded-xl bg-purple-900 px-5 text-white"
          >
            Save draft
          </button>
          {row.status === "draft" && (
            <button
              disabled={dirty}
              onClick={() => act("submit")}
              className="min-h-12 rounded-xl border px-5"
            >
              Submit saved draft
            </button>
          )}
          {isPastor && row.status === "in_review" && (
            <button
              disabled={dirty}
              onClick={() => act("publish")}
              className="min-h-12 rounded-xl bg-emerald-900 px-5 text-white"
            >
              Approve and publish
            </button>
          )}
        </div>
      </fieldset>
      <p role="status" className="text-sm leading-6">
        {message}
      </p>
    </section>
  );
}
function Text({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={field}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
function Lines({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Text
      label={label}
      value={values.join("\n")}
      onChange={(v) => onChange(v.split("\n"))}
      multiline
    />
  );
}
