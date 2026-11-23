import type { TrainingModule } from "./types";

export interface ModuleRow {
  id: string;
  revision: number;
  status: TrainingModule["status"];
  content: TrainingModule;
  updated_at: string;
}
export interface LearnerRow {
  id: string;
  user_id: string | null;
  person_id: string | null;
  display_name: string;
  active: boolean;
}
export interface EnrolmentRow {
  learner_id: string;
  module_id: string;
  reviewer_id: string | null;
  foundation_class_id: string | null;
}
export interface ProgressRow {
  learner_id: string;
  module_id: string;
  revision: number;
  read_lesson_ids: string[];
  quiz_passed: boolean;
  quiz_correct: number;
  quiz_total: number;
  quiz_attempts: number;
  attendance_approved: boolean;
  practical_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
}

const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const text = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strings = (v: unknown): boolean =>
  Array.isArray(v) && v.length > 0 && v.every(text);
export function contentProblems(value: unknown): string[] {
  const m = object(value);
  const problems: string[] = [];
  if (!text(m.id) || !/^[a-z][a-z0-9-]{0,59}$/.test(m.id))
    problems.push("A valid module ID is required.");
  if (!text(m.title) || !text(m.summary))
    problems.push("Add the title and summary.");
  const lessons = array(m.lessons).map(object);
  if (!lessons.length) problems.push("Add at least one lesson.");
  if (
    new Set(lessons.map((l) => l.id)).size !== lessons.length ||
    lessons.some((l) => !text(l.id))
  )
    problems.push("Lesson IDs must be unique and nonempty.");
  for (const lesson of lessons) {
    if (
      !text(lesson.title) ||
      !text(lesson.objective) ||
      !text(lesson.reflection) ||
      !strings(lesson.paragraphs)
    )
      problems.push(
        "Every lesson needs a title, objective, teaching and reflection.",
      );
    if (
      lesson.sourceNote !== undefined &&
      typeof lesson.sourceNote !== "string"
    )
      problems.push("Source notes must be text.");
    if (
      !array(lesson.scripture).length ||
      array(lesson.scripture)
        .map(object)
        .some((s) => s.version !== "KJV" || !text(s.reference) || !text(s.text))
    )
      problems.push("Every lesson needs referenced KJV Scripture.");
  }
  const role = object(m.role);
  const checklist = object(m.checklist);
  const testimony = object(m.testimony);
  if (
    !strings(role.duties) ||
    !strings(role.boundaries) ||
    !text(role.reportsTo)
  )
    problems.push("Complete role duties, boundaries and reporting line.");
  if (!strings(m.standards)) problems.push("Add service standards.");
  if (
    array(m.scripts).length < 5 ||
    array(m.scripts)
      .map(object)
      .some((s) => !text(s.situation) || !text(s.words))
  )
    problems.push("Add at least five complete scripts.");
  if (
    !array(m.drills).length ||
    array(m.drills)
      .map(object)
      .some((d) => !text(d.situation) || !text(d.wrong) || !text(d.right))
  )
    problems.push("Add a complete wrong/right practice drill.");
  if (!strings(checklist.before) || !strings(checklist.after))
    problems.push("Add both service checklists.");
  const questions = array(m.quiz).map(object);
  if (
    questions.length !== 3 ||
    new Set(questions.map((q) => q.id)).size !== 3 ||
    questions.some(
      (q) =>
        !text(q.id) ||
        !text(q.question) ||
        !strings(q.options) ||
        array(q.options).length < 2 ||
        !Number.isInteger(q.correctIndex) ||
        Number(q.correctIndex) < 0 ||
        Number(q.correctIndex) >= array(q.options).length ||
        !text(q.explanation),
    )
  )
    problems.push(
      "Add three complete questions with valid answer keys and explanations.",
    );
  if (
    !text(testimony.text) ||
    !["approved", "placeholder"].includes(String(testimony.kind))
  )
    problems.push("Add an approved testimony or clearly marked placeholder.");
  return [...new Set(problems)];
}
export function hydrateModule(row: ModuleRow): TrainingModule {
  return {
    ...row.content,
    id: row.id,
    revision: row.revision,
    status: row.status,
  };
}
