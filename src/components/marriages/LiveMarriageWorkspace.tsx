"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import MinistryLogo from "@/components/ui/MinistryLogo";
import RTTQuestionnaire from "./RTTQuestionnaire";
import {
  caseLaneLabels,
  loadWorkspace,
  loadRecord,
  saveRecord,
  loadAnswers,
  saveOwnAnswer,
  createCase,
  type Access,
  type CaseSummary,
  type RecordTable,
  type StoredRecord,
  type StoredAnswer,
} from "@/lib/marriages/repository";
import { questions, type Answer } from "@/lib/marriages/questions";
import { marriageRpc } from "@/lib/marriages/repository";
import s from "./marriages.module.css";
import PeopleRecords from "./PeopleRecords";
import CareEnquiries from "./CareEnquiries";
import RegistryWorkspace, {
  ParticipantWeddingUpdate,
} from "./RegistryWorkspace";
import { JourneyRecords, CaseProgress } from "./JourneyRecords";
import {
  ParticipantPrivacy,
  ClaimInvitation,
  CaseAdministration,
} from "./MarriagePrivacy";

const fields: Record<
  RecordTable,
  { key: string; label: string; kind?: "check" | "date" | "status" }[]
> = {
  hm_care: [
    {
      key: "background",
      label:
        "Background and previous unions — reported facts and review references",
    },
    {
      key: "family_visits",
      label:
        "Family introductions and visits — dates, permission, agreed outcomes and next actions",
    },
    {
      key: "wellbeing",
      label: "Agreed referral arrangements — no clinical results",
    },
    { key: "preparation", label: "Preparation milestones and review" },
    { key: "session_notes", label: "Private session notes" },
    {
      key: "consent_version",
      label: "Privacy notice / consent version reviewed",
    },
  ],
  hm_registry: [
    { key: "kind", label: "Ceremony type" },
    { key: "country", label: "Country" },
    { key: "region", label: "State / province / registry district" },
    { key: "venue", label: "Venue" },
    { key: "date", label: "Proposed date", kind: "date" },
    { key: "actualDate", label: "Actual ceremony date", kind: "date" },
    { key: "officiant", label: "Officiant" },
    { key: "witnesses", label: "Witness references" },
    {
      key: "authority",
      label: "Venue and officiant authority reviewed",
      kind: "check",
    },
    {
      key: "eligibility",
      label: "Required eligibility evidence reviewed",
      kind: "check",
    },
    { key: "evidence", label: "Reviewed evidence reference" },
    { key: "receipt", label: "Submission receipt reference" },
    { key: "acknowledgement", label: "Official acknowledgement reference" },
    { key: "status", label: "Record status", kind: "status" },
  ],
  hm_logistics: [
    { key: "next_date", label: "Next appointment / check-in", kind: "date" },
    { key: "timezone", label: "Timezone" },
    { key: "channel", label: "Agreed channel" },
    {
      key: "safe_contact",
      label: "Safe contact instructions — no counselling narrative",
    },
    {
      key: "followup_permission",
      label: "Participant agreed to follow-up",
      kind: "check",
    },
    { key: "appointment_status", label: "Appointment status" },
  ],
};
function RecordEditor({
  table,
  caseId,
}: {
  table: RecordTable;
  caseId: string;
}) {
  const [record, setRecord] = useState<StoredRecord | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    let current = true;
    loadRecord(table, caseId)
      .then((r) => {
        if (current) setRecord(r);
      })
      .catch(() => {
        if (current)
          setError("Record unavailable. Check your assignment and try again.");
      });
    return () => {
      current = false;
    };
  }, [table, caseId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!record || busy) return;
    const data = new FormData(e.currentTarget),
      payload: Record<string, unknown> = {};
    for (const f of fields[table])
      payload[f.key] =
        f.kind === "check"
          ? data.has(f.key)
          : String(data.get(f.key) ?? "").trim();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      setRecord(await saveRecord(table, record, payload));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.panel}>
      <h2>
        {table === "hm_care"
          ? "Counselling record"
          : table === "hm_registry"
            ? "Wedding & register"
            : "Appointments & aftercare"}
      </h2>
      {error && (
        <p className={s.alert} role="alert">
          {error}
        </p>
      )}
      {!record ? (
        <p role="status">
          {error ? "Reopen this section to retry." : "Opening record…"}
        </p>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <div className={s.grid}>
              {fields[table].map((f) =>
                f.kind === "check" ? (
                  <label key={f.key} className={s.check}>
                    <input
                      type="checkbox"
                      name={f.key}
                      defaultChecked={record.payload[f.key] === true}
                    />
                    {f.label}
                  </label>
                ) : (
                  <label
                    key={f.key}
                    className={`${s.field} ${table === "hm_care" ? s.full : ""}`}
                  >
                    {f.label}
                    {f.kind === "status" ? (
                      <select
                        name={f.key}
                        defaultValue={String(
                          record.payload[f.key] ?? "Planning",
                        )}
                      >
                        {[
                          "Planning",
                          "Ceremony recorded",
                          "Return submitted",
                          "Verified",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    ) : f.kind === "date" ? (
                      <input
                        type="date"
                        name={f.key}
                        defaultValue={String(record.payload[f.key] ?? "")}
                      />
                    ) : (
                      <textarea
                        name={f.key}
                        defaultValue={String(record.payload[f.key] ?? "")}
                        maxLength={table === "hm_care" ? 6000 : 1000}
                      />
                    )}
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <button className={s.primary} disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
          {saved && (
            <p className={s.notice} role="status">
              Record saved.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
function Answers({
  caseId,
  userId,
  participant,
  track,
}: {
  caseId: string;
  userId: string;
  participant: boolean;
  track: "discernment" | "preparation";
}) {
  const [rows, setRows] = useState<StoredAnswer[] | null>(null),
    [error, setError] = useState(""),
    [authors, setAuthors] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    if (!participant)
      void marriageRpc<{ user_id: string; label: string }[]>("hm_case_people", {
        target: caseId,
      })
        .then((people) => {
          if (active)
            setAuthors(
              Object.fromEntries(people.map((p) => [p.user_id, p.label])),
            );
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [caseId, participant]);
  useEffect(() => {
    let current = true;
    loadAnswers(caseId)
      .then((r) => {
        if (current) setRows(r);
      })
      .catch(() => {
        if (current) setError("Answers could not be opened.");
      });
    return () => {
      current = false;
    };
  }, [caseId]);
  if (error)
    return (
      <p role="alert" className={s.alert}>
        {error}
      </p>
    );
  if (!rows) return <p role="status">Opening RTT…</p>;
  if (!participant)
    return (
      <section className={s.panel}>
        <h2>Assigned RTT responses</h2>
        {rows.length === 0 ? (
          <p>No responses submitted.</p>
        ) : (
          rows.map((r) => (
            <div
              className={s.activity}
              key={`${r.author_id}-${r.question_key}`}
            >
              <p className={s.muted}>{authors[r.author_id] ?? "Participant"}</p>
              <h3>
                {questions.find((q) => q.key === r.question_key)?.prompt ??
                  "Reflection"}
              </h3>
              <span className={s.badge}>{r.visibility}</span>
              <p>{r.answer}</p>
            </div>
          ))
        )}
      </section>
    );
  const own = rows.filter((r) => r.author_id === userId),
    initial: Record<string, Answer> = {};
  for (const r of own)
    initial[r.question_key] = { text: r.answer, visibility: r.visibility };
  return (
    <>
      <ParticipantPrivacy caseId={caseId} />
      <RTTQuestionnaire
        live
        initialTrack={track}
        responses={initial}
        onSave={async (draft) => {
          const updated = [...rows];
          try {
            for (const [key, value] of Object.entries(draft)) {
              const previous = updated.find(
                (r) => r.author_id === userId && r.question_key === key,
              );
              if (
                previous?.answer === value.text &&
                previous?.visibility === value.visibility
              )
                continue;
              const result = await saveOwnAnswer(
                caseId,
                userId,
                key,
                value,
                previous,
              );
              const i = updated.findIndex(
                (r) => r.author_id === userId && r.question_key === key,
              );
              if (i < 0) updated.push(result);
              else updated[i] = result;
            }
          } finally {
            setRows(updated);
          }
        }}
      />
      <section className={s.panel}>
        <h2>Shared with you</h2>
        {rows
          .filter((r) => r.author_id !== userId && r.visibility === "shared")
          .map((r) => (
            <div
              className={s.activity}
              key={`${r.author_id}-${r.question_key}`}
            >
              <h3>
                {questions.find((q) => q.key === r.question_key)?.prompt ??
                  "Shared reflection"}
              </h3>
              <p>{r.answer}</p>
            </div>
          ))}
        <p className={s.muted}>Only explicitly shared responses appear here.</p>
      </section>
    </>
  );
}
export default function LiveMarriageWorkspace() {
  const [data, setData] = useState<{
      userId: string;
      canCreate: boolean;
      cases: CaseSummary[];
      access: Access[];
    } | null>(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState<
      RecordTable | "answers" | "journey" | "wedding_update" | "people"
    >("answers"),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    loadWorkspace()
      .then((d) => {
        if (current) setData(d);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, []);
  const scopes =
    data?.access.filter((a) => a.case_id === selected).map((a) => a.scope) ??
    [];
  const tables: RecordTable[] = scopes.includes("counsellor")
    ? ["hm_care", "hm_registry", "hm_logistics"]
    : [
        ...(scopes.includes("records") ? ["hm_registry" as const] : []),
        ...(scopes.includes("coordinator") ? ["hm_logistics" as const] : []),
      ];
  const premarital =
    data?.cases.find((c) => c.id === selected)?.lane === "premarital";
  const answers =
    premarital &&
    (scopes.includes("participant") || scopes.includes("counsellor"));
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.brand}>
          <MinistryLogo className="h-12 w-auto" />
          <div>
            <strong>Heartbeat Marriages</strong>
            <p>Marriage & Counselling</p>
          </div>
        </div>
        <Link href="/admin" className={s.secondary}>
          My workspace
        </Link>
      </header>
      <main
        id="main-content"
        className={s.main}
        style={{ maxWidth: 1100, margin: "auto" }}
      >
        <h1 className="font-headline text-4xl mb-6">Care for the journey.</h1>
        {error && (
          <p role="alert" className={s.alert}>
            {error}
          </p>
        )}
        {!data ? (
          <p role="status">
            {error
              ? "Sign in or return to your workspace."
              : "Opening your assigned records…"}
          </p>
        ) : (
          <>
            {!selected ? (
              <>
                <CareEnquiries
                  triage={data.canCreate}
                  onChanged={async () => setData(await loadWorkspace())}
                />
                <ClaimInvitation
                  onClaim={() => {
                    void loadWorkspace()
                      .then(setData)
                      .catch(() =>
                        setError("Refresh the workspace to check access."),
                      );
                  }}
                />
                <section className={s.panel}>
                  <h2>Your assigned journeys</h2>
                  {data.cases.length === 0 && (
                    <p>No cases are assigned to this account.</p>
                  )}
                  {data.cases.map((c) => (
                    <button
                      key={c.id}
                      className={s.secondary}
                      style={{ margin: 6 }}
                      onClick={() => {
                        setSelected(c.id);
                        const access = data.access
                          .filter((a) => a.case_id === c.id)
                          .map((a) => a.scope);
                        setTab(
                          access.includes("participant")
                            ? c.lane === "premarital"
                              ? "answers"
                              : "journey"
                            : access.includes("counsellor")
                              ? "journey"
                              : access.includes("records")
                                ? "hm_registry"
                                : "hm_logistics",
                        );
                      }}
                    >
                      {c.display_name}
                    </button>
                  ))}
                </section>
              </>
            ) : (
              <section className={s.panel}>
                <div className={s.toolbar}>
                  <div>
                    <h2>
                      {data.cases.find((c) => c.id === selected)?.display_name}
                    </h2>
                    <p className={s.muted}>
                      {caseLaneLabels[
                        data.cases.find((c) => c.id === selected)?.lane ?? ""
                      ] ?? "Care"}{" "}
                      · {data.cases.find((c) => c.id === selected)?.status}
                      {premarital
                        ? ` · ${data.cases.find((c) => c.id === selected)?.track}`
                        : ""}
                    </p>
                  </div>
                  <button
                    className={s.secondary}
                    onClick={() => setSelected(null)}
                  >
                    All journeys
                  </button>
                </div>
              </section>
            )}
            {selected && (
              <>
                {scopes.includes("participant") && !premarital && (
                  <details>
                    <summary>My privacy and records</summary>
                    <ParticipantPrivacy caseId={selected} />
                  </details>
                )}
                {scopes.includes("counsellor") && (
                  <>
                    <details>
                      <summary>
                        {premarital
                          ? "Case status, RTT track and next action"
                          : "Case status and next action"}
                      </summary>
                      <CaseProgress
                        record={data.cases.find((c) => c.id === selected)!}
                        onSaved={async () => setData(await loadWorkspace())}
                      />
                    </details>
                    <details>
                      <summary>
                        Participant access, privacy and retention administration
                      </summary>
                      <CaseAdministration key={selected} caseId={selected} />
                    </details>
                  </>
                )}
                <div className={s.tabs}>
                  {(scopes.includes("counsellor") ||
                    scopes.includes("records") ||
                    scopes.includes("participant")) && (
                    <button
                      onClick={() => setTab("people")}
                      aria-pressed={tab === "people"}
                    >
                      People
                    </button>
                  )}
                  {(scopes.includes("counsellor") ||
                    scopes.includes("coordinator") ||
                    scopes.includes("participant")) && (
                    <button
                      onClick={() => setTab("journey")}
                      aria-pressed={tab === "journey"}
                    >
                      Journey records
                    </button>
                  )}
                  {tables.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      aria-pressed={tab === t}
                    >
                      {t === "hm_care"
                        ? "Care notes"
                        : t === "hm_registry"
                          ? "Wedding records"
                          : "Appointments & aftercare"}
                    </button>
                  ))}
                  {scopes.includes("participant") && (
                    <button
                      onClick={() => setTab("wedding_update")}
                      aria-pressed={tab === "wedding_update"}
                    >
                      Wedding update
                    </button>
                  )}
                  {answers && (
                    <button
                      onClick={() => setTab("answers")}
                      aria-pressed={tab === "answers"}
                    >
                      RTT
                    </button>
                  )}
                </div>
                {tab === "people" ? (
                  <PeopleRecords
                    key={selected}
                    caseId={selected}
                    counsellor={scopes.includes("counsellor")}
                    participant={scopes.includes("participant")}
                    sourceCases={data.cases.filter((c) =>
                      data.access.some(
                        (a) => a.case_id === c.id && a.scope === "counsellor",
                      ),
                    )}
                  />
                ) : tab === "wedding_update" &&
                  scopes.includes("participant") ? (
                  <ParticipantWeddingUpdate key={selected} caseId={selected} />
                ) : tab === "journey" ? (
                  <JourneyRecords
                    key={selected}
                    caseId={selected}
                    counsellor={scopes.includes("counsellor")}
                    participant={scopes.includes("participant")}
                  />
                ) : tab === "answers" && answers ? (
                  <Answers
                    key={selected}
                    caseId={selected}
                    userId={data.userId}
                    participant={scopes.includes("participant")}
                    track={
                      data.cases.find((c) => c.id === selected)?.track ??
                      "discernment"
                    }
                  />
                ) : tab !== "answers" &&
                  tab !== "wedding_update" &&
                  tables.includes(tab) ? (
                  tab === "hm_registry" ? (
                    <RegistryWorkspace key={selected} caseId={selected} />
                  ) : (
                    <RecordEditor
                      key={`${selected}-${tab}`}
                      table={tab}
                      caseId={selected}
                    />
                  )
                ) : (
                  <p>This section is restricted.</p>
                )}
              </>
            )}
            {data.canCreate && (
              <details className={s.panel}>
                <summary>Create a journey — authorised counsellors</summary>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (busy) return;
                    const f = new FormData(e.currentTarget);
                    setBusy(true);
                    setError("");
                    try {
                      await createCase(
                        String(f.get("name") ?? ""),
                        String(f.get("lane") ?? ""),
                      );
                      setData(await loadWorkspace());
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Creation failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className={s.grid}>
                    <label className={s.field}>
                      Display name
                      <input name="name" required maxLength={150} />
                    </label>
                    <label className={s.field}>
                      Lane
                      <select name="lane">
                        <option value="premarital">Premarital</option>
                        <option value="enrichment">Marriage enrichment</option>
                        <option value="personal">Personal support</option>
                        <option value="crisis">Marriage crisis</option>
                      </select>
                    </label>
                  </div>
                  <button disabled={busy} className={s.primary}>
                    {busy ? "Creating…" : "Create journey"}
                  </button>
                </form>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
