export const partnershipAreas = [
  {
    id: "clt",
    title: "CLT Partnership",
    description:
      "Help produce and distribute CLT devotionals and teaching resources.",
    lane: "Discipleship",
  },
  {
    id: "salvation-challenge",
    title: "Salvation Challenge",
    description:
      "Support evangelism, outreach materials and follow-up with new believers.",
    lane: "Evangelism",
  },
  {
    id: "church-building",
    title: "Church Building Project",
    description: "Support approved church building and development needs.",
    lane: "Local assembly",
  },
  {
    id: "hbg-tv",
    title: "HBG TV",
    description:
      "Help share the gospel through broadcasts, livestreams and recorded teaching.",
    lane: "Media & broadcasting",
  },
  {
    id: "feed-the-future",
    title: "Feed the Future Project",
    description:
      "Support feeding, welfare and approved community-care activities.",
    lane: "Welfare & community care",
  },
] as const;
export const frequencies = ["weekly", "monthly", "once"] as const;
export type PartnershipArea = (typeof partnershipAreas)[number]["id"];
export type Frequency = (typeof frequencies)[number];
export interface Commitment {
  id: string;
  user_id: string;
  full_name: string;
  project: PartnershipArea;
  frequency: Frequency;
  method: "manual" | "stripe";
  currency: string;
  amount: number;
  state: "active" | "paused" | "ended";
  start_date: string;
  updates_opt_in: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  provider_status: string | null;
  created_at: string;
}
export interface Gift {
  id: string;
  commitment_id: string;
  amount: number;
  currency: string;
  reference: string;
  state: "pending" | "received" | "rejected";
  reported_by: string | null;
  confirmed_by: string | null;
  created_at: string;
  received_at: string | null;
  provider_key: string | null;
  refunded_amount: number;
  disputed: boolean;
}
export const areaTitle = (id: string) =>
  partnershipAreas.find((a) => a.id === id)?.title ?? id;
export function minorAmount(value: unknown) {
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    n > 100000000 ||
    Math.abs(n * 100 - Math.round(n * 100)) > 0.00001
  )
    throw new Error("Enter a positive amount with at most two decimal places.");
  return Math.round(n * 100);
}
export function nextDue(
  start: string,
  frequency: Frequency,
  paidPeriods: number,
) {
  const date = new Date(`${start}T12:00:00Z`);
  if (frequency === "weekly")
    date.setUTCDate(date.getUTCDate() + paidPeriods * 7);
  if (frequency === "monthly") {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + paidPeriods);
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    date.setUTCDate(Math.min(day, last));
  }
  return date.toISOString().slice(0, 10);
}
