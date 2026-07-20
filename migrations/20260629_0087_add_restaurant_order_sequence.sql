ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS order_sequence integer;

WITH numbered_rows AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY property_id
      ORDER BY id
    ) AS seq
  FROM public.restaurant_orders
)
UPDATE public.restaurant_orders t
SET order_sequence = nr.seq
FROM numbered_rows nr
WHERE t.id = nr.id
  AND t.order_sequence IS NULL;

INSERT INTO public.property_counters (
  property_id,
  counter_name,
  next_value
)
SELECT
  property_id,
  'RESTAURANT_ORDER',
  COALESCE(MAX(order_sequence), 0) + 1
FROM public.restaurant_orders
GROUP BY property_id
ON CONFLICT (property_id, counter_name)
DO UPDATE SET
  next_value = EXCLUDED.next_value,
  updated_on = now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_restaurant_orders_property_order_sequence
ON public.restaurant_orders(property_id, order_sequence);

-- Safe to make NOT NULL since we backfilled all rows above
ALTER TABLE public.restaurant_orders
ALTER COLUMN order_sequence SET NOT NULL;
