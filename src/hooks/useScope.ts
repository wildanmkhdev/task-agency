import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { hanyaBaca, jenisAdmin } from "../lib/admin";
import type { Team } from "../lib/types";

/**
 * Scoping data (D1):
 * - Owner        → bisa memilih semua tim atau drill-down per tim.
 * - Admin CS     → default tim sendiri, tapi bisa filter ke tim lain
 *                  (RLS DB jadi pagar — hanya data tim sendiri yang bisa dibaca).
 * - Admin Utama  → sama dengan admin CS.
 * - Admin sosmed → melihat seluruh tim (read-only), tanpa filter tim.
 * RLS database tetap jadi pagar utama; filter ini lapisan UX + efisiensi query.
 */
export function useScope() {
  const { profile } = useAuth();
  const isOwner = profile?.role === "OWNER";
  const readOnly = hanyaBaca(profile);
  const jenis = profile ? jenisAdmin(profile) : null;
  // Default ke tim sendiri untuk admin CS — hanya dipakai saat mount pertama
  const [teamFilter, setTeamFilter] = useState<string | null>(
    profile && profile.role !== "OWNER" && !readOnly && profile.team_id
      ? profile.team_id
      : null
  );
  // unused: keep for future use if needed
  void readOnly;

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase.from("teams").select("*").order("nama");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Semua role pakai teamFilter — RLS DB yang batasi akses lintas tim
  const scopedTeamId = teamFilter;

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
