-- Migration: 20260629_0082_add_laundry_order_sequence.sql

-- 1. Add order_sequence column safely
ALTER TABLE public.laundry_orders
ADD COLUMN IF NOT EXISTS order_sequence integer;

-- 2. Backfill existing laundry orders per property
WITH numbered_orders AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
  FROM public.laundry_orders
)
UPDATE public.laundry_orders lo
SET order_sequence = no.seq
FROM numbered_orders no
WHERE lo.id = no.id AND lo.order_sequence IS NULL;

-- 3. Seed/update public.property_counters for LAUNDRY_ORDER
INSERT INTO public.property_counters (property_id, counter_name, next_value)
SELECT 
    property_id,
    'LAUNDRY_ORDER',
    COALESCE(MAX(order_sequence), 0) + 1
FROM public.laundry_orders
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
        AND tablename = 'laundry_orders'
        AND indexname = 'uq_laundry_orders_property_order_sequence'
    ) THEN
        CREATE UNIQUE INDEX uq_laundry_orders_property_order_sequence
        ON public.laundry_orders (property_id, order_sequence);
    END IF;
END $$;
