ALTER TABLE public.laundry_order_items
ADD COLUMN IF NOT EXISTS room_no VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_loi_order_room_no
ON public.laundry_order_items(order_id, room_no);
