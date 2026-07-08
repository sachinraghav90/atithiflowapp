ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS estimated_arrival_time character varying DEFAULT NULL;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS room_number_prefix character varying;

ALTER TABLE public.kitchen_inventory
ADD COLUMN IF NOT EXISTS unit character varying;
