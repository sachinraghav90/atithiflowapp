create table
    if not exists public.property_floors (
        id bigserial primary key,
        property_id integer not null,
        floor_number integer not null,
        rooms_count integer not null,
        created_at timestamptz default now (),
        updated_at timestamptz default now (),
        created_by uuid,
        updated_by uuid,
        constraint fk_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint unique_property_floor unique (property_id, floor_number),
        constraint fk_created_by_user foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_updated_by_user foreign key (updated_by) references public.users (id) on delete set null
    );