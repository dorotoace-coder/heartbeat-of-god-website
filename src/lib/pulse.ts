import { isSunday, getHours, nextSunday, setHours, setMinutes } from 'date-fns';

export type PulseState = {
  isLive: boolean;
  activeEvent: string | null;
  nextEventDate: string;
  nextEventName: string;
  sermonOfTheDay: {
    title: string;
    preacher: string;
    imageUrl: string;
  };
  globalMetrics: {
    activeUsers: number;
    totalGivingThisWeek: number;
    departmentSignups: number;
  };
};

const SERMON_ARCHIVE = [
  { title: "The Dimension of Eternal Rest", preacher: "Pastor Amos Unogwu", imageUrl: "/pastor-amos-pro.jpg" },
  { title: "Walking in Divine Authority", preacher: "Pastor Amos Unogwu", imageUrl: "/pastor-amos-pro.jpg" },
  { title: "Fresh Oil for a New Season", preacher: "Pastor Amos Unogwu", imageUrl: "/pastor-amos-pro.jpg" }
];

export function getAutonomousPulse(): PulseState {
  const now = new Date();
  
  // 1. Live status is NOT guessed from the clock any more. It starts false
  //    here and /api/pulse fills it from the real YouTube check
  //    (src/lib/live.ts) — see withLiveStatus() below.
  const isSundayToday = isSunday(now);
  const currentHour = getHours(now);
  const isLive = false;
  
  // 2. Next Event Calculation: if it's Sunday before 9am, today at 9am. Otherwise, next Sunday.
  const activeEvent: string | null = null;
  const nextEventDateObj =
    isSundayToday && currentHour < 9
      ? setMinutes(setHours(now, 9), 0)
      : setMinutes(setHours(nextSunday(now), 9), 0);

  // 3. Autonomous Sermon of the day (rotates daily based on day of year)
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const sermonIndex = dayOfYear % SERMON_ARCHIVE.length;

  // 4. Simulated organic growth metrics (fluctuates slightly throughout the day)
  const baseUsers = 1205;
  const timeMod = Math.floor(now.getTime() / 100000) % 50; // Fluctuates between 0 and 50 automatically
  
  return {
    isLive,
    activeEvent,
    nextEventDate: nextEventDateObj.toISOString(),
    nextEventName: "Sunday Celebration Service",
    sermonOfTheDay: SERMON_ARCHIVE[sermonIndex],
    globalMetrics: {
      activeUsers: baseUsers + timeMod,
      totalGivingThisWeek: 45250,
      departmentSignups: 12 + (dayOfYear % 5)
    }
  };
}

/** Pulse with isLive/activeEvent taken from whether @HBG_tv is live on YouTube now. */
export async function withLiveStatus(pulse: PulseState): Promise<PulseState> {
  const { getLiveStatus } = await import("./live");
  const live = await getLiveStatus();
  return {
    ...pulse,
    isLive: live.live,
    activeEvent: live.live ? live.title || "HBG TV Live" : pulse.activeEvent,
  };
}
