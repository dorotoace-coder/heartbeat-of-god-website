/**
 * The ministry's current headline programme.
 *
 * WHY THIS EXISTS
 * The homepage hardcoded MTA 2026. When it finished on 6 Sept the banner kept
 * saying "NEXT MAJOR ASSEMBLY · REGISTRATION OPEN" and offering "Register Free
 * — MTA 2026" six weeks later. Visitors were being invited to register for a
 * past event.
 *
 * HOW TO SWITCH TO THE NEXT PROGRAMME
 * Edit the fields below. The homepage banner, the featured event card and the
 * footer link all read from here, so there is one place to change and nothing
 * to hunt for.
 *
 * Keep `endsAt` accurate. It is what lets the site tell the truth about an
 * event that has already happened.
 */

export type MinistryEvent = {
  /** Big name, e.g. "TRIBE X" */
  name: string;
  /** Second line, e.g. "Throne Room" */
  subtitle: string;
  /** Small all-caps label above the name */
  kicker: string;
  /** Badge text, e.g. "Registration Open" */
  badge: string;
  scripture: string;

  /** ISO local times. */
  startsAt: string;
  endsAt: string;

  dateLabel: string;
  venue: string;
  admission: string;
  host: string;

  /** Where the primary CTA points. */
  registerUrl: string;
  registerLabel: string;
  /** Secondary CTA. Omit to hide it. */
  learnMoreUrl?: string;

  /** Short line for the featured card. */
  cardBlurb: string;

  /** Event flyer in /public. Omit and the card falls back to the flame glyph. */
  flyer?: string;
};

export const currentEvent: MinistryEvent = {
  name: "TRIBE X",
  subtitle: "Throne Room",
  kicker: "Next Gathering",
  badge: "Save The Date",
  scripture:
    '"Be still, and know that I am God" — Psalm 46:10',

  startsAt: "2026-11-27T19:00:00",
  endsAt: "2026-11-27T21:30:00",

  dateLabel: "November 27, 2026",
  venue: "Akute, Nigeria & Online",
  admission: "Free Entry",
  host: "Host: Pastor Amos Unogwu",

  registerUrl: "https://events.heartbeatofgod.ca",
  registerLabel: "Reserve Your Place",
  learnMoreUrl: "https://events.heartbeatofgod.ca#about",

  cardBlurb:
    "A night of prophetic worship and the Word. Come before the throne of God.",

  flyer: "/tribe-x-throne-room.jpg",
};

/** True once the event has finished — drives honest past-tense copy. */
export function hasEnded(now: number = Date.now()): boolean {
  return now > new Date(currentEvent.endsAt).getTime();
}
