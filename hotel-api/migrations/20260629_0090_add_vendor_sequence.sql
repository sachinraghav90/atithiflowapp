-- Migration: 20260629_0084_add_vendor_sequence.sql

-- 1. Add vendor_sequence column safely
ALTER TABLE public.ref_vendors
ADD COLUMN IF NOT EXISTS vendor_sequence integer;

-- 2. Backfill existing vendors per property
WITH numbered_vendors AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.ref_vendors
)
UPDATE public.ref_vendors v
SET vendor_sequence = nv.seq
FROM numbered_vendors nv
WHERE v.id = nv.id AND v.vendor_sequence IS NULL;

-- 3. Seed/update public.property_counters for VENDOR
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'VENDOR',
    COALESCE(MAX(vendor_sequence), 0) + 1
FROM public.ref_vendors
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
        AND tablename = 'ref_vendors'
        AND indexname = 'uq_ref_vendors_property_vendor_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_ref_vendors_property_vendor_sequence
        ON public.ref_vendors (property_id, vendor_sequence);
    END IF;
END $$;
