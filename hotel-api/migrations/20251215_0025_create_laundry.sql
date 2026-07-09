CREATE EXTENSION IF NOT EXISTS citext;

create table
    if not exists public.laundry (
        id bigserial primary key,
        property_id bigint not null,
        item_name varchar(150) not null,
        description text,
        item_rate numeric(10, 2) default 0,
        system_generated boolean default false,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_laundry_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_laundry_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_laundry_updated_by foreign key (updated_by) references public.users (id) on delete set null
    );

create unique index if not exists uq_laundry_property_item on public.laundry (property_id, item_name);

ALTER TABLE public.laundry
ALTER COLUMN item_name TYPE citext;

ALTER TABLE public.laundry
ADD COLUMN IF NOT EXISTS is_active boolean default true;