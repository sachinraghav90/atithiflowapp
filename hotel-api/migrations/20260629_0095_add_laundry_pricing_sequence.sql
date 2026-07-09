-- Migration: 20260629_0089_add_laundry_pricing_sequence.sql

-- 1. Add laundry_sequence column safely
ALTER TABLE public.laundry
ADD COLUMN IF NOT EXISTS laundry_sequence integer;

-- 2. Backfill existing laundry items per property
WITH numbered_laundry AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.laundry
)
UPDATE public.laundry l
SET laundry_sequence = nl.seq
FROM numbered_laundry nl
WHERE l.id = nl.id AND l.laundry_sequence IS NULL;

-- 3. Seed/update public.property_counters for LAUNDRY_PRICING
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'LAUNDRY_PRICING',
    COALESCE(MAX(laundry_sequence), 0) + 1
FROM public.laundry
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
        AND tablename = 'laundry'
        AND indexname = 'uq_laundry_property_laundry_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_laundry_property_laundry_sequence
        ON public.laundry (property_id, laundry_sequence);
    END IF;
END $$;
