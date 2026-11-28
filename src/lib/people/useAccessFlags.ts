"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Two facts the screens need about the signed-in account. Both rows are readable only
 * by their owner, so this never reveals anyone else's access. Unknown until loaded.
 */
export function useAccessFlags() {
  const [flags, setFlags] = useState<{ treasurySeat: boolean | null; pastoralAssignment: boolean | null }>({ treasurySeat: null, pastoralAssignment: null });
  useEffect(() => {
    let active = true;
    async function load() {
      const identity = await supabase.auth.getUser();
      const me = identity.data.user?.id;
      if (!me) return;
      const [seat, assignment] = await Promise.all([
        supabase.from("treasury_portal_access").select("office").eq("user_id", me).limit(1),
        supabase.from("pastorate_assignments").select("user_id").eq("user_id", me).eq("active", true).limit(1),
      ]);
      if (!active) return;
      setFlags({
        treasurySeat: seat.error ? false : (seat.data ?? []).length > 0,
        pastoralAssignment: assignment.error ? false : (assignment.data ?? []).length > 0,
      });
    }
    void load();
    return () => { active = false; };
  }, []);
  return flags;
}
