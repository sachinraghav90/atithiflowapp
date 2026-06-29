ALTER TABLE public.room_details
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_on timestamptz,
ADD COLUMN IF NOT EXISTS cancelled_by uuid;

CREATE INDEX IF NOT EXISTS idx_room_details_active ON public.room_details (ref_room_id)
WHERE
    is_cancelled = false;