import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file) {
  const output = ts.transpileModule(
    readFileSync(
      new URL("../src/lib/training/" + file, import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports = {};
  runInNewContext(output, { exports, require });
  return exports;
}
const { trainingCompletion, gradeTrainingQuiz } = load("types.ts");
const { contentProblems } = load("content.ts");
const { trainingOfflineHtml } = load("offline.ts");
const course = {
  id: "example",
  revision: 1,
  status: "published",
  title: "Example <script>unsafe()</script>",
  summary: "Example",
  lessons: [
    {
      id: "l1",
      title: "Lesson",
      objective: "Learn",
      paragraphs: ["<img src=x onerror=alert(1)>"],
      scripture: [
        {
          reference: "Example 1:1",
          version: "KJV",
          text: "A fictional test placeholder, not a quotation.",
        },
      ],
      reflection: "Reflect",
    },
  ],
  role: { duties: ["Serve"], boundaries: ["Ask"], reportsTo: "Leader" },
  standards: ["Prepare"],
  scripts: Array.from({ length: 5 }, (_, i) => ({
    situation: "Situation " + i,
    words: "Words",
  })),
  drills: [{ situation: "Example", wrong: "Wrong", right: "Right" }],
  checklist: { before: ["Prepare"], after: ["Review"] },
  quiz: Array.from({ length: 3 }, (_, i) => ({
    id: "q" + i,
    question: "Question",
    options: ["One", "Two"],
    correctIndex: 1,
    explanation: "Explanation",
  })),
  testimony: { kind: "placeholder", text: "Placeholder" },
};
assert.equal(contentProblems(course).length, 0);
for (const malformed of [
  null,
  {},
  { title: 42 },
  { ...course, lessons: [null] },
  { ...course, role: { duties: "not an array" } },
  { ...course, quiz: [null] },
  { ...course, standards: [42] },
  { ...course, testimony: { kind: "invented", text: "x" } },
])
  assert.ok(contentProblems(malformed).length > 0);
assert.ok(
  contentProblems({
    ...course,
    lessons: [course.lessons[0], course.lessons[0]],
  }).length > 0,
);
assert.ok(
  contentProblems({
    ...course,
    quiz: course.quiz.map((q) => ({ ...q, correctIndex: 9 })),
  }).length > 0,
);
assert.equal(gradeTrainingQuiz(course, { q0: 1, q1: 1, q2: 1 }).passed, true);
assert.equal(gradeTrainingQuiz(course, { q0: 1, q1: 1, q2: 0 }).passed, false);
assert.equal(gradeTrainingQuiz(course, {}).passed, false);
const progress = {
  profileId: "learner",
  moduleId: "example",
  revision: 1,
  readLessonIds: ["l1"],
  quizPassed: true,
  attendanceApproved: true,
  practicalApproved: true,
  approvedBy: "reviewer",
  approvedAt: "2026-11-23",
};
assert.equal(trainingCompletion(course, null), "not_started");
assert.equal(
  trainingCompletion(course, { ...progress, revision: 2 }),
  "not_started",
);
assert.equal(
  trainingCompletion(course, { ...progress, approvedBy: null }),
  "awaiting_review",
);
assert.equal(
  trainingCompletion(course, { ...progress, practicalApproved: false }),
  "awaiting_review",
);
assert.equal(trainingCompletion(course, progress), "approved");
const html = trainingOfflineHtml(course);
assert.ok(!html.includes("<script>"));
assert.ok(!html.includes("<img"));
assert.ok(html.includes("&lt;script&gt;"));
assert.ok(html.includes("default-src 'none'"));
assert.ok(!html.includes("correctIndex"));
assert.ok(html.includes("Offline reading does not save progress"));
console.log(
  "Training domain, malformed content and offline export checks passed.",
);
if (process.argv[2]) {
  const { readdirSync } = await import("node:fs");
  const { resolve, join } = await import("node:path");
  const directory = resolve(process.argv[2]);
  const files = readdirSync(directory).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 13, "All 13 curriculum tracks must be present");
  for (const file of files) {
    const value = JSON.parse(readFileSync(join(directory, file), "utf8"));
    assert.equal(
      contentProblems(value).length,
      0,
      `${file}: ${contentProblems(value).join(" ")}`,
    );
  }
  console.log(
    "All 13 private curriculum modules satisfy the shared content contract.",
  );
}
