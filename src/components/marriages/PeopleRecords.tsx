"use client";
import { useEffect, useState, type FormEvent } from "react";
import { marriageRpc, type CaseSummary } from "@/lib/marriages/repository";
import s from "./marriages.module.css";
export type CarePerson = {
  id: string;
  version: number;
  auth_linked: boolean;
  member_linked: boolean;
  role: string;
  body: Record<string, string | null>;
};
const fields = [
  ["preferred_name", "Preferred name"],
  ["legal_name", "Legal name (when needed)"],
  ["date_of_birth", "Date of birth (optional)"],
  ["phone", "Phone / preferred contact (optional)"],
  ["address", "Address (optional)"],
  ["nationality", "Nationality (when relevant)"],
  ["residence_country", "Country of residence"],
  ["language", "Preferred language / interpreter"],
  ["accessibility", "Agreed accessibility needs"],
  ["occupation", "Occupation (optional)"],
  ["dependants_summary", "Relevant family responsibilities (optional)"],
] as const;
const legalKeys = [
  "preferred_name",
  "legal_name",
  "date_of_birth",
  "nationality",
  "address",
  "residence_country",
];
export default function PeopleRecords({
  caseId,
  counsellor,
  participant,
  sourceCases = [],
}: {
  caseId: string;
  counsellor: boolean;
  participant: boolean;
  sourceCases?: CaseSummary[];
}) {
  const [people, setPeople] = useState<CarePerson[]>([]),
    [editing, setEditing] = useState<CarePerson | null>(null),
    [open, setOpen] = useState(false),
    [key, setKey] = useState(""),
    [accounts, setAccounts] = useState<{ user_id: string; label: string }[]>(
      [],
    ),
    [candidate, setCandidate] = useState<string | null>(null),
    [history, setHistory] = useState<
      { version: number; body: Record<string, string>; recorded_at: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [source, setSource] = useState(""),
    [sourcePeople, setSourcePeople] = useState<CarePerson[]>([]);
  async function refresh() {
    setPeople(await marriageRpc("hm_people_list", { target: caseId }));
  }
  useEffect(() => {
    let active = true;
    marriageRpc<CarePerson[]>("hm_people_list", { target: caseId })
      .then((p) => {
        if (active) setPeople(p);
      })
      .catch(() => {
        if (active) setError("Person records unavailable.");
      });
    if (counsellor)
      void marriageRpc<{ user_id: string; label: string }[]>("hm_case_people", {
        target: caseId,
      })
        .then((p) => {
          if (active) setAccounts(p);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [caseId, counsellor]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      await refresh();
    } catch {
      setError(
        "Action could not complete. Check the record, identity review and any concurrent changes.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      body: Record<string, string> = {};
    for (const [k] of fields) body[k] = String(d.get(k) ?? "").trim();
    await action(async () => {
      await marriageRpc("hm_person_save", {
        target: caseId,
        person: editing?.id ?? null,
        expected_version: editing?.version ?? null,
        body,
        request_key: editing ? null : key,
      });
      setOpen(false);
      setEditing(null);
      setMessage(
        "Person record saved. Login accounts remain separate from person records.",
      );
    });
  }
  return (
    <section className={s.panel}>
      <div className={s.toolbar}>
        <h2>
          {participant && !counsellor
            ? "My person record"
            : "People in this journey"}
        </h2>
        {counsellor && (
          <button
            className={s.primary}
            disabled={busy}
            onClick={() => {
              setOpen(true);
              setEditing(null);
              setKey(crypto.randomUUID());
              setCandidate(null);
              setHistory([]);
            }}
          >
            Add person
          </button>
        )}
      </div>
      <p className={s.muted}>
        Each person keeps a separate identity. Names, contacts and account links
        are reviewed; matching email addresses do not merge records.
      </p>
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
      {people.length === 0 && (
        <p className={s.empty}>No person record is linked yet.</p>
      )}
      {people.map((p) => (
        <div className={s.activity} key={p.id}>
          <h3>
            {p.body.preferred_name || p.body.legal_name || "Person record"}
          </h3>
          <p className={s.muted}>
            {p.auth_linked ? "Account linked" : "No login account link"} ·{" "}
            {p.member_linked
              ? "Membership linked after review"
              : "No membership link"}
          </p>
          {counsellor || participant ? (
            <div className={s.controls}>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={() => {
                  setEditing(p);
                  setOpen(true);
                  setCandidate(null);
                  setHistory([]);
                }}
              >
                Review / update person
              </button>
              {counsellor && (
                <button
                  className={s.secondary}
                  disabled={busy}
                  onClick={async () => {
                    try {
                      setHistory(
                        await marriageRpc("hm_person_history", {
                          target: caseId,
                          person: p.id,
                        }),
                      );
                    } catch {
                      setError("Person history unavailable.");
                    }
                  }}
                >
                  Person history
                </button>
              )}
            </div>
          ) : (
            <>
              {legalKeys
                .filter((k) => p.body[k])
                .map((k) => (
                  <p className={s.muted} key={k}>
                    {fields.find((f) => f[0] === k)?.[1]}: {p.body[k]}
                  </p>
                ))}
            </>
          )}
        </div>
      ))}
      {open && (counsellor || participant) && (
        <>
          <form key={editing?.id ?? "new"} onSubmit={save}>
            <h3 style={{ marginTop: 24 }}>
              {editing ? "Update person" : "New person record"}
            </h3>
            <fieldset disabled={busy}>
              <div className={s.grid}>
                {fields.map(([k, label]) => (
                  <label className={s.field} key={k}>
                    {label}
                    {k === "date_of_birth" ? (
                      <input
                        name={k}
                        type="date"
                        defaultValue={editing?.body[k] ?? ""}
                      />
                    ) : (
                      <textarea
                        name={k}
                        required={k === "preferred_name"}
                        maxLength={1500}
                        defaultValue={editing?.body[k] ?? ""}
                      />
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={s.controls}>
              <button className={s.primary} disabled={busy}>
                {busy ? "Saving…" : "Save person"}
              </button>
              <button
                className={s.secondary}
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
          {counsellor && editing && (
            <details style={{ marginTop: 22 }}>
              <summary>Reviewed identity links</summary>
              <p className={s.muted}>
                Account links require a participant who has already passed the
                invitation review. Membership links use an existing reviewed
                directory mapping.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  void action(async () => {
                    await marriageRpc("hm_person_link_account", {
                      target: caseId,
                      person: editing.id,
                      account: String(d.get("account")),
                      identity_checked: d.has("checked"),
                    });
                    setMessage("Account link recorded after identity review.");
                  });
                }}
              >
                <label className={s.field}>
                  Reviewed participant account
                  <select name="account" required>
                    <option value="">Choose the correct person</option>
                    {accounts.map((a) => (
                      <option value={a.user_id} key={a.user_id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={s.check}>
                  <input name="checked" type="checkbox" required />I checked
                  that this person record belongs to this participant.
                </label>
                <button className={s.secondary} disabled={busy}>
                  Link reviewed account
                </button>
              </form>
              <button
                style={{ marginTop: 20 }}
                className={s.secondary}
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const id = await marriageRpc<string | null>(
                      "hm_member_candidate",
                      { target: caseId, person: editing.id },
                    );
                    setCandidate(id);
                    setMessage(
                      id
                        ? "A reviewed membership mapping is available. Confirm identity before linking."
                        : "No reviewed membership mapping is available. No records were merged.",
                    );
                  })
                }
              >
                Check reviewed membership mapping
              </button>
              {candidate && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const checked = new FormData(e.currentTarget).has(
                      "checked",
                    );
                    void action(async () => {
                      await marriageRpc("hm_person_link_member", {
                        target: caseId,
                        person: editing.id,
                        member: candidate,
                        identity_checked: checked,
                      });
                      setMessage(
                        "Reviewed membership reference linked. Counselling records stay separate.",
                      );
                      setCandidate(null);
                    });
                  }}
                >
                  <label className={s.check}>
                    <input name="checked" type="checkbox" required />I verified
                    the existing membership mapping belongs to this person.
                  </label>
                  <button className={s.secondary} disabled={busy}>
                    Confirm membership link
                  </button>
                </form>
              )}
            </details>
          )}
        </>
      )}
      {counsellor && sourceCases.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary>
            Reuse a reviewed person from another assigned journey
          </summary>
          <p className={s.muted}>
            This shares the same person/contact record across the two journeys.
            Their counselling notes remain separate. You must have access to
            both journeys and confirm identity.
          </p>
          <label className={s.field}>
            Source journey
            <select
              value={source}
              disabled={busy}
              onChange={async (e) => {
                setSource(e.target.value);
                setSourcePeople([]);
                if (e.target.value)
                  try {
                    setSourcePeople(
                      await marriageRpc("hm_people_list", {
                        target: e.target.value,
                      }),
                    );
                  } catch {
                    setError("Source people unavailable.");
                  }
              }}
            >
              <option value="">Choose a journey</option>
              {sourceCases
                .filter((c) => c.id !== caseId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
            </select>
          </label>
          {sourcePeople.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void action(async () => {
                  await marriageRpc("hm_person_reuse", {
                    target: caseId,
                    source_case: source,
                    person: String(d.get("person")),
                    identity_checked: d.has("checked"),
                  });
                  setMessage(
                    "The reviewed person identity is linked to this journey.",
                  );
                });
              }}
            >
              <label className={s.field}>
                Person
                <select name="person">
                  {sourcePeople.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.body.preferred_name || "Person record"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.check}>
                <input name="checked" type="checkbox" required />I verified the
                identity and permission to reuse this person/contact record.
              </label>
              <button className={s.secondary} disabled={busy}>
                Link existing person
              </button>
            </form>
          )}
        </details>
      )}
      {history.length > 0 && (
        <details open style={{ marginTop: 22 }}>
          <summary>Person amendment history</summary>
          {history.map((h) => (
            <div className={s.activity} key={h.version}>
              <p>
                Version {h.version} · {h.recorded_at}
              </p>
              {Object.entries(h.body)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <p className={s.muted} key={k}>
                    {fields.find((f) => f[0] === k)?.[1] ?? k}: {v}
                  </p>
                ))}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
