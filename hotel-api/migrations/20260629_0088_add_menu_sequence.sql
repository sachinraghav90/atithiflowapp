-- Migration: 20260629_0088_add_menu_sequence.sql

-- 1. Add menu_sequence column safely
ALTER TABLE public.menu_master
ADD COLUMN IF NOT EXISTS menu_sequence integer;

-- 2. Backfill existing menu items per property
WITH numbered_menu AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.menu_master
)
UPDATE public.menu_master m
SET menu_sequence = nm.seq
FROM numbered_menu nm
WHERE m.id = nm.id AND m.menu_sequence IS NULL;

-- 3. Seed/update public.property_counters for MENU
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'MENU',
    COALESCE(MAX(menu_sequence), 0) + 1
FROM public.menu_master
GROUP BY property_id
ON CONFLICT (property_id, counter_name) 
DO UPDATE SET 
    next_value = EXCLUDED.next_value,
    updated_on = CURRENT_TIMESTAMP;

-- 4. Add unique index safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'menu_master'
        AND indexname = 'uq_menu_master_property_menu_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_menu_master_property_menu_sequence
        ON public.menu_master (property_id, menu_sequence);
    END IF;
END $$;
