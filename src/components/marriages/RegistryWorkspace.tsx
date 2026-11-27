"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  loadRecord,
  saveRecord,
  marriageRpc,
  type StoredRecord,
} from "@/lib/marriages/repository";
import {
  registryMainFields,
  registryItemFields,
  registryItemLabels,
  type RegistryKind,
  type RegistryItem,
  type RegistryField,
} from "@/lib/marriages/registry";
import type { CarePerson } from "./PeopleRecords";
import s from "./marriages.module.css";
function Fields({
  fields,
  body,
}: {
  fields: RegistryField[];
  body: Record<string, unknown>;
}) {
  return (
    <div className={s.grid}>
      {fields.map((f) =>
        f.type === "check" ? (
          <label className={s.check} key={f.key}>
            <input
              name={f.key}
              type="checkbox"
              defaultChecked={body[f.key] === true}
            />
            {f.label}
          </label>
        ) : (
          <label className={s.field} key={f.key}>
            {f.label}
            {f.options ? (
              <select
                name={f.key}
                defaultValue={String(body[f.key] ?? f.options[0])}
              >
                {f.options.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            ) : f.type === "date" ? (
              <input
                type="date"
                name={f.key}
                defaultValue={String(body[f.key] ?? "")}
              />
            ) : (
              <textarea
                name={f.key}
                required={f.required}
                maxLength={1500}
                defaultValue={String(body[f.key] ?? "")}
              />
            )}
          </label>
        ),
      )}
    </div>
  );
}
function collect(fields: RegistryField[], data: FormData) {
  const body: Record<string, string | boolean> = {};
  for (const f of fields)
    body[f.key] =
      f.type === "check"
        ? data.has(f.key)
        : String(data.get(f.key) ?? "").trim();
  return body;
}
export default function RegistryWorkspace({ caseId }: { caseId: string }) {
  const [people, setPeople] = useState<CarePerson[]>([]);
  useEffect(() => {
    let active = true;
    void marriageRpc<CarePerson[]>("hm_people_list", { target: caseId })
      .then((p) => {
        if (active) setPeople(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [caseId]);
  const [record, setRecord] = useState<StoredRecord | null>(null),
    [kind, setKind] = useState<RegistryKind>("document"),
    [items, setItems] = useState<RegistryItem[]>([]),
    [editing, setEditing] = useState<RegistryItem | null>(null),
    [newItem, setNewItem] = useState(false),
    [requestKey, setRequestKey] = useState(""),
    [history, setHistory] = useState<
      { version: number; body: Record<string, unknown>; recorded_at: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    loadRecord("hm_registry", caseId)
      .then((r) => {
        if (active) setRecord(r);
      })
      .catch(() => {
        if (active) setError("Wedding record unavailable.");
      });
    return () => {
      active = false;
    };
  }, [caseId]);
  useEffect(() => {
    let active = true;
    marriageRpc<RegistryItem[]>("hm_registry_items", {
      target: caseId,
      item_kind: kind,
    })
      .then((r) => {
        if (active) setItems(r);
      })
      .catch(() => {
        if (active) setError("Evidence records unavailable.");
      });
    return () => {
      active = false;
    };
  }, [caseId, kind]);
  async function saveMain(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!record || busy) return;
    const data = new FormData(e.currentTarget),
      body = collect(registryMainFields, data),
      intent = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (intent === "reopen") {
      body.status = "Planning";
      body.authority = false;
      body.eligibility = false;
      body.summary_released = false;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setRecord(await saveRecord("hm_registry", record, body));
      setMessage(
        intent === "reopen"
          ? "Verification reopened. Review the updated details before advancing."
          : "Wedding record saved.",
      );
    } catch {
      setError(
        "Save failed. Check stage evidence and any conflicting edit. Changed ceremony details require reopening verification first. Your draft remains here.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget),
      body = collect(registryItemFields[kind], data);
    body.person_id = String(data.get("person_id") ?? "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await marriageRpc("hm_registry_item_save", {
        target: caseId,
        item_id: editing?.id ?? null,
        item_kind: kind,
        expected_version: editing?.version ?? null,
        body,
        request_key: editing ? null : requestKey,
      });
      setItems(
        await marriageRpc("hm_registry_items", {
          target: caseId,
          item_kind: kind,
        }),
      );
      setRecord(await loadRecord("hm_registry", caseId));
      setNewItem(false);
      setEditing(null);
      setHistory([]);
      setMessage(
        "Evidence saved. Previous versions are preserved. Review the current registration status before sharing.",
      );
    } catch {
      setError(
        "Evidence could not be saved. Check references, review dates and required fields. Your draft remains here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className={s.panel}>
        <h2>Wedding & marriage register</h2>
        <p className={s.muted}>
          Track the ceremony and official paperwork separately. Document
          references record a human review; the system does not issue or verify
          government certificates.
        </p>
        {error && (
          <p className={s.alert} role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className={s.notice} role="status">
            {message}
          </p>
        )}
        {!record ? (
          <p role="status">Opening wedding record…</p>
        ) : (
          <>
            <span className={s.badge}>
              {String(record.payload.status ?? "Planning")}
            </span>
            <details>
              <summary style={{ marginTop: 20 }}>
                Ceremony, registration and participant update
              </summary>
              <form key={record.version} onSubmit={saveMain}>
                <fieldset disabled={busy}>
                  <Fields fields={registryMainFields} body={record.payload} />
                </fieldset>
                <div className={s.controls}>
                  <button className={s.primary} disabled={busy}>
                    {busy ? "Saving…" : "Save wedding record"}
                  </button>
                  <button
                    className={s.secondary}
                    disabled={busy}
                    name="intent"
                    value="reopen"
                  >
                    Reopen verification
                  </button>
                </div>
              </form>
            </details>
            <button
              className={s.secondary}
              style={{ marginTop: 18 }}
              disabled={busy}
              onClick={async () => {
                setError("");
                try {
                  setHistory(
                    await marriageRpc("hm_registry_history", {
                      target: caseId,
                    }),
                  );
                } catch {
                  setError("Registry history unavailable.");
                }
              }}
            >
              Registration amendment history
            </button>
          </>
        )}
      </section>
      <section className={s.panel}>
        <div className={s.toolbar}>
          <h2>Evidence & official records</h2>
          <button
            className={s.primary}
            disabled={busy}
            onClick={() => {
              setNewItem(true);
              setEditing(null);
              setRequestKey(crypto.randomUUID());
              setHistory([]);
              setError("");
              setMessage("");
            }}
          >
            Add evidence record
          </button>
        </div>
        <label className={s.field}>
          Evidence category
          <select
            disabled={busy}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as RegistryKind);
              setItems([]);
              setNewItem(false);
              setEditing(null);
              setHistory([]);
              setError("");
            }}
          >
            {Object.entries(registryItemLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {items.length === 0 && !newItem && (
          <p className={s.empty}>No evidence records in this category.</p>
        )}
        {items.map((item) => (
          <div className={s.activity} key={item.id}>
            <h3>{String(item.body.title)}</h3>
            <p className={s.muted}>
              {String(item.body.status)} · {String(item.body.reference ?? "")}
            </p>
            <div className={s.controls}>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={() => {
                  setEditing(item);
                  setNewItem(true);
                  setHistory([]);
                  setError("");
                }}
              >
                Review / amend evidence
              </button>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={async () => {
                  try {
                    setHistory(
                      await marriageRpc("hm_registry_history", {
                        target: caseId,
                        item_id: item.id,
                      }),
                    );
                  } catch {
                    setError("Evidence history unavailable.");
                  }
                }}
              >
                Evidence history
              </button>
            </div>
          </div>
        ))}
        {newItem && (
          <form key={editing?.id ?? `new-${kind}`} onSubmit={saveItem}>
            <h3 style={{ marginTop: 24 }}>
              {editing ? "Amend evidence" : "New evidence record"}
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
              <Fields
                fields={registryItemFields[kind]}
                body={editing?.body ?? {}}
              />
            </fieldset>
            <div className={s.controls}>
              <button className={s.primary} disabled={busy}>
                {busy ? "Saving…" : "Save evidence record"}
              </button>
              <button
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={() => setNewItem(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
      {history.length > 0 && (
        <section className={s.panel}>
          <h2>Amendment history</h2>
          {history.map((h) => (
            <div className={s.activity} key={h.version}>
              <h3>
                Version {h.version} · {h.recorded_at}
              </h3>
              {Object.entries(h.body)
                .filter(([, v]) => v !== "" && v !== false && v !== null)
                .map(([k, v]) => (
                  <p key={k} className={s.muted}>
                    {[...registryMainFields, ...registryItemFields[kind]].find(
                      (f) => f.key === k,
                    )?.label ?? k}
                    : {String(v)}
                  </p>
                ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
export function ParticipantWeddingUpdate({ caseId }: { caseId: string }) {
  const [data, setData] = useState<Record<string, string | null> | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    marriageRpc<Record<string, string | null>>("hm_registry_update", {
      target: caseId,
    })
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setError("Wedding update unavailable.");
      });
    return () => {
      active = false;
    };
  }, [caseId]);
  return (
    <section className={s.panel}>
      <h2>Your wedding update</h2>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Opening your update…</p>
      ) : (
        <>
          {data.status && <span className={s.badge}>{data.status}</span>}
          <p className={s.muted}>{data.summary}</p>
          {data.proposed_date && <p>Proposed date: {data.proposed_date}</p>}
          {data.ceremony_date && <p>Ceremony date: {data.ceremony_date}</p>}
          {data.venue && <p>{data.venue}</p>}
        </>
      )}
    </section>
  );
}
