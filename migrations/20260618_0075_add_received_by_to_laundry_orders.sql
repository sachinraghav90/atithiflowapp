ALTER TABLE public.laundry_orders
ADD COLUMN IF NOT EXISTS staff_received_by VARCHAR(255);

ALTER TABLE public.laundry_orders
ADD COLUMN IF NOT EXISTS guest_received_by VARCHAR(255);
