ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS guest_image bytea NULL,
ADD COLUMN IF NOT EXISTS guest_image_mime varchar(100) NULL;
