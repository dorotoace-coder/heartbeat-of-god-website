import Link from "next/link";

const rehearsal = [
  "Name the service coordinator and backup. Confirm who leads each segment and who can approve changes.",
  "Confirm arrival times, dress guidance, microphones, slides and the cue for time remaining.",
  "Rehearse the transitions into the message and closing. Practise one response to an absent speaker or failed microphone.",
  "After service, agree one improvement, an owner and a review date.",
];

export default function PastoratePilot() {
  return (
    <section aria-labelledby="pastorate-title" className="mx-auto max-w-3xl space-y-6 text-slate-950">
      <header className="rounded-2xl bg-purple-950 p-6 text-white">
        <h1 id="pastorate-title" className="text-3xl font-semibold">Pastorate</h1>
        <p className="mt-2 text-purple-100">Plan and review one Sunday service with the assigned team.</p>
      </header>
      <div className="rounded-2xl border border-purple-100 bg-white p-6">
        <h2 className="text-xl font-semibold">Sunday rehearsal</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">{rehearsal.map(step => <li key={step}>{step}</li>)}</ol>
      </div>
      <div className="rounded-2xl border border-purple-100 bg-white p-6">
        <h2 className="text-xl font-semibold">Supervised training</h2>
        <p className="my-3">Use Mentoring and supervised service to record a trainee’s assignment, supervisor, observations and next review date.</p>
        <Link className="inline-flex min-h-11 items-center text-purple-900 underline" href="/admin?view=training">Open training and placements</Link>
      </div>
    </section>
  );
}
