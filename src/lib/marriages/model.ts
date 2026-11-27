export type Lane = "Premarital" | "Marriage enrichment" | "Personal support";
export type Role = "Counsellor" | "Records officer" | "Coordinator";
export type Section =
  | "Overview"
  | "Family visits"
  | "Background"
  | "Wellbeing"
  | "RTT & preparation"
  | "Sessions"
  | "Wedding records"
  | "Aftercare";
export type Entry = {
  id: string;
  kind: string;
  date: string;
  title: string;
  detail: string;
  state: "Planned" | "Completed";
};
export type MarriageCase = {
  id: string;
  names: string;
  lane: Lane;
  stage: "Enquiry" | "Preparation" | "Aftercare" | "Closed";
  language: string;
  contact: string;
  safeContact: string;
  consent: boolean;
  background: {
    priorUnion: string;
    evidence: string;
    dependants: string;
    customs: string;
    accessibility: string;
  };
  wellbeing: { permission: boolean; referral: string; status: string };
  preparation: string[];
  entries: Entry[];
  wedding: {
    kind: string;
    country: string;
    region: string;
    venue: string;
    date: string;
    actualDate: string;
    officiant: string;
    witnesses: string;
    authority: boolean;
    eligibility: boolean;
    evidence: string;
    receipt: string;
    acknowledgement: string;
    status: "Planning" | "Ceremony recorded" | "Return submitted" | "Verified";
  };
  aftercare: {
    permission: boolean;
    date: string;
    channel: string;
    goal: string;
  };
  history: string[];
};
export const sections: Section[] = [
  "Overview",
  "Family visits",
  "Background",
  "Wellbeing",
  "RTT & preparation",
  "Sessions",
  "Wedding records",
  "Aftercare",
];
export const milestones = [
  "Individual conversation",
  "Joint conversation",
  "Communication & expectations",
  "Family & financial plans",
  "Preparation review",
];
export const canAccess = (role: Role, section: Section) =>
  role === "Counsellor" ||
  (role === "Records officer"
    ? ["Overview", "Wedding records"].includes(section)
    : ["Overview", "Sessions", "Aftercare"].includes(section));
// This is a synthetic, client-only interaction model. Production requires independent server/RLS enforcement.
export function newCase(id: string, names: string, lane: Lane): MarriageCase {
  return {
    id,
    names,
    lane,
    stage: "Enquiry",
    language: "English",
    contact: "",
    safeContact: "Ask before contacting",
    consent: false,
    background: {
      priorUnion: "Not yet discussed",
      evidence: "Not reviewed",
      dependants: "",
      customs: "",
      accessibility: "",
    },
    wellbeing: { permission: false, referral: "", status: "Not requested" },
    preparation: [],
    entries: [],
    wedding: {
      kind: "Church ceremony",
      country: "Nigeria",
      region: "",
      venue: "",
      date: "",
      actualDate: "",
      officiant: "",
      witnesses: "",
      authority: false,
      eligibility: false,
      evidence: "",
      receipt: "",
      acknowledgement: "",
      status: "Planning",
    },
    aftercare: { permission: false, date: "", channel: "", goal: "" },
    history: ["Sample case created"],
  };
}
export function registryBlockers(
  c: MarriageCase,
  target: MarriageCase["wedding"]["status"],
): string[] {
  const w = c.wedding;
  if (target === "Planning") return [];
  const errors: string[] = [];
  if (!w.authority || !w.eligibility || !w.evidence.trim())
    errors.push("Record reviewed authority and eligibility evidence.");
  if (
    !w.actualDate ||
    !w.venue.trim() ||
    !w.officiant.trim() ||
    !w.witnesses.trim() ||
    !w.country.trim() ||
    !w.region.trim()
  )
    errors.push(
      "Complete the actual ceremony date, jurisdiction, venue, officiant and witnesses.",
    );
  if (target === "Return submitted" || target === "Verified") {
    if (!w.receipt.trim()) errors.push("A submission receipt is required.");
  }
  if (target === "Verified" && !w.acknowledgement.trim())
    errors.push("An official acknowledgement reference is required.");
  return errors;
}
export function initialCases(): MarriageCase[] {
  const a = newCase("DEMO-001", "Ada & Daniel · fictional", "Premarital");
  a.stage = "Preparation";
  a.consent = true;
  a.language = "English / Yoruba";
  a.preparation = milestones.slice(0, 2);
  a.entries = [
    {
      id: "v1",
      kind: "Family visit",
      date: "2026-12-05",
      title: "Introduction meeting",
      detail: "Agree a time with both families. Sample activity only.",
      state: "Planned",
    },
    {
      id: "s1",
      kind: "Session",
      date: "2026-12-02",
      title: "Joint preparation conversation",
      detail: "Online · Africa/Lagos",
      state: "Planned",
    },
  ];
  a.background.customs =
    "Discuss each family’s preferred introduction arrangements.";
  const b = newCase(
    "DEMO-002",
    "Maya & Gabriel · fictional",
    "Marriage enrichment",
  );
  b.stage = "Aftercare";
  b.consent = true;
  b.aftercare = {
    permission: true,
    date: "2026-12-10",
    channel: "Agreed private channel",
    goal: "Relationship check-in",
  };
  const c = newCase("DEMO-003", "Alex · fictional", "Personal support");
  c.language = "French";
  c.safeContact = "Participant will initiate contact";
  return [a, b, c];
}
