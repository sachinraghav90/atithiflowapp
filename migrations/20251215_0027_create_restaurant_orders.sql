create table
    if not exists public.restaurant_orders (
        id bigserial primary key,
        property_id bigint not null,
        table_no varchar(10),
        guest_id bigint,
        room_id bigint,
        booking_id bigint,
        order_date timestamptz default now (),
        total_amount numeric(10, 2) default 0,
        order_status varchar(20) default 'New',
        payment_status varchar(20) default 'Pending',
        waiter_staff_id bigint,
        expected_delivery_time timestamptz,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_rest_orders_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_rest_orders_guest foreign key (guest_id) references public.guests (id) on delete set null,
        constraint fk_rest_orders_room foreign key (room_id) references public.ref_rooms (id) on delete set null,
        constraint fk_rest_orders_booking foreign key (booking_id) references public.bookings (id) on delete set null,
        constraint fk_rest_orders_waiter foreign key (waiter_staff_id) references public.staff (id) on delete set null,
        constraint fk_rest_orders_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_rest_orders_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_rest_order_amount check (
            total_amount is null
            or total_amount >= 0
        )
    );