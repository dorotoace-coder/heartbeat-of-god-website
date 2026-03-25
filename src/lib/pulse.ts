import { format, isSunday, getHours, addDays, nextSunday, setHours, setMinutes } from 'date-fns';

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
  { title: "The Dimension of Eternal Rest", preacher: "Rev. David", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWSDbz8sw9RNP2xkeNO4lAJAOogCfkDNzQwTXgcf6HT4g_WEDiNfJoyo-C4u3rVCpkTlnnyeLHNblMB4gieh6MqBecaNHX5Z8ywQctAhcrmKJHnrFCCZ8WPOQrbCwYlK648oetOjURHwYzRm9G7nAYBO4qOz5VS-cRTCx4bezzuC5lr7975igBT99lg5cScqUgR3y-1psXYznel2ARx8Z41i3uyhoCfzizJNUNoNHNqXw6kB7-dK2Px9PSj9s43NWgLdtkQ-tnpAi7" },
  { title: "Walking in Divine Authority", preacher: "Pst. Sarah", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCeOXaxGIFRWpbSdyB3Vd5KHquPQfkrr7EbC6T7XmXidI2LMuOcAOiyAfCekUUUIXTk55_J9IkyPSB1BTs70u2jsn_OA9fJa-UMIzki74b-sJU4UDP_IoYF9N82bWeoosMHVC68A248tOySwy48qvdwKl6eWgEuucIQHqkol6taHz02WdH97k9ZmtuT331r8656Ndsg5Azl0X2W8Z2ZSJlNZMO6gMKNbP_CKd3axuSY5qC-_WayzBxFocqbyEEpVi9xKs_RPLN-WF-c" },
  { title: "The Power of the Secret Place", preacher: "Rev. David", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCB7nqFCT0VQ1Nv15lOuWX1gXZvVY11B6Bogf4ly53sVNKqTb_i6oITZCn-vRiwzALvlTShZMqDy4rU47e41RKttnVQ_U8lWzyaD40Rp5qZ6wGmdTsV27fYHULhf95XUNhcw7OpgLcvkswJlmR6c1_QKQpoLWkkBTnMqlXkLZaoDXTMGW6JEloP2jmaXmykSR9oCxEjI5N5NO1XggGxK7sN6GyIWBW7REbpHGwT4AbcICL9UUqNdA6pRNe1Iv-SuoonQiYFmezvtSoW" }
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
