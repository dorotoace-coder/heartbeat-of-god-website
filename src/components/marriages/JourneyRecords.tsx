"use client";
import { useEffect, useState, type FormEvent } from "react";
import { marriageRpc, type CaseSummary } from "@/lib/marriages/repository";
import {
  journeyLabels,
  journeyFields,
  journeyStatuses,
  releaseAllowed,
  type JourneyKind,
  type JourneyEntry,
  type JourneyField,
} from "@/lib/marriages/journey";
import type { CarePerson } from "./PeopleRecords";
import s from "./marriages.module.css";
const common: JourneyField[] = [
  { key: "title", label: "Entry title", required: true },
  { key: "person_reference", label: "Person name or reviewed reference" },
  { key: "status", label: "Status", options: journeyStatuses },
  { key: "date", label: "Event / reported start date", type: "date" },
  { key: "time", label: "Local time (if needed)", type: "time" },
  { key: "timezone", label: "Timezone (for appointments)" },
  { key: "next_action", label: "Next action and responsible person" },
  { key: "next_date", label: "Follow-up date", type: "date" },
  { key: "private_note", label: "Private note — assigned counsellor only" },
];
export function JourneyRecords({
  caseId,
  counsellor,
  participant = false,
}: {
  caseId: string;
  counsellor: boolean;
  participant?: boolean;
}) {
  const choices = (Object.keys(journeyLabels) as JourneyKind[]).filter(
    (k) =>
      counsellor ||
      (participant ? releaseAllowed(k) : ["session", "aftercare"].includes(k)),
  );
  const [people, setPeople] = useState<CarePerson[]>([]);
  useEffect(() => {
    let active = true;
    if (counsellor)
      void marriageRpc<CarePerson[]>("hm_people_list", { target: caseId })
        .then((p) => {
          if (active) setPeople(p);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [caseId, counsellor]);
  const [requestKey, setRequestKey] = useState("");
  const [kind, setKind] = useState<JourneyKind>(
      counsellor ? "intake" : "session",
    ),
    [rows, setRows] = useState<JourneyEntry[]>([]),
    [editing, setEditing] = useState<JourneyEntry | null>(null),
    [formOpen, setFormOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [history, setHistory] = useState<
      { version: number; body: Record<string, unknown>; recorded_at: string }[]
    >([]);
  useEffect(() => {
    let current = true;
    marriageRpc<JourneyEntry[]>("hm_journey_list", {
      target: caseId,
      event_kind: kind,
    })
      .then((r) => {
        if (current) setRows(r);
      })
      .catch(() => {
        if (current) setError("These entries could not be opened.");
      });
    return () => {
      current = false;
    };
  }, [caseId, kind]);
  const fields = [
    ...common,
    ...journeyFields[kind],
    ...(releaseAllowed(kind)
      ? [
          {
            key: "public_summary",
            label: "Reviewed summary to share with participants",
          },
          {
            key: "released",
            label: "Release only the reviewed summary to linked participants",
            type: "check" as const,
          },
        ]
      : []),
  ];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const d = new FormData(e.currentTarget),
      body: Record<string, string | boolean> = {};
    for (const f of fields)
      body[f.key] =
        f.type === "check" ? d.has(f.key) : String(d.get(f.key) ?? "").trim();
    body.person_id = String(d.get("person_id") ?? "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await marriageRpc("hm_journey_save", {
        target: caseId,
        entry_id: editing?.id ?? null,
        event_kind: kind,
        expected_version: editing?.version ?? null,
        body,
        request_key: editing ? null : requestKey,
      });
      setRows(
        await marriageRpc<JourneyEntry[]>("hm_journey_list", {
          target: caseId,
          event_kind: kind,
        }),
      );
      setFormOpen(false);
      setEditing(null);
      setHistory([]);
      setMessage(
        "Entry saved. Previous versions remain in the amendment history.",
      );
    } catch {
      setError(
        "Entry could not be saved. Check required fields, permission, dates and any concurrent edit. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.panel}>
      <div className={s.toolbar}>
        <h2>{participant ? "Shared care updates" : "Journey records"}</h2>
        {counsellor && (
          <button
            className={s.primary}
            disabled={busy}
            onClick={() => {
              setRequestKey(crypto.randomUUID());
              setEditing(null);
              setFormOpen(true);
              setMessage("");
              setError("");
              setHistory([]);
            }}
          >
            Add entry
          </button>
        )}
      </div>
      <label className={s.field}>
        Record type
        <select
          value={kind}
          disabled={busy}
          onChange={(e) => {
            setKind(e.target.value as JourneyKind);
            setRows([]);
            setEditing(null);
            setFormOpen(false);
            setHistory([]);
            setError("");
            setMessage("");
          }}
        >
          {choices.map((k) => (
            <option value={k} key={k}>
              {journeyLabels[k]}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className={s.alert}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={s.notice}>
          {message}
        </p>
      )}
      {kind === "prior_union" && (
        <p className={s.notice}>
          Reported history and reviewed evidence are separate. Separation or
          pastoral guidance does not establish freedom to remarry.
        </p>
      )}
      {rows.length === 0 && !formOpen && (
        <p className={s.empty}>
          No {participant ? "released " : ""}entries in this category.
        </p>
      )}
      {rows.map((r) => (
        <article className={s.activity} key={r.id}>
          <h3>{String(r.body.title ?? journeyLabels[r.kind])}</h3>
          <p className={s.muted}>
            {String(r.body.status ?? "")} · {String(r.body.date ?? "")}{" "}
            {String(r.body.time ?? "")} {String(r.body.timezone ?? "")}
          </p>
          {r.body.public_summary && <p>{String(r.body.public_summary)}</p>}
          {counsellor && (
            <div className={s.controls}>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                  setHistory([]);
                  setError("");
                  setMessage("");
                }}
              >
                Review / amend
              </button>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={async () => {
                  setError("");
                  try {
                    setHistory(
                      await marriageRpc("hm_journey_history", {
                        target: caseId,
                        entry_id: r.id,
                      }),
                    );
                  } catch {
                    setError("Amendment history unavailable.");
                  }
                }}
              >
                Amendment history
              </button>
            </div>
          )}
        </article>
      ))}
      {history.length > 0 && (
        <details open>
          <summary>Amendment history</summary>
          {history.map((h) => (
            <div key={h.version} className={s.activity}>
              <p>
                Version {h.version} · {h.recorded_at}
              </p>
              {Object.entries(h.body)
                .filter(([, v]) => v !== "" && v !== false && v !== null)
                .map(([k, v]) => (
                  <p key={k} className={s.muted}>
                    {fields.find((f) => f.key === k)?.label ?? k}: {String(v)}
                  </p>
                ))}
            </div>
          ))}
        </details>
      )}
      {formOpen && counsellor && (
        <form key={`${editing?.id ?? "new"}-${kind}`} onSubmit={submit}>
          <h3 style={{ marginTop: 28 }}>
            {editing ? "Amend" : "Add"} {journeyLabels[kind].toLowerCase()}
          </h3>
          <fieldset disabled={busy}>
            <label className={s.field}>
              Linked person (optional)
              <select
                name="person_id"
                defaultValue={String(editing?.body.person_id ?? "")}
              >
                <option value="">No person link</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.body.preferred_name || "Person record"}
                  </option>
                ))}
              </select>
            </label>
            <div className={s.grid}>
              {fields.map((f) =>
                f.type === "check" ? (
                  <label key={f.key} className={s.check}>
                    <input
                      type="checkbox"
                      name={f.key}
                      defaultChecked={editing?.body[f.key] === true}
                    />
                    {f.label}
                  </label>
                ) : (
                  <label key={f.key} className={s.field}>
                    {f.label}
                    {f.options ? (
                      <select
                        name={f.key}
                        defaultValue={String(
                          editing?.body[f.key] ?? f.options[0],
                        )}
                      >
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === "date" || f.type === "time" ? (
                      <input
                        name={f.key}
                        type={f.type}
                        defaultValue={String(editing?.body[f.key] ?? "")}
                      />
                    ) : (
                      <textarea
                        name={f.key}
                        required={f.required}
                        maxLength={6000}
                        defaultValue={String(
                          editing?.body[f.key] ??
                            (f.key === "timezone" ? "Africa/Lagos" : ""),
                        )}
                      />
                    )}
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <div className={s.controls}>
            <button className={s.primary} disabled={busy}>
              {busy ? "Saving…" : "Save entry"}
            </button>
            <button
              type="button"
              className={s.secondary}
              disabled={busy}
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
export function CaseProgress({
  record,
  onSaved,
}: {
  record: CaseSummary;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section className={s.panel}>
      <h2>Case progress</h2>
      <form
        key={record.version}
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          setMessage("");
          try {
            await marriageRpc("hm_case_progress", {
              target: record.id,
              expected_version: record.version,
              new_status: String(d.get("status")),
              new_track: String(d.get("track")),
              action: String(d.get("action")),
              due: String(d.get("due")) || null,
              no_action_reason: String(d.get("reason")),
            });
            await onSaved();
            setMessage("Case progress saved.");
          } catch {
            setError(
              "Case changed or progress could not be saved. Refresh before retrying.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className={s.grid}>
            <label className={s.field}>
              Case status
              <select name="status" defaultValue={record.status}>
                {["received", "triaged", "active", "waiting", "closed"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>
            </label>
            {record.lane === "premarital" ? (
              <label className={s.field}>
                RTT track
                <select name="track" defaultValue={record.track}>
                  <option value="discernment">Discernment — Should we?</option>
                  <option value="preparation">Preparation</option>
                </select>
              </label>
            ) : (
              <input type="hidden" name="track" value={record.track} />
            )}
            <label className={s.field}>
              Next action and responsible person
              <textarea
                name="action"
                maxLength={500}
                defaultValue={record.next_action}
              />
            </label>
            <label className={s.field}>
              Due date
              <input
                name="due"
                type="date"
                defaultValue={record.next_due ?? ""}
              />
            </label>
            <label className={s.field}>
              If no next action, explain why
              <textarea
                name="reason"
                maxLength={500}
                defaultValue={record.none_reason}
              />
            </label>
          </div>
        </fieldset>
        <button className={s.primary} disabled={busy}>
          {busy ? "Saving…" : "Save progress"}
        </button>
      </form>
      {error && (
        <p role="alert" className={s.alert}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={s.notice}>
          {message}
        </p>
      )}
    </section>
  );
}
