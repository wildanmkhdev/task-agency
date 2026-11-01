import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Environment Supabase belum terisi. Salin .env.example → .env lalu isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY."
  );
}

/**
 * Client Supabase untuk aplikasi.
 * CATATAN KEAMANAN: seluruh scoping data (owner = semua tim, admin = tim sendiri)
 * di-enforce oleh Row Level Security di database (lihat prisma/migrations).
 * Jangan pernah mengandalkan filter UI saja.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
