"use client";
import { useState } from "react";
import {
  questions,
  visibleQuestions,
  type Track,
  type Answer,
} from "@/lib/marriages/questions";
import s from "./marriages.module.css";

type Responses = Record<string, Answer>;
export default function RTTQuestionnaire({
  responses,
  onSave,
  live = false,
  initialTrack = "discernment",
}: {
  responses: Responses;
  onSave: (responses: Responses) => void | Promise<void>;
  live?: boolean;
  initialTrack?: Track;
}) {
  const [track, setTrack] = useState<Track>(initialTrack);
  const [pillar, setPillar] = useState(questions[0].pillar);
  const [draft, setDraft] = useState(responses);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [partnerView, setPartnerView] = useState(false);
  const visible = visibleQuestions(track);
  const pillars = [...new Set(visible.map((q) => q.pillar))];
  const current = visible.filter((q) => q.pillar === pillar);
  const answered = visible.filter(
    (q) => !q.clinical && draft[q.key]?.text.trim(),
  ).length;
  const total = visible.filter((q) => !q.clinical).length;
  function change(key: string, patch: Partial<Answer>) {
    const q = questions.find((q) => q.key === key)!;
    setDraft((prev) => ({
      ...prev,
      [key]: {
        text: prev[key]?.text ?? "",
        visibility: prev[key]?.visibility ?? q.visibility,
        ...patch,
      },
    }));
    setSaved(false);
  }
  return (
    <section className={s.panel}>
      <fieldset
        disabled={saving}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <p className={s.kicker}>RTT · Right Time Test</p>
        <h2>Before the vow, find the truth.</h2>
        <p className={s.muted}>
          {live
            ? "Your responses are saved only when you choose Save answers. Sealed answers are limited to you and the assigned counsellor."
            : "Explore the existing ten pillars. Use invented answers only. Responses remain in this page’s memory and disappear on reload."}
        </p>
        <div className={s.grid}>
          <label className={s.field}>
            Your track
            <select
              disabled={live}
              value={track}
              onChange={(e) => {
                setTrack(e.target.value as Track);
                setSaved(false);
              }}
            >
              <option value="discernment">Discernment — Should we?</option>
              <option value="preparation">Preparation</option>
            </select>
          </label>
          <label className={s.field}>
            Pillar
            <select
              value={pillar}
              onChange={(e) => {
                setPillar(e.target.value);
                setSaved(false);
              }}
            >
              {pillars.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <p className={s.muted}>
          {answered} of {total} reflection prompts answered ·{" "}
          {live
            ? "Four health topics use referral guidance."
            : "Four health topics use referral prompts in this preview."}
        </p>
        <div className={s.progress}>
          <span style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        {!live && (
          <button
            className={s.secondary}
            onClick={() => setPartnerView((v) => !v)}
          >
            {partnerView
              ? "Return to own answers"
              : "Preview what a partner could see"}
          </button>
        )}
        {partnerView && (
          <div className={s.notice}>
            Interface simulation only. This displays explicitly shared answers;
            it is not a test of production permissions.
          </div>
        )}
        <h3 style={{ marginTop: 24 }}>{pillar}</h3>
        {current.map((q) => {
          if (q.clinical)
            return partnerView ? null : (
              <div className={s.notice} key={q.key}>
                <strong>
                  {
                    (
                      {
                        health_1: "Genotype / genetic counselling",
                        health_2: "Blood group / Rhesus questions",
                        health_3: "Screening and sexual health",
                        health_4: "Physical and mental wellbeing",
                      } as Record<string, string>
                    )[q.key]
                  }
                </strong>
                <p>
                  Discuss this topic with a qualified clinician. Use the
                  Wellbeing section to record agreed referral arrangements.
                  Results and documents are not collected here.
                </p>
              </div>
            );
          const a = draft[q.key] ?? { text: "", visibility: q.visibility };
          if (partnerView)
            return a.visibility === "shared" && a.text.trim() ? (
              <div className={s.activity} key={q.key}>
                <h3>{q.prompt}</h3>
                <p>{a.text}</p>
                <span className={s.badge}>Shared by participant</span>
              </div>
            ) : null;
          return (
            <div key={q.key} className={s.activity}>
              <label className={s.field}>
                {q.prompt}
                <textarea
                  value={a.text}
                  maxLength={2000}
                  placeholder={
                    live ? "Your reflection" : "Invented sample answer"
                  }
                  onChange={(e) => change(q.key, { text: e.target.value })}
                />
              </label>
              <label className={s.field} style={{ marginTop: 12 }}>
                Answer visibility
                <select
                  value={a.visibility}
                  onChange={(e) =>
                    change(q.key, {
                      visibility: e.target.value as Answer["visibility"],
                    })
                  }
                >
                  <option value="sealed">
                    Sealed — own and assigned counsellor view
                  </option>
                  <option value="shared">
                    Shared — also visible to partner
                  </option>
                </select>
              </label>
            </div>
          );
        })}
        {partnerView &&
          !current.some(
            (q) =>
              !q.clinical &&
              draft[q.key]?.visibility === "shared" &&
              draft[q.key]?.text.trim(),
          ) && (
            <div className={s.empty}>
              No shared answers in this pillar. Sealed answers are omitted.
            </div>
          )}
        {!partnerView && (
          <div className={s.controls}>
            <button
              className={s.primary}
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setSaved(false);
                setError("");
                try {
                  await onSave(draft);
                  setSaved(true);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Answers could not be saved.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving
                ? "Saving…"
                : live
                  ? "Save answers"
                  : "Keep sample answers in preview"}
            </button>
            <button
              className={s.secondary}
              disabled={pillars.indexOf(pillar) === pillars.length - 1}
              onClick={() => {
                setPillar(pillars[pillars.indexOf(pillar) + 1]);
                setSaved(false);
              }}
            >
              Next pillar
            </button>
          </div>
        )}
        {saved && (
          <p role="status" className={s.notice}>
            {live
              ? "Answers saved."
              : "Sample answers kept for this case in memory only. Nothing was sent or saved to a database."}
          </p>
        )}
        {error && (
          <p role="alert" className={s.alert}>
            {error}
          </p>
        )}
        <p className={s.footer}>
          No scores or automated marriage verdicts. Individual answers can
          remain incomplete for a private conversation.
        </p>
      </fieldset>
    </section>
  );
}
