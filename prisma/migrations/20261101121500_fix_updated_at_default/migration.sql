-- Fix: beri DEFAULT pada updated_at (Prisma @updatedAt hanya client-side;
-- trigger handle_new_user meng-insert tanpa kolom updated_at).
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.penjoki ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.pesanan ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
