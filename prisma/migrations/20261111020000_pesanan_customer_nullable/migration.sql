-- Tambah Transaksi tidak memakai data customer (customer_id = null).
-- Kolom ini masih NOT NULL di database sehingga simpan selalu gagal.
-- Revisi 11 Nov 2026: izinkan NULL agar transaksi bisa dicatat tanpa customer.
ALTER TABLE "pesanan" ALTER COLUMN "customer_id" DROP NOT NULL;
