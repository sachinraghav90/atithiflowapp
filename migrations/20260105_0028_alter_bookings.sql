ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS price_before_tax numeric(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_after_discount numeric(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_amount numeric(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS room_tax_amount numeric(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS
drop boolean DEFAULT false;

ALTER TABLE public.bookings
DROP COLUMN IF EXISTS tax_amount;

CREATE INDEX IF NOT EXISTS idx_bookings_effective_departure ON public.bookings (
    estimated_arrival,
    COALESCE(actual_departure, estimated_departure)
);