import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { hanyaBaca, jenisAdmin } from "../lib/admin";
import type { Team } from "../lib/types";

/**
 * Scoping data (D1):
 * - Owner        → bisa memilih semua tim atau drill-down per tim.
 * - Admin Utama  → hanya timnya sendiri (Tim 1).
 * - Admin CS     → hanya timnya sendiri (Tim 2–5).
 * - Admin sosmed → melihat seluruh tim (read-only), tanpa filter tim.
 * RLS database tetap jadi pagar utama; filter ini lapisan UX + efisiensi query.
 */
export function useScope() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const readOnly = hanyaBaca(profile);
  const jenis = profile ? jenisAdmin(profile) : null;
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase.from("teams").select("*").order("nama");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  /** team_id untuk semua query; admin CS/utama = timnya sendiri; owner/sosmed = pilihan bebas */
  const scopedTeamId = isOwner || readOnly ? teamFilter : (profile?.team_id ?? null);

  /** Terapkan scope ke query supabase (kolom team_id) */
  function applyScope<T extends { eq: (c: string, v: string) => T }>(query: T): T {
    return scopedTeamId ? query.eq("team_id", scopedTeamId) : query;
  }

  return {
    profile,
    isOwner,
    teams: teamsQuery.data ?? [],
    teamFilter,
    setTeamFilter,
    scopedTeamId,
    applyScope,
    jenisAdmin: jenis,
  };
}
