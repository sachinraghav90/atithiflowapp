ALTER TABLE public.ref_rooms ADD COLUMN IF NOT EXISTS under_maintenance boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ref_rooms_property_maintenance ON public.ref_rooms(property_id, under_maintenance);
