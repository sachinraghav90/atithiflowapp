ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS pickup_time timestamptz,
ADD COLUMN IF NOT EXISTS pickup_location varchar,
ADD COLUMN IF NOT EXISTS drop_time timestamptz,
ADD COLUMN IF NOT EXISTS drop_location varchar;
