create table
    if not exists public.ref_rooms (
        id bigserial primary key,
        room_type varchar(100) not null,
        room_no varchar(20) not null,
        property_id bigint not null,
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_ref_rooms_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_ref_rooms_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_ref_rooms_updated_by foreign key (updated_by) references public.users (id) on delete set null
    );

create unique index if not exists ux_ref_rooms_property_room_no on public.ref_rooms (property_id, lower(room_no));

create index if not exists idx_ref_rooms_property_active on public.ref_rooms (property_id, is_active);