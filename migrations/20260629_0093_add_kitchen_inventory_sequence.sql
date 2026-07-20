-- Migration: 20260629_0087_add_kitchen_inventory_sequence.sql

-- 1. Add kitchen_sequence column safely
ALTER TABLE public.kitchen_inventory
ADD COLUMN IF NOT EXISTS kitchen_sequence integer;

-- 2. Backfill existing kitchen inventory items per property
WITH numbered_kitchen_inventory AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.kitchen_inventory
)
UPDATE public.kitchen_inventory k
SET kitchen_sequence = nk.seq
FROM numbered_kitchen_inventory nk
WHERE k.id = nk.id AND k.kitchen_sequence IS NULL;

-- 3. Seed/update public.property_counters for KITCHEN
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'KITCHEN',
    COALESCE(MAX(kitchen_sequence), 0) + 1
FROM public.kitchen_inventory
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
        AND tablename = 'kitchen_inventory'
        AND indexname = 'uq_kitchen_inventory_property_kitchen_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_kitchen_inventory_property_kitchen_sequence
        ON public.kitchen_inventory (property_id, kitchen_sequence);
    END IF;
END $$;
