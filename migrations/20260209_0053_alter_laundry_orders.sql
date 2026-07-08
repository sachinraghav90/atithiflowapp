alter table public.laundry_orders
add column if not exists vendor_status varchar(50),
add column if not exists comments text,
add column if not exists room_no varchar(50);
