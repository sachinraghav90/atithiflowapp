ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS early_checkin_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delayed_checkout_amount NUMERIC(10,2) DEFAULT 0;
