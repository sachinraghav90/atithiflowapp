-- Migration: 20260629_0085_add_package_sequence.sql

-- 1. Add package_sequence column safely
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS package_sequence integer;

-- 2. Backfill existing packages per property
WITH numbered_packages AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.packages
)
UPDATE public.packages p
SET package_sequence = np.seq
FROM numbered_packages np
WHERE p.id = np.id AND p.package_sequence IS NULL;

-- 3. Seed/update public.property_counters for PACKAGE
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'PACKAGE',
    COALESCE(MAX(package_sequence), 0) + 1
FROM public.packages
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
        AND tablename = 'packages'
        AND indexname = 'uq_packages_property_package_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_packages_property_package_sequence
        ON public.packages (property_id, package_sequence);
    END IF;
END $$;
