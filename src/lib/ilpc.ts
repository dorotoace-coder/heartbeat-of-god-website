/**
 * ILPC — International Leaders & Pastors Conference.
 *
 * Every fact here comes from the official ILPC 2026 materials already in
 * /public (ilpc-2026-program.html, ilpc-2026-story.html,
 * ilpc-speaker-announcement.html, ilpc-directions.html). Nothing is invented.
 * Anything not yet supplied by the ministry stays empty and its section hides.
 */
import { HQ_ADDRESS } from "./site";

export const ILPC_2026 = {
  name: "ILPC 2026",
  fullName: "International Leaders & Pastors Conference",
  theme: "Fresh Oil for a New Season",
  dateLabel: "June 5–7, 2026",
  endsAt: "2026-06-07",
  venue: HQ_ADDRESS,
  venueShort: "HBG Ministry, Akute, Ogun State, Nigeria",
  alsoOnline: "Also streamed live on Zoom",
  host: "Hosted by Pastor Amos Unogwu",
  admission: "Free registration",
  scripture: {
    text: "And I will give you shepherds according to My heart, who will feed you with knowledge and understanding.",
    ref: "Jeremiah 3:15",
  },
};

export type IlpcSpeaker = {
  name: string;
  role: string;
  from: string;
  photo: string;
  /** width / height of the photo file */
  photoSize: [number, number];
  sessions: string[];
};

export const ILPC_2026_SPEAKERS: IlpcSpeaker[] = [
  {
    name: "Dr. Jide Ayangbesan",
    role: "Guest Speaker",
    from: "Nigeria",
    photo: "/dr-jide-ayangbesan.jpg",
    photoSize: [754, 1024],
    sessions: ["Fri 6:00 PM — Leadership Masterclass: Ablaze for Christ", "Sat 5:00 PM — Night of Supernatural Encounter"],
  },
  {
    name: "Pastor Christopher Ehidiamen",
    role: "Guest Speaker · Online",
    from: "Texas, USA — joined via Zoom",
    photo: "/pastor-chris-ehidiamen.jpg",
    photoSize: [960, 1280],
    sessions: ["Sat 11:30 AM — Session 2: Navigating the New Season"],
  },
  {
    name: "Pastor Amos Unogwu",
    role: "Host Pastor",
    from: "Akute, Nigeria",
    photo: "/pastor-amos.png",
    photoSize: [1545, 2000],
    sessions: ["Sun 9:30 AM — Session 3: Apostolic Commissioning", "Sun 11:00 AM — Praise & Worship and Closing"],
  },
];

export type IlpcDay = {
  day: string;
  date: string;
  theme: string;
  items: { time: string; title: string; speaker?: string }[];
};

export const ILPC_2026_PROGRAMME: IlpcDay[] = [
  {
    day: "Day 1",
    date: "Friday, June 5",
    theme: "Arrival & Ablaze for Christ",
    items: [
      { time: "5:00 PM", title: "Registration & Accreditation" },
      { time: "6:00 PM", title: "Leadership Masterclass — Ablaze for Christ", speaker: "Dr. Jide Ayangbesan" },
    ],
  },
  {
    day: "Day 2",
    date: "Saturday, June 6",
    theme: "Equipping & Supernatural Encounter",
    items: [
      { time: "8:00 AM", title: "Registration & Accreditation" },
      { time: "9:30 AM", title: "Session 1 — Fresh Oil for Ministry" },
      { time: "11:30 AM", title: "Session 2 — Navigating the New Season", speaker: "Pst. Christopher Ehidiamen (Zoom)" },
      { time: "1:00 PM", title: "Lunch Break" },
      { time: "5:00 PM", title: "Night of Supernatural Encounter", speaker: "Dr. Jide Ayangbesan" },
    ],
  },
  {
    day: "Day 3",
    date: "Sunday, June 7",
    theme: "Commissioning & Closing Service",
    items: [
      { time: "8:00 AM", title: "Morning Devotion" },
      { time: "9:30 AM", title: "Session 3 — Apostolic Commissioning", speaker: "Pastor Amos Unogwu" },
      { time: "11:00 AM", title: "Praise & Worship Service" },
      { time: "12:30 PM", title: "Communion & Covenant Meal" },
      { time: "2:00 PM", title: "Closing Remarks & Departure" },
    ],
  },
];

/**
 * TODO(Doroto): event photos from ILPC 2026. The repo holds speaker portraits
 * only — no photos taken at the conference. Add files to /public/media/ilpc-2026/
 * and list them here ({ src, alt, width, height }); the gallery appears once
 * this has at least one entry.
 */
export const ILPC_2026_GALLERY: { src: string; alt: string; width: number; height: number }[] = [];

/**
 * TODO(Doroto): a short written recap (attendance, highlights, testimonies).
 * Leave empty until the ministry supplies it; the recap paragraph hides.
 */
export const ILPC_2026_RECAP = "";

/** ILPC 2027 — dates not announced. Only the month is confirmed. */
export const ILPC_2027 = {
  name: "ILPC 2027",
  dateLabel: "June 2027 — dates to be announced",
  inquiryType: "ILPC 2027 Interest",
};
