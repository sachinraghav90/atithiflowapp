-- Migration: 20260629_0083_add_enquiry_sequence.sql

-- 1. Add enquiry_sequence column safely
ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS enquiry_sequence integer;

-- 2. Backfill existing enquiries per property
WITH numbered_enquiries AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.enquiries
)
UPDATE public.enquiries e
SET enquiry_sequence = ne.seq
FROM numbered_enquiries ne
WHERE e.id = ne.id AND e.enquiry_sequence IS NULL;

-- 3. Seed/update public.property_counters for ENQUIRY
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'ENQUIRY',
    COALESCE(MAX(enquiry_sequence), 0) + 1
FROM public.enquiries
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
        AND tablename = 'enquiries'
        AND indexname = 'uq_enquiries_property_enquiry_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_enquiries_property_enquiry_sequence
        ON public.enquiries (property_id, enquiry_sequence);
    END IF;
END $$;
