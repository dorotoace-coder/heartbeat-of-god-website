"use client";
import { useEffect, useState, type FormEvent } from "react";
import { marriageRpc } from "@/lib/marriages/repository";
import CarePrivacyNotice from "./CarePrivacyNotice";
import s from "./marriages.module.css";

type Consent = {
  id: number;
  purpose: string;
  notice_version: string;
  granted: boolean;
  created_at: string;
};
type Request = { id: string; kind: string; status: string; person_id: string };
type Invite = { id: string; claimed_by: string | null; expires_at: string };
const purposes = [
  ["care", "Save my RTT reflections for assigned counselling"],
  [
    "partner_sharing",
    "Allow my explicitly shared answers to be seen by my linked partner",
  ],
  ["family_contact", "Allow agreed family contact"],
  ["followup", "Allow agreed follow-up"],
  ["publicity", "Allow separately agreed publicity"],
] as const;
export function ParticipantPrivacy({ caseId }: { caseId: string }) {
  const [history, setHistory] = useState<Consent[]>([]),
    [requests, setRequests] = useState<Request[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      marriageRpc<Consent[]>("hm_my_consent", { target: caseId }),
      marriageRpc<Request[]>("hm_rights_requests", { target: caseId }),
    ])
      .then(([h, r]) => {
        if (active) {
          setHistory(h);
          setRequests(r);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Privacy preferences could not be loaded. Reopen this case to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [caseId]);
  async function consent(reason: string, decision: boolean) {
    setBusy(true);
    setError("");
    try {
      await marriageRpc("hm_record_consent", {
        target: caseId,
        reason,
        decision,
        notice: "hm-privacy-v1",
      });
      setHistory(
        await marriageRpc<Consent[]>("hm_my_consent", { target: caseId }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Preference could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.panel}>
      <h2>Your privacy choices</h2>
      <CarePrivacyNotice />
      {error && (
        <p role="alert" className={s.alert}>
          {error}
        </p>
      )}
      {!ready ? (
        <p role="status">
          {error ? "Preferences unavailable." : "Opening preferences…"}
        </p>
      ) : (
        <fieldset disabled={busy}>
          {purposes.map(([key, label]) => {
            const latest = history.find((x) => x.purpose === key);
            return (
              <label className={s.check} key={key}>
                <input
                  type="checkbox"
                  checked={latest?.granted ?? false}
                  onChange={(e) => void consent(key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      <details>
        <summary>Preference history</summary>
        {history.map((h) => (
          <p key={h.id} className={s.muted}>
            {h.created_at} · {h.purpose} · {h.granted ? "Agreed" : "Withdrawn"}{" "}
            · {h.notice_version}
          </p>
        ))}
      </details>
      <button
        className={s.secondary}
        disabled={busy || !ready}
        style={{ marginTop: 16 }}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const records = await marriageRpc("hm_export_own", {
              target: caseId,
            });
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(records, null, 2)], {
                type: "application/json",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "my-marriage-records.json";
            link.click();
            URL.revokeObjectURL(url);
          } catch {
            setError(
              "Your export could not be prepared. Try again or request access below.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Download my personal records
      </button>
      <h3 style={{ marginTop: 22 }}>Request a records review</h3>
      <div className={s.controls}>
        {["access", "correction", "deletion"].map((kind) => (
          <button
            className={s.secondary}
            disabled={busy || !ready}
            key={kind}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await marriageRpc("hm_request_right", {
                  target: caseId,
                  request_kind: kind,
                });
                setRequests(
                  await marriageRpc<Request[]>("hm_rights_requests", {
                    target: caseId,
                  }),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Request failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Request {kind}
          </button>
        ))}
      </div>
      {requests.map((r) => (
        <p key={r.id} className={s.muted}>
          {r.kind} · {r.status}
        </p>
      ))}
    </section>
  );
}
export function ClaimInvitation({ onClaim }: { onClaim: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section className={s.panel}>
      <h2>Have an invitation?</h2>
      <p className={s.muted}>
        Enter your private invitation code. The counsellor will verify your
        identity before linking your account. Do not use someone else’s
        invitation.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            code = String(new FormData(form).get("code") ?? "").trim();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            await marriageRpc("hm_claim_invite", { code });
            form.reset();
            setMessage(
              "Invitation claimed. Your account is awaiting a separate identity review.",
            );
            onClaim();
          } catch {
            setError(
              "Invitation unavailable. Check the code or ask for a new invitation.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className={s.field}>
          Private invitation code
          <input
            name="code"
            required
            minLength={64}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className={s.primary} disabled={busy} style={{ marginTop: 15 }}>
          {busy ? "Claiming…" : "Claim invitation"}
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
export function CaseAdministration({ caseId }: { caseId: string }) {
  const [people, setPeople] = useState<{ user_id: string; label: string }[]>(
    [],
  );
  const [invites, setInvites] = useState<Invite[]>([]),
    [participants, setParticipants] = useState<{ user_id: string }[]>([]),
    [requests, setRequests] = useState<Request[]>([]),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retention, setRetention] = useState<{
      review_on?: string;
      legal_hold?: boolean;
      rationale?: string;
    } | null>(null),
    [audit, setAudit] = useState<
      {
        id: number;
        object_name: string;
        operation: string;
        occurred_at: string;
      }[]
    >([]);
  async function refresh() {
    setPeople(await marriageRpc("hm_case_people", { target: caseId }));
    const [i, p, r, t, a] = await Promise.all([
      marriageRpc<Invite[]>("hm_pending_invites", { target: caseId }),
      marriageRpc<{ user_id: string }[]>("hm_participants", { target: caseId }),
      marriageRpc<Request[]>("hm_rights_requests", { target: caseId }),
      marriageRpc<typeof retention>("hm_retention", { target: caseId }),
      marriageRpc<typeof audit>("hm_audit", { target: caseId }),
    ]);
    setInvites(i);
    setParticipants(p);
    setRequests(r);
    setRetention(t);
    setAudit(a);
  }
  useEffect(() => {
    let active = true;
    void marriageRpc<{ user_id: string; label: string }[]>("hm_case_people", {
      target: caseId,
    })
      .then((p) => {
        if (active) setPeople(p);
      })
      .catch(() => {});
    Promise.all([
      marriageRpc<Invite[]>("hm_pending_invites", { target: caseId }),
      marriageRpc<{ user_id: string }[]>("hm_participants", { target: caseId }),
      marriageRpc<Request[]>("hm_rights_requests", { target: caseId }),
      marriageRpc<typeof retention>("hm_retention", { target: caseId }),
      marriageRpc<typeof audit>("hm_audit", { target: caseId }),
    ])
      .then(([i, p, r, t, a]) => {
        if (active) {
          setInvites(i);
          setParticipants(p);
          setRequests(r);
          setRetention(t);
          setAudit(a);
        }
      })
      .catch(() => {
        if (active) setError("Administration details unavailable.");
      });
    return () => {
      active = false;
    };
  }, [caseId]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  async function retain(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    await act(async () => {
      await marriageRpc("hm_retention", {
        target: caseId,
        review_date: String(d.get("review_on") ?? "") || null,
        hold: d.has("hold"),
        rationale: String(d.get("rationale") ?? ""),
      });
    });
  }
  return (
    <section className={s.panel}>
      <h2>Case administration</h2>
      {error && (
        <p role="alert" className={s.alert}>
          {error}
        </p>
      )}
      <p className={s.muted}>
        Invitation claims require a separate identity review. Codes expire after
        seven days and are never placed in URLs.
      </p>
      <button
        className={s.primary}
        disabled={busy || participants.length >= 2}
        onClick={() =>
          void act(async () =>
            setToken(
              await marriageRpc<string>("hm_issue_invite", { target: caseId }),
            ),
          )
        }
      >
        Create participant invitation
      </button>
      {token && (
        <div className={s.notice}>
          <p>
            Give this code privately to the intended person. It is shown only in
            this session.
          </p>
          <code style={{ overflowWrap: "anywhere" }}>{token}</code>
          <button className={s.secondary} onClick={() => setToken("")}>
            Hide code
          </button>
        </div>
      )}
      {invites.map((i) => (
        <form
          key={i.id}
          onSubmit={(e) => {
            e.preventDefault();
            const checked = new FormData(e.currentTarget).has("checked");
            void act(async () => {
              await marriageRpc("hm_review_invite", {
                invite_id: i.id,
                approve: true,
                identity_checked: checked,
              });
            });
          }}
          className={s.activity}
        >
          <p>
            {i.claimed_by
              ? `Claimed account: ${people.find((p) => p.user_id === i.claimed_by)?.label ?? "Account awaiting identity review"}`
              : "Not claimed"}{" "}
            · expires {i.expires_at}
          </p>
          {i.claimed_by && (
            <>
              <label className={s.check}>
                <input name="checked" type="checkbox" required />I independently
                verified this account belongs to the intended participant.
              </label>
              <button className={s.primary} disabled={busy}>
                Approve participant link
              </button>
            </>
          )}
          <button
            type="button"
            className={s.secondary}
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await marriageRpc("hm_review_invite", {
                  invite_id: i.id,
                  approve: false,
                });
              })
            }
          >
            Revoke invitation
          </button>
        </form>
      ))}
      <h3 style={{ marginTop: 24 }}>Linked participants</h3>
      {participants.map((p) => (
        <div className={s.caseRow} key={p.user_id}>
          <span style={{ overflowWrap: "anywhere" }}>
            {people.find((person) => person.user_id === p.user_id)?.label ??
              "Linked participant"}
          </span>
          <button
            className={s.secondary}
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await marriageRpc("hm_revoke_participant", {
                  target: caseId,
                  person: p.user_id,
                });
              })
            }
          >
            Revoke case access
          </button>
        </div>
      ))}
      <h3 style={{ marginTop: 24 }}>Retention review</h3>
      <p className={s.muted}>
        Set a review date and record any legal hold. No automatic deletion is
        performed.
      </p>
      <form
        onSubmit={retain}
        key={`${retention?.review_on}-${retention?.legal_hold}-${retention?.rationale}`}
      >
        <div className={s.grid}>
          <label className={s.field}>
            Review date
            <input
              name="review_on"
              type="date"
              defaultValue={retention?.review_on ?? ""}
            />
          </label>
          <label className={s.field}>
            Review rationale
            <textarea
              name="rationale"
              required
              maxLength={1000}
              defaultValue={retention?.rationale ?? ""}
            />
          </label>
        </div>
        <label className={s.check}>
          <input
            name="hold"
            type="checkbox"
            defaultChecked={retention?.legal_hold ?? false}
          />
          Legal hold applies
        </label>
        <button className={s.secondary} disabled={busy}>
          Record retention review
        </button>
      </form>
      <h3 style={{ marginTop: 24 }}>Records requests</h3>
      {requests.map((r) => (
        <div className={s.activity} key={r.id}>
          <p>
            {r.kind} · {r.status}
          </p>
          <p className={s.muted}>
            Verify scope and the requester’s identity before fulfilling. A
            status update does not itself export, correct or delete records.
          </p>
          <select
            aria-label={`Status for ${r.kind} request`}
            value={r.status}
            disabled={busy}
            onChange={(e) =>
              void act(async () => {
                await marriageRpc("hm_review_right", {
                  request_id: r.id,
                  next_status: e.target.value,
                });
              })
            }
          >
            {["received", "reviewing", "completed", "declined"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      ))}
      <details style={{ marginTop: 24 }}>
        <summary>Recent record access and changes</summary>
        {audit.map((a) => (
          <p key={a.id} className={s.muted}>
            {a.occurred_at} · {a.object_name} · {a.operation}
          </p>
        ))}
      </details>
    </section>
  );
}
