/** Shared contract for protected training content. No member data belongs in source files. */
export type TrainingStatus = "draft" | "in_review" | "published" | "archived";
export interface TrainingLesson {
  id: string;
  title: string;
  objective: string;
  paragraphs: string[];
  scripture: { reference: string; version: "KJV"; text: string }[];
  reflection: string;
  sourceNote?: string;
}
export interface TrainingModule {
  id: string;
  title: string;
  departmentId: string | null;
  revision: number;
  status: TrainingStatus;
  summary: string;
  lessons: TrainingLesson[];
  role: { duties: string[]; boundaries: string[]; reportsTo: string };
  standards: string[];
  scripts: { situation: string; words: string }[];
  drills: { situation: string; wrong: string; right: string }[];
  checklist: { before: string[]; after: string[] };
  quiz: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  testimony: { kind: "placeholder" | "approved"; text: string };
}
export interface TrainingProgress {
  profileId: string;
  moduleId: string;
  revision: number;
  readLessonIds: string[];
  quizPassed: boolean;
  attendanceApproved: boolean;
  practicalApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
}
/** Reading remains open; placement eligibility is granted by an authorised reviewer. */
export function trainingCompletion(
  module: TrainingModule,
  progress: TrainingProgress | null,
) {
  if (
    !progress ||
    progress.moduleId !== module.id ||
    progress.revision !== module.revision
  )
    return "not_started";
  const read =
    module.lessons.length > 0 &&
    module.lessons.every((l) => progress.readLessonIds.includes(l.id));
  if (
    read &&
    progress.quizPassed &&
    progress.attendanceApproved &&
    progress.practicalApproved &&
    progress.approvedBy &&
    progress.approvedAt
  )
    return "approved";
  if (read && progress.quizPassed) return "awaiting_review";
  return "in_progress";
}
/** Three questions require all three correct; attempts can be repeated after review. */
export function gradeTrainingQuiz(
  module: TrainingModule,
  answers: Record<string, number>,
) {
  const total = module.quiz.length;
  const correct = module.quiz.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;
  return { correct, total, passed: total >= 3 && correct === total };
}
