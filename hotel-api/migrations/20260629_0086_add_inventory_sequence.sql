-- Migration: 20260629_0086_add_inventory_sequence.sql

-- 1. Add inventory_sequence column safely
ALTER TABLE public.inventory_master
ADD COLUMN IF NOT EXISTS inventory_sequence integer;

-- 2. Backfill existing inventory items per property
WITH numbered_inventory AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.inventory_master
)
UPDATE public.inventory_master i
SET inventory_sequence = ni.seq
FROM numbered_inventory ni
WHERE i.id = ni.id AND i.inventory_sequence IS NULL;

-- 3. Seed/update public.property_counters for INVENTORY
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'INVENTORY_MASTER',
    COALESCE(MAX(inventory_sequence), 0) + 1
FROM public.inventory_master
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
        AND tablename = 'inventory_master'
        AND indexname = 'uq_inventory_master_property_inventory_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_inventory_master_property_inventory_sequence
        ON public.inventory_master (property_id, inventory_sequence);
    END IF;
END $$;
