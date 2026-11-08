/**
 * Server-side reads from Supabase. Every function is guarded: when Supabase
 * isn't configured or a query fails, it returns an empty/null result so the
 * page can fall back honestly instead of showing placeholders.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export type EventRow = {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  location: string | null;
  image_url: string | null;
  registration_link: string | null;
  is_highlighted: boolean | null;
};

export type DepartmentRow = {
  id?: string;
  name: string;
  description: string;
  what_they_do: string;
  who_should_join: string;
  cta_text?: string | null;
  display_order?: number;
};

export type FeedReport = {
  period_label: string;
  families_fed: number | null;
  individuals_reached: number | null;
  partners_involved: number | null;
};

/** Upcoming (not past) events, soonest first. */
export async function getUpcomingEvents(limit = 6): Promise<EventRow[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("events")
      .select("id,name,description,event_date,location,image_url,registration_link,is_highlighted")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data as EventRow[]) ?? [];
  } catch (err) {
    console.error("getUpcomingEvents failed:", err);
    return [];
  }
}

/** Departments as published in seed.sql — shown if the database has none. */
export const FALLBACK_DEPARTMENTS: DepartmentRow[] = [
  { name: "Pastoral Team", description: "The spiritual foundation of the ministry.", what_they_do: "Counseling, discipleship, and spiritual oversight of the congregation.", who_should_join: "Individuals with a heart for people, strong biblical foundation, and a call to ministry.", cta_text: "Apply to Serve" },
  { name: "Intimacy (Choir)", description: "The choir of Heartbeat of God, leading the house in worship.", what_they_do: "Leads worship at our services and gatherings, and hosts TRIBE X.", who_should_join: "Singers with a heart for worship and the presence of God.", cta_text: "Join Intimacy" },
  { name: "Media & Creative", description: "Amplifying the voice of the Spirit.", what_they_do: "Live streaming, content creation, social media management, and technical production.", who_should_join: "Creatives, tech enthusiasts, photographers, and editors.", cta_text: "Join the Crew" },
  { name: "Prayer Department", description: "The engine room of the ministry.", what_they_do: "Continuous intercession for the ministry, the members, and the global body of Christ.", who_should_join: "Deeply committed intercessors and those with a passion for spiritual warfare.", cta_text: "Join Intercession" },
  { name: "Outreach & Evangelism", description: "Winning souls for the Kingdom.", what_they_do: "Local outreaches, hospital visitations, and missions to unreached areas.", who_should_join: "Bold believers with a passion for souls and community impact.", cta_text: "Join Outreach" },
];

export async function getDepartments(): Promise<DepartmentRow[]> {
  if (!isSupabaseConfigured) return FALLBACK_DEPARTMENTS;
  try {
    const { data, error } = await supabase.from("departments").select("*").not("name", "is", null).order("display_order", { ascending: true });
    if (error) throw error;
    return data && data.length > 0 ? (data as DepartmentRow[]) : FALLBACK_DEPARTMENTS;
  } catch (err) {
    console.error("getDepartments failed:", err);
    return FALLBACK_DEPARTMENTS;
  }
}

/**
 * Latest published Feed the Future impact report, or null.
 * Table: feed_the_future_reports (see src/lib/schema.sql). If the table does
 * not exist yet, or nothing is published, the stats block stays hidden.
 */
export async function getLatestFeedReport(): Promise<FeedReport | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("feed_the_future_reports")
      .select("period_label,families_fed,individuals_reached,partners_involved")
      .eq("published", true)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as FeedReport;
    const hasNumbers = [r.families_fed, r.individuals_reached, r.partners_involved].some((n) => typeof n === "number");
    return hasNumbers ? r : null;
  } catch {
    return null;
  }
}
