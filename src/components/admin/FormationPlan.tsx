const stages = [
  {
    title: "Foundation School",
    study: "Salvation, Scripture, prayer, Christian character and life in the local assembly.",
    practice: "Shadow an experienced worker and discuss what you learned.",
    review: "Teacher reviews participation, understanding and the supervised assignment.",
  },
  {
    title: "Discipleship",
    study: "Spiritual disciplines, relationships, evangelism and helping another believer grow.",
    practice: "Join a mentor in an agreed follow-up and prepare a short Scripture reflection.",
    review: "Mentor discusses consistency, care for others and the next service opportunity.",
  },
  {
    title: "Ministers in training",
    study: "Bible interpretation, doctrine, teaching, ethics and teamwork.",
    practice: "Prepare and deliver teaching with a supervisor present, then receive feedback.",
    review: "Pastoral reviewer considers teaching, character and observed service.",
  },
  {
    title: "Deacons and deaconesses preparation",
    study: "Servant leadership, practical care, stewardship and conflict resolution.",
    practice: "Coordinate a supervised care or departmental assignment over time.",
    review: "Pastoral reviewer considers reliability, discretion and judgement for an appointment.",
  },
  {
    title: "Shepherds and pastoral formation",
    study: "Doctrine, preaching, pastoral care, mentoring and ministry oversight.",
    practice: "Teach and mentor under pastoral supervision with regular review.",
    review: "Pastoral leadership discerns calling and readiness for responsibility.",
  },
];

export default function FormationPlan() {
  return (
    <details className="mb-8 rounded-2xl border border-purple-200 bg-white p-6">
      <summary className="cursor-pointer text-xl font-semibold text-purple-950">
        Ministry formation · pastoral planning draft
      </summary>
      <p className="mt-4 max-w-3xl text-slate-600">
        Review these proposed stages before enrolling a cohort. Each learner needs
        a mentor, a supervised place to serve and a review conversation. Pastoral
        leadership approves appointments after considering each person’s calling.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        The deacon and pastoral pathways can develop separately. Course completion
        is one part of pastoral discernment.
      </p>
      <div className="mt-6 divide-y divide-purple-100">
        {stages.map((stage) => (
          <section key={stage.title} className="py-5">
            <h3 className="text-lg font-semibold text-purple-950">{stage.title}</h3>
            <dl className="mt-3 grid gap-4 md:grid-cols-3">
              {[
                ["Study", stage.study],
                ["Supervised service", stage.practice],
                ["Review", stage.review],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium text-slate-900">{label}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </details>
  );
}
