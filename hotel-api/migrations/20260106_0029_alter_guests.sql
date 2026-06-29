ALTER TABLE public.guests
ALTER COLUMN last_name
DROP NOT NULL;

ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS country varchar(20),
ADD COLUMN IF NOT EXISTS coming_from varchar(255),
ADD COLUMN IF NOT EXISTS going_to varchar(255),
ADD COLUMN IF NOT EXISTS booking_type varchar(255);