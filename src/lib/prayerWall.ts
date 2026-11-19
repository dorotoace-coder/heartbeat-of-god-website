/**
 * Prayer Wall — public reads. The table is created by
 * supabase/migrations-pending/prayer_wall.sql (not yet run). Until it exists,
 * or whenever a read fails, this returns [] and the page shows its empty state.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export type PrayerWallKind = "prayer" | "testimony";

export type PrayerWallEntry = {
  id: string;
  created_at: string;
  kind: PrayerWallKind;
  name: string | null;
  message: string;
  prayed_count: number;
};

/** Full row, as staff see it in the admin area. */
export type PrayerWallAdminEntry = PrayerWallEntry & {
  share_publicly: boolean;
  approved: boolean;
  approved_at: string | null;
};

export const PRAYER_WALL_TABLE = "prayer_wall_entries";

export async function getApprovedPrayerWall(limit = 60): Promise<PrayerWallEntry[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from(PRAYER_WALL_TABLE)
      .select("id,created_at,kind,name,message,prayed_count")
      .eq("approved", true)
      .eq("share_publicly", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as PrayerWallEntry[]) ?? [];
  } catch (err) {
    console.error("getApprovedPrayerWall failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
