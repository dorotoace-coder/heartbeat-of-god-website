"use client";
import { useEffect, useState } from "react";
import { marriageRpc } from "@/lib/marriages/repository";
import s from "./marriages.module.css";
type Enquiry = {
  id: string;
  preferred_name: string;
  lane: string;
  language?: string;
  state?: string;
  created_at: string;
};
export default function CareEnquiries({
  triage,
  onChanged,
}: {
  triage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [own, setOwn] = useState<Enquiry[]>([]),
    [queue, setQueue] = useState<Enquiry[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID());
  async function refresh() {
    setOwn(await marriageRpc("hm_my_enquiries", {}));
    if (triage) setQueue(await marriageRpc("hm_triage_queue", {}));
  }
  useEffect(() => {
    let active = true;
    marriageRpc<Enquiry[]>("hm_my_enquiries", {})
      .then((r) => {
        if (active) setOwn(r);
      })
      .catch(() => {
        if (active) setError("Enquiry receipts unavailable.");
      });
    if (triage)
      void marriageRpc<Enquiry[]>("hm_triage_queue", {})
        .then((r) => {
          if (active) setQueue(r);
        })
        .catch(() => {
          if (active) setError("Triage queue unavailable.");
        });
    return () => {
      active = false;
    };
  }, [triage]);
  return (
    <>
      <section className={s.panel}>
        <h2>Request a conversation</h2>
        <p className={s.muted}>
          You can request care on your own. A partner account or staff
          assignment is not required. Please keep private counselling details
          out of this initial request.
        </p>
        <p className={s.muted}>
          Notice hm-privacy-v1 · We use your name, care lane and safe reply
          preferences to route your request. On acceptance, your own
          account/person record is linked to the assigned care team; no email
          match or partner link is inferred. Existing contact information in
          your person record may be reused. Nothing is published or
          automatically emailed by this form.
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
        {!own.some((r) => r.state === "received") ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              const form = e.currentTarget,
                d = new FormData(form);
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await marriageRpc("hm_submit_enquiry", {
                  name: String(d.get("name")),
                  care_lane: String(d.get("lane")),
                  reply: String(d.get("reply")),
                  safe_contact: String(d.get("safe")),
                  language: String(d.get("language")),
                  notice: "hm-privacy-v1",
                  acknowledged: d.has("ack"),
                  request_key: key,
                });
                await refresh();
                setKey(crypto.randomUUID());
                form.reset();
                setMessage(
                  "Your request has been received. You can check its status below.",
                );
              } catch {
                setError(
                  "Your request could not be recorded. Check the fields or an existing pending request before retrying.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy}>
              <div className={s.grid}>
                <label className={s.field}>
                  Preferred name
                  <input name="name" required maxLength={150} />
                </label>
                <label className={s.field}>
                  Care lane
                  <select name="lane">
                    <option value="premarital">Preparing for marriage</option>
                    <option value="enrichment">Marriage enrichment</option>
                    <option value="personal">Personal conversation</option>
                    <option value="crisis">Marriage crisis support</option>
                  </select>
                </label>
                <label className={s.field}>
                  Safe reply method
                  <input
                    name="reply"
                    required
                    maxLength={250}
                    placeholder="For example: I will initiate contact"
                  />
                </label>
                <label className={s.field}>
                  Preferred language / interpreter
                  <input name="language" maxLength={150} />
                </label>
                <label className={s.field}>
                  Contact restrictions (optional)
                  <textarea name="safe" maxLength={1000} />
                </label>
              </div>
              <label className={s.check}>
                <input name="ack" type="checkbox" required />I understand how
                this request and my person/contact record will be used by the
                assigned care team.
              </label>
            </fieldset>
            <button className={s.primary} disabled={busy || !key}>
              {busy ? "Recording…" : "Request care"}
            </button>
          </form>
        ) : (
          <p className={s.notice}>
            You already have a request awaiting review.
          </p>
        )}
        {own.length > 0 && (
          <>
            <h3 style={{ marginTop: 22 }}>My requests</h3>
            {own.map((r) => (
              <div className={s.activity} key={r.id}>
                <p>
                  {r.preferred_name} · {r.lane} · {r.state}
                </p>
                <p className={s.muted}>{r.created_at}</p>
                {r.state === "received" && (
                  <button
                    className={s.secondary}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await marriageRpc("hm_withdraw_enquiry", {
                          enquiry_id: r.id,
                        });
                        await refresh();
                        setMessage("Your pending request was withdrawn.");
                      } catch {
                        setError(
                          "Request could not be withdrawn. It may already have been accepted.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Withdraw pending request
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </section>
      {triage && (
        <section className={s.panel}>
          <h2>Care enquiries awaiting triage</h2>
          <p className={s.muted}>
            Only routing details appear here. Accepting assigns the case to you
            and opens the safe reply preferences within its confidential intake.
          </p>
          {queue.length === 0 ? (
            <p className={s.empty}>No requests awaiting triage.</p>
          ) : (
            queue.map((r) => (
              <div className={s.activity} key={r.id}>
                <h3>{r.preferred_name}</h3>
                <p className={s.muted}>
                  {r.lane} · {r.language || "Language not specified"} ·{" "}
                  {r.created_at}
                </p>
                <button
                  className={s.primary}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await marriageRpc("hm_accept_enquiry", {
                        enquiry_id: r.id,
                      });
                      await refresh();
                      await onChanged();
                      setMessage(
                        "Enquiry accepted and assigned to your care workspace.",
                      );
                    } catch {
                      setError(
                        "Enquiry could not be accepted. Refresh to check whether another counsellor has handled it.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Accept & assign to me
                </button>
              </div>
            ))
          )}
        </section>
      )}
    </>
  );
}
