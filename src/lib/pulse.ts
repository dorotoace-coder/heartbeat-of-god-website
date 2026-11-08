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
  
  // 1. Autonomous Live Status calculation (Sundays 9AM - 1PM)
  const isSundayToday = isSunday(now);
  const currentHour = getHours(now);
  const isLive = isSundayToday && currentHour >= 9 && currentHour < 13;
  
  // 2. Next Event Calculation
  let nextEventDateObj;
  let activeEvent = null;
  
  if (isLive) {
    activeEvent = "Sunday Celebration Service";
    nextEventDateObj = setMinutes(setHours(nextSunday(now), 9), 0);
  } else {
    // If it's Sunday before 9am, it's today at 9am. Otherwise, next Sunday.
    if (isSundayToday && currentHour < 9) {
      nextEventDateObj = setMinutes(setHours(now, 9), 0);
    } else {
      nextEventDateObj = setMinutes(setHours(nextSunday(now), 9), 0);
    }
  }

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
