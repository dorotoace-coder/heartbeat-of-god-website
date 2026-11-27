"use client";
import { useEffect, useState } from "react";
import { marriageRpc } from "@/lib/marriages/repository";
import s from "./marriages.module.css";

export default function CarePrivacyNotice() {
  const [review, setReview] = useState("");
  useEffect(() => {
    let active = true;
    marriageRpc<{ review_on: string }>("hm_pilot_info", {})
      .then((info) => { if (active) setReview(info.review_on); })
      .catch(() => { if (active) setReview(""); });
    return () => { active = false; };
  }, []);
  return <details className={s.activity} open>
    <summary><strong>Privacy and the congregation pilot · hm-privacy-v1</strong></summary>
    <p>Heartbeat of God Global Outreach uses this workspace for pastoral care, counselling, preparation and reviewed marriage records. Provide only what is needed. Keep private counselling details out of your initial request.</p>
    <p>Case access is restricted. Other departments and congregation members cannot browse counselling records. Your partner does not automatically receive your profile or sealed answers. Partner sharing, family contact, follow-up and publicity are separate choices. Confidentiality may be limited where protection or a legal duty requires action; these situations receive human review.</p>
    <p>Supabase and Vercel host this service; data may be processed outside your country. Participation is voluntary. Ask Pastor Amos directly for an alternative or safer way to communicate. This is not an emergency service and does not promise an immediate response.</p>
    <p>Request access, correction, withdrawal of optional sharing or deletion through the workspace or directly through Pastor Amos. Requests receive human review. Withdrawal cannot undo information already seen. Documented legal or protection holds may limit deletion. Nothing is published or automatically emailed by this module, and requesting care does not subscribe you to a newsletter. Existing ministry and partnership email preferences are unchanged.</p>
    <p>Every enquiry and case is reviewed at the end of this 30-day pilot{review ? `, on ${review}` : ""}, and closed cases are reviewed at closure. Unneeded information is selected for secure removal through a reviewed operator process. Continuing care needs a documented purpose and next review date. Statutory marriage records follow verified jurisdiction requirements separately from counselling notes. No automatic deletion is enabled; backup and provider limitations are explained when removal is reviewed.</p>
    <p>Feedback is optional: tell Pastor Amos what was easy or confusing. Keep counselling details out of general feedback.</p>
  </details>;
}
