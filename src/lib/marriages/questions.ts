export type Track = "discernment" | "preparation";
export type Answer = { text: string; visibility: "sealed" | "shared" };
export type Question = {
  key: string;
  pillar: string;
  track: Track | null;
  visibility: "sealed" | "shared";
  prompt: string;
  order: number;
  clinical: boolean;
};
export const questions: Question[] = [
  {
    key: "meaning_1",
    pillar: "Meaning of marriage",
    track: null,
    visibility: "shared",
    prompt:
      "What do you each believe marriage is — and what holds it together when the feelings fade?",
    order: 1,
    clinical: false,
  },
  {
    key: "meaning_2",
    pillar: "Meaning of marriage",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately and honestly: is any part of you hoping marriage will fix or escape something? Name it.",
    order: 2,
    clinical: false,
  },
  {
    key: "meaning_3",
    pillar: "Meaning of marriage",
    track: null,
    visibility: "shared",
    prompt:
      "Do you both want a covenant — lifelong and God-centred — or are you still unsure?",
    order: 3,
    clinical: false,
  },
  {
    key: "family_1",
    pillar: "Family & tribe",
    track: null,
    visibility: "shared",
    prompt: "Are both families aware of, and supportive of, this relationship?",
    order: 4,
    clinical: false,
  },
  {
    key: "family_2",
    pillar: "Family & tribe",
    track: null,
    visibility: "shared",
    prompt:
      "Is there any tribal, cultural, or family objection — and how are you each carrying it?",
    order: 5,
    clinical: false,
  },
  {
    key: "family_3",
    pillar: "Family & tribe",
    track: null,
    visibility: "shared",
    prompt:
      "Whose family will you defer to, and where will you stand together as one new home?",
    order: 6,
    clinical: false,
  },
  {
    key: "family_4",
    pillar: "Family & tribe",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: is a parent or relative still controlling your decisions in a way your partner does not know about?",
    order: 7,
    clinical: false,
  },
  {
    key: "money_1",
    pillar: "Money & work",
    track: null,
    visibility: "shared",
    prompt:
      "Are you both working, or moving toward work with a real plan? Describe it.",
    order: 8,
    clinical: false,
  },
  {
    key: "money_2",
    pillar: "Money & work",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately and honestly: do you carry any debt or money obligation your partner does not know about?",
    order: 9,
    clinical: false,
  },
  {
    key: "money_3",
    pillar: "Money & work",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: do you respect your partner's attitude to work — or does any idleness or laziness worry you?",
    order: 10,
    clinical: false,
  },
  {
    key: "money_4",
    pillar: "Money & work",
    track: null,
    visibility: "shared",
    prompt:
      "Have you talked openly together about what you each earn and what you each owe?",
    order: 11,
    clinical: false,
  },
  {
    key: "home_1",
    pillar: "Financing the home",
    track: null,
    visibility: "shared",
    prompt:
      "What is your shared vision for providing for a home in your first three years together?",
    order: 12,
    clinical: false,
  },
  {
    key: "home_2",
    pillar: "Financing the home",
    track: null,
    visibility: "shared",
    prompt:
      "Who provides, who manages the money day to day, and have you actually agreed on it?",
    order: 13,
    clinical: false,
  },
  {
    key: "home_3",
    pillar: "Financing the home",
    track: null,
    visibility: "shared",
    prompt: "How will the two of you handle a hard month financially?",
    order: 14,
    clinical: false,
  },
  {
    key: "home_4",
    pillar: "Financing the home",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: are you a spender or a saver — and does your partner's money habit concern you?",
    order: 15,
    clinical: false,
  },
  {
    key: "balance_1",
    pillar: "Healthy balance",
    track: null,
    visibility: "shared",
    prompt:
      "When you disagree, how do you each handle it — withdraw, explode, or talk it through?",
    order: 16,
    clinical: false,
  },
  {
    key: "balance_2",
    pillar: "Healthy balance",
    track: null,
    visibility: "shared",
    prompt: "What does respect look like to each of you inside a marriage?",
    order: 17,
    clinical: false,
  },
  {
    key: "balance_3",
    pillar: "Healthy balance",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately, and in full safety: has there ever been control, intimidation, or any form of abuse in this relationship? You can speak freely here — this is for your protection.",
    order: 18,
    clinical: false,
  },
  {
    key: "balance_4",
    pillar: "Healthy balance",
    track: null,
    visibility: "shared",
    prompt: "How will you make decisions together as one couple?",
    order: 19,
    clinical: false,
  },
  {
    key: "decision_1",
    pillar: "The true decision",
    track: "discernment",
    visibility: "sealed",
    prompt:
      "Privately: whose decision is this really — yours, or family, age, or pressure speaking?",
    order: 20,
    clinical: false,
  },
  {
    key: "decision_2",
    pillar: "The true decision",
    track: "discernment",
    visibility: "sealed",
    prompt: "Privately: why this person, and not someone else? And why now?",
    order: 21,
    clinical: false,
  },
  {
    key: "decision_3",
    pillar: "The true decision",
    track: "discernment",
    visibility: "sealed",
    prompt:
      "Privately: if you knew in your heart this was wrong, could you walk away?",
    order: 22,
    clinical: false,
  },
  {
    key: "decision_4",
    pillar: "The true decision",
    track: null,
    visibility: "shared",
    prompt:
      "Have you prayed about this together — and what do you each sense God is saying?",
    order: 23,
    clinical: false,
  },
  {
    key: "foundation_1",
    pillar: "Foundation & planning",
    track: null,
    visibility: "shared",
    prompt:
      "Is Christ truly central for both of you? Do you pray or worship together?",
    order: 24,
    clinical: false,
  },
  {
    key: "foundation_2",
    pillar: "Foundation & planning",
    track: null,
    visibility: "shared",
    prompt:
      "Beyond the wedding day, what is your actual plan for year one — where, how, and on what?",
    order: 25,
    clinical: false,
  },
  {
    key: "foundation_3",
    pillar: "Foundation & planning",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: is your faith real and your own, or are you going along for your partner's sake?",
    order: 26,
    clinical: false,
  },
  {
    key: "forgiveness_1",
    pillar: "Forgiveness",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: is there anything in your past your partner does not know that could affect your marriage?",
    order: 27,
    clinical: false,
  },
  {
    key: "forgiveness_2",
    pillar: "Forgiveness",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: is there unforgiveness between the two of you, unhealed, that you are still carrying?",
    order: 28,
    clinical: false,
  },
  {
    key: "forgiveness_3",
    pillar: "Forgiveness",
    track: null,
    visibility: "shared",
    prompt:
      "When one of you wrongs the other, how quickly can you forgive — or do you keep a record?",
    order: 29,
    clinical: false,
  },
  {
    key: "career_1",
    pillar: "Career & calling",
    track: null,
    visibility: "shared",
    prompt:
      "What is each of your callings or careers — and do you genuinely honour each other's?",
    order: 30,
    clinical: false,
  },
  {
    key: "career_2",
    pillar: "Career & calling",
    track: null,
    visibility: "shared",
    prompt:
      "When two careers collide, whose flexes — and have you agreed on that beforehand?",
    order: 31,
    clinical: false,
  },
  {
    key: "career_3",
    pillar: "Career & calling",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: do you secretly expect your partner to give up their dream — or fear being asked to give up yours?",
    order: 32,
    clinical: false,
  },
  {
    key: "balance_5",
    pillar: "Healthy balance",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: what are your expectations around physical intimacy and sexual expression in marriage — and where might you and your partner differ?",
    order: 33,
    clinical: false,
  },
  {
    key: "balance_6",
    pillar: "Healthy balance",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: what are your expectations about having children — whether, when, and how many — and any fertility concerns you have not yet shared?",
    order: 34,
    clinical: false,
  },
  {
    key: "health_1",
    pillar: "Health & Wholeness",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately, and for your protection: what is your genotype (e.g. AA, AS, SS, AC)? If you do not know, say so — this matters deeply for your future children. You may attach a lab result below.",
    order: 35,
    clinical: true,
  },
  {
    key: "health_2",
    pillar: "Health & Wholeness",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: what is your blood group and Rhesus factor (e.g. O+, A−)? If you are unsure, say so. You may attach a result below.",
    order: 36,
    clinical: true,
  },
  {
    key: "health_3",
    pillar: "Health & Wholeness",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately and in full confidence: have you completed infectious-disease screening (e.g. HIV, Hepatitis B/C, other STIs)? Share your status, or your willingness to be screened together. You may attach results below.",
    order: 37,
    clinical: true,
  },
  {
    key: "health_4",
    pillar: "Health & Wholeness",
    track: null,
    visibility: "sealed",
    prompt:
      "Privately: is there any health condition — physical, mental, or hereditary — that your partner and counselor should know about as you consider marriage? You may attach supporting documents below.",
    order: 38,
    clinical: true,
  },
];
export function visibleQuestions(track: Track) {
  return questions.filter((q) => !q.track || q.track === track);
}
