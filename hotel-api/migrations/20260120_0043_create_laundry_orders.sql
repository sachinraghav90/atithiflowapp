-- create table
--     if not exists public.laundry_orders (
--         id bigserial primary key,
--         room_id bigint,
--         booking_id bigint,
--         property_id bigint not null,
--         laundry_id bigint,
--         item_name varchar(255),
--         vendor_id bigint,
--         laundry_type varchar(50),
--         description text,
--         item_count integer default 0,
--         item_rate numeric(10, 2) default 0,
--         amount numeric(10, 2) default 0,
--         laundry_status varchar(50),
--         status varchar(50) default 'active',
--         pickup_date timestamptz,
--         delivery_date timestamptz,
--         created_by uuid,
--         created_on timestamptz default now (),
--         updated_by uuid,
--         updated_on timestamptz,
--         -- constraint fk_laundry_room foreign key (room_id) references public.ref_rooms (id) on delete set null,
--         constraint fk_laundry_booking foreign key (booking_id) references public.bookings (id) on delete cascade,
--         constraint fk_laundry_property foreign key (property_id) references public.properties (id) on delete cascade,
--         constraint fk_laundry_created_by foreign key (created_by) references public.users (id) on delete set null,
--         constraint fk_laundry_updated_by foreign key (updated_by) references public.users (id) on delete set null,
--         constraint fk_laundry_order_laundry foreign key (laundry_id) references public.laundry (id) on delete set null,
--         constraint chk_item_count check (
--             item_count is null
--             or item_count >= 0
--         ),
--         constraint chk_amount check (
--             amount is null
--             or amount >= 0
--         )
--     );

-- ALTER TABLE public.laundry_orders
-- DROP CONSTRAINT IF EXISTS fk_laundry_room;

CREATE TABLE IF NOT EXISTS public.laundry_orders (
    id BIGSERIAL PRIMARY KEY,

    booking_id BIGINT,
    property_id BIGINT NOT NULL,
    vendor_id BIGINT,

    laundry_type VARCHAR(50),
    description TEXT,

    laundry_status VARCHAR(50),
    vendor_status varchar(50),
    status VARCHAR(50) DEFAULT 'active',

    pickup_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,

    created_by UUID,
    created_on TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    updated_on TIMESTAMPTZ,

    CONSTRAINT fk_laundry_booking
        FOREIGN KEY (booking_id)
        REFERENCES public.bookings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_laundry_property
        FOREIGN KEY (property_id)
        REFERENCES public.properties(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_laundry_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_laundry_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);
