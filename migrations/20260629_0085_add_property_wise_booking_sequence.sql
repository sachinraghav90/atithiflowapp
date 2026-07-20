ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_sequence integer NOT NULL;

CREATE TABLE IF NOT EXISTS public.property_counters (
  id bigserial PRIMARY KEY,
  property_id bigint NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  counter_name varchar(50) NOT NULL,
  next_value integer NOT NULL DEFAULT 1,
  created_on timestamptz DEFAULT now(),
  updated_on timestamptz DEFAULT now(),
  CONSTRAINT uq_property_counters UNIQUE(property_id, counter_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_property_booking_sequence
ON public.bookings(property_id, booking_sequence);
