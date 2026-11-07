import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useScope } from "../hooks/useScope";
import { namaCustomerTampil, rupiah, tanggalWaktu } from "../lib/format";
import type { Pesanan } from "../lib/types";
import { BellIcon, ChevronRightIcon } from "../components/icons";
import { Card, EmptyState, Spinner, StatusBadge } from "../components/ui";

const SELECT =
  "id, kode, harga, status, status_bayar, tanggal, customer:customers(nama), penjoki:penjoki(nama), team:teams(nama)";

function waktuRelatif(iso: string): string {
  const selisih = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(selisih / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return tanggalWaktu(iso);
}

/** Notifikasi — aktivitas transaksi terbaru sebagai pemberitahuan. */
export function NotifikasiPage() {
  const { applyScope } = useScope();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["notifikasi"],
    queryFn: async (): Promise<Pesanan[]> => {
      let q = supabase
        .from("pesanan")
        .select(SELECT)
        .order("tanggal", { ascending: false })
        .limit(25);
      q = applyScope(q as never) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pesanan[];
    },
  });

  const list = rows ?? [];

  if (isLoading) return <Spinner label="Memuat notifikasi…" />;

  return (
    <div className="space-y-4">
      <p className="px-1 text-[11px] text-text-muted">
        Aktivitas terbaru dari transaksi tim. Klik untuk membuka daftar transaksi.
      </p>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada notifikasi"
            hint="Aktivitas transaksi akan muncul di sini."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line-soft overflow-hidden">
          {list.map((p) => (
            <Link
              key={p.id}
              to="/pesanan"
              className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60"
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  p.status === "MENUNGU"
                    ? "border-warning-border bg-warning-soft text-warning"
                    : p.status === "SELESAI"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                      : "border-brand-border bg-brand/10 text-gold"
                }`}
              >
                <BellIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-text-main">
                    {p.customer?.nama ? namaCustomerTampil(p.customer.nama) : "Transaksi"} · {p.kode}
                  </p>
                  <span className="shrink-0 text-[10px] text-text-muted">
                    {waktuRelatif(p.tanggal)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-text-muted">
                  {p.team?.nama ?? "-"} · Penjoki {p.penjoki?.nama ?? "-"}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-[12px] font-extrabold text-gold-soft tabular">
                    {rupiah(p.harga)}
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="mt-2 h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
