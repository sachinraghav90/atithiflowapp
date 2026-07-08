ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS has_alternate_stay BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS alternate_check_in DATE,
ADD COLUMN IF NOT EXISTS alternate_check_out DATE,
ADD COLUMN IF NOT EXISTS alternate_room_details JSONB;
