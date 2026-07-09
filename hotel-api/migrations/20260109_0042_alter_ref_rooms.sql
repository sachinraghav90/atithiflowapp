ALTER TABLE public.ref_rooms
ADD COLUMN IF NOT EXISTS room_type_id BIGINT,
ADD COLUMN IF NOT EXISTS dirty boolean DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_ref_rooms_room_type_id'
    ) THEN
        ALTER TABLE public.ref_rooms
        ADD CONSTRAINT fk_ref_rooms_room_type_id
        FOREIGN KEY (room_type_id)
        REFERENCES public.room_type_rates (id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ref_rooms_room_type_id ON public.ref_rooms (room_type_id);
