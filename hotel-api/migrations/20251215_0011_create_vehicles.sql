create table
    if not exists public.vehicles (
        id bigserial primary key,
        booking_id bigint not null,
        property_id bigint not null,
        vehicle_type varchar(50),
        vehicle_name varchar(100),
        vehicle_number varchar(20),
        room_no varchar(20),
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_vehicles_booking foreign key (booking_id) references public.bookings (id) on delete cascade,
        constraint fk_vehicles_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_vehicles_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_vehicles_updated_by foreign key (updated_by) references public.users (id) on delete set null
    );

create index if not exists idx_vehicles_property on public.vehicles (property_id);

create index if not exists idx_vehicles_booking_id on public.vehicles (booking_id);

create index if not exists idx_vehicles_vehicle_number on public.vehicles (vehicle_number);

alter table public.vehicles
add column if not exists color varchar(255);