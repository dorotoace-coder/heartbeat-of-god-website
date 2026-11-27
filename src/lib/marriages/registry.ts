export const registryStatuses = [
  "Planning",
  "Requirements pending",
  "Submitted",
  "Correction requested",
  "Authorised",
  "Ceremony recorded",
  "Return submitted",
  "Verified",
  "Rejected",
  "Expired",
  "Postponed",
  "Cancelled",
];
export type RegistryKind =
  | "document"
  | "authority"
  | "submission"
  | "certificate";
export type RegistryItem = {
  id: string;
  case_id: string;
  kind: RegistryKind;
  body: Record<string, string | boolean>;
  version: number;
};
export type RegistryField = {
  key: string;
  label: string;
  type?: "date" | "check";
  options?: string[];
  required?: boolean;
};
export const registryMainFields: RegistryField[] = [
  {
    key: "kind",
    label: "Ceremony type",
    options: [
      "Church ceremony",
      "Customary ceremony",
      "Existing civil marriage",
      "Blessing / vow renewal",
    ],
  },
  { key: "status", label: "Registry status", options: registryStatuses },
  {
    key: "ceremony_status",
    label: "Ceremony status",
    options: ["proposed", "scheduled", "celebrated", "postponed", "cancelled"],
  },
  { key: "country", label: "Country" },
  { key: "region", label: "State / province / registry district" },
  { key: "venue", label: "Venue" },
  { key: "date", label: "Proposed date", type: "date" },
  { key: "actualDate", label: "Actual ceremony date", type: "date" },
  { key: "officiant", label: "Officiant" },
  { key: "witnesses", label: "Witness references" },
  {
    key: "authority",
    label: "Venue and officiant authority reviewed for this ceremony",
    type: "check",
  },
  {
    key: "eligibility",
    label: "Required eligibility documents reviewed",
    type: "check",
  },
  { key: "evidence", label: "Reviewed evidence reference" },
  { key: "application_reference", label: "Registry application reference" },
  { key: "authorization_reference", label: "Official authorization reference" },
  { key: "official_channel", label: "Responsible registry / official channel" },
  { key: "submitted_on", label: "Submission date", type: "date" },
  { key: "receipt", label: "Submission receipt reference" },
  { key: "acknowledgement", label: "Official acknowledgement reference" },
  {
    key: "correction_reason",
    label: "Correction requested / unresolved issue",
  },
  {
    key: "participant_summary",
    label: "Reviewed wedding update for the couple",
  },
  {
    key: "summary_released",
    label: "Release only this reviewed wedding update to participants",
    type: "check",
  },
];
export const registryItemLabels: Record<RegistryKind, string> = {
  document: "Document checklist",
  authority: "Venue & officiant authority",
  submission: "Registry submissions",
  certificate: "Certificate register",
};
const shared: RegistryField[] = [
  { key: "title", label: "Evidence title", required: true },
  { key: "person_reference", label: "Person name or reviewed reference" },
  { key: "reference", label: "Document / official reference" },
  { key: "issuer", label: "Issuer / responsible authority" },
  { key: "date", label: "Issued / recorded date", type: "date" },
  { key: "reviewed_on", label: "Review date", type: "date" },
  { key: "expires_on", label: "Valid through (if applicable)", type: "date" },
  { key: "source", label: "Verification source" },
  { key: "reason", label: "Review or correction note" },
  {
    key: "required",
    label: "Required for this ceremony checklist",
    type: "check",
  },
];
export const registryItemFields: Record<RegistryKind, RegistryField[]> = {
  document: [
    {
      key: "document_type",
      label: "Document type",
      options: [
        "identity",
        "birth_or_age",
        "marital_status",
        "divorce",
        "death",
        "annulment",
        "translation",
        "notice",
        "other",
      ],
    },
    {
      key: "status",
      label: "Evidence status",
      options: ["pending", "received", "reviewed", "rejected", "expired"],
    },
    ...shared,
  ],
  authority: [
    {
      key: "authority_type",
      label: "Authority type",
      options: ["venue", "officiant", "special_authorization", "other"],
    },
    { key: "jurisdiction", label: "Relevant jurisdiction" },
    {
      key: "status",
      label: "Evidence status",
      options: ["pending", "received", "reviewed", "rejected", "expired"],
    },
    ...shared,
  ],
  submission: [
    {
      key: "stage",
      label: "Submission stage",
      options: ["application", "ceremony_return", "verification", "correction"],
    },
    {
      key: "status",
      label: "Submission status",
      options: [
        "prepared",
        "submitted",
        "acknowledged",
        "correction_requested",
        "rejected",
      ],
    },
    ...shared,
    { key: "official_channel", label: "Official submission channel" },
    { key: "submitted_on", label: "Submitted on", type: "date" },
    { key: "due_on", label: "Confirmed deadline", type: "date" },
    {
      key: "deadline_source",
      label: "Deadline source — confirm with the registry",
    },
    { key: "acknowledgement", label: "Acknowledgement reference" },
    { key: "acknowledged_on", label: "Acknowledged on", type: "date" },
  ],
  certificate: [
    {
      key: "certificate_type",
      label: "Certificate type",
      options: [
        "official_marriage",
        "church_commemorative",
        "certified_copy",
        "replacement",
        "amendment",
      ],
    },
    {
      key: "status",
      label: "Verification status",
      options: [
        "unverified",
        "reviewed",
        "verified",
        "superseded",
        "cancelled",
      ],
    },
    ...shared,
    { key: "verification_reference", label: "Official verification reference" },
    {
      key: "supersedes_reference",
      label: "Earlier certificate reference, if replaced",
    },
  ],
};
