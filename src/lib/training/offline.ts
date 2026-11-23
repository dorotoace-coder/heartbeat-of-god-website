import type { TrainingModule } from "./types";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const para = (s: string) => `<p>${escape(s)}</p>`;
const list = (items: string[]) =>
  `<ul>${items.map((s) => `<li>${escape(s)}</li>`).join("")}</ul>`;
/** Self-contained reading only: no scripts, remote assets, identity or progress. */
export function trainingOfflineHtml(course: TrainingModule) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'"><title>${escape(course.title)} — HBG</title><style>body{font:18px/1.8 system-ui,sans-serif;color:#241832;background:#fff;max-width:780px;margin:auto;padding:32px}h1,h2,h3{line-height:1.25;color:#2e1252}section{margin:40px 0}blockquote{border-left:4px solid #7b2ff7;margin:24px 0;padding-left:20px}small{color:#65576f}@media print{body{font-size:10.5pt;line-height:1.45;padding:0}section{margin:20px 0;break-inside:auto}h2,h3{break-after:avoid}p,li{orphans:3;widows:3}section:last-child{break-inside:avoid}}</style><body><small>Heartbeat of God · Private reading copy · Revision ${course.revision} · ${course.status === "published" ? "Published teaching" : "DRAFT — For pastoral review"}</small><h1>${escape(course.title)}</h1>${para(course.summary)}<aside>${para("Keep this file private on shared devices. Offline reading does not save progress. Return to Pulse OS to record learning and assessments.")}</aside>${course.lessons.map((l) => `<section><h2>${escape(l.title)}</h2><strong>${escape(l.objective)}</strong>${l.paragraphs.map(para).join("")}${l.scripture.map((s) => `<blockquote>${para(s.text)}<cite>${escape(s.reference)} · ${escape(s.version)}</cite></blockquote>`).join("")}${para("Reflect and practise: " + l.reflection)}${course.status !== "published" && l.sourceNote ? para("Leader’s review note: " + l.sourceNote) : ""}</section>`).join("")}<section><h2>Your role</h2>${list(course.role.duties)}<h3>Boundaries</h3>${list(course.role.boundaries)}${para("Reporting line: " + course.role.reportsTo)}<h2>Standards</h2>${list(course.standards)}</section><section><h2>Words for real situations</h2>${course.scripts.map((s) => `<h3>${escape(s.situation)}</h3>${para(s.words)}`).join("")}</section><section><h2>Practise together</h2>${course.drills.map((d) => `<h3>${escape(d.situation)}</h3>${para("Wrong response: " + d.wrong)}${para("Better response: " + d.right)}`).join("")}</section><section><h2>Service checklist</h2><h3>Before service</h3>${list(course.checklist.before)}<h3>After service</h3>${list(course.checklist.after)}</section><section><h2>Knowledge check</h2>${course.quiz.map((q) => `<h3>${escape(q.question)}</h3>${list(q.options)}`).join("")}</section><section><h2>Worker testimony</h2>${para((course.testimony.kind === "placeholder" ? "Placeholder — " : "") + course.testimony.text)}</section></body></html>`;
}
