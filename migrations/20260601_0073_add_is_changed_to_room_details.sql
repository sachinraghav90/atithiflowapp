ALTER TABLE public.room_details ADD COLUMN IF NOT EXISTS is_changed boolean DEFAULT false;
