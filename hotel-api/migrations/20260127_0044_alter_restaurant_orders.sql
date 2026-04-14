ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS guest_name varchar(255),
ADD COLUMN IF NOT EXISTS guest_mobile varchar(20),
ADD COLUMN IF NOT EXISTS order_type varchar(20);

ALTER TABLE public.restaurant_orders
DROP COLUMN IF EXISTS guest_id;