import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Environment Supabase belum terisi. Salin .env.example → .env lalu isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY."
  );
}

// Sudah dijamin terisi oleh guard di atas; dipisah agar tipe string tetap
// terbawa saat dipakai di dalam fungsi (clientSementara).
const supabaseUrl: string = url;
const supabaseAnonKey: string = anonKey;

/**
 * Client Supabase untuk aplikasi.
 * CATATAN KEAMANAN: seluruh scoping data (owner = semua tim, admin = tim sendiri)
 * di-enforce oleh Row Level Security di database (lihat prisma/migrations).
 * Jangan pernah mengandalkan filter UI saja.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Client Supabase sekali pakai untuk MEMVERIFIKASI kredensial owner
 * tanpa mengganggu sesi yang sedang aktif.
 *
 * Dipakai halaman Domain Owner: admin yang sedang login bisa memasukkan
 * akun owner, kredensialnya dicek di client terpisah, lalu sesi sementara
 * langsung dibuang — sesi admin tetap utuh.
 */
export function clientSementara() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
