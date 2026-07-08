create table
    if not exists public.packages (
        id bigserial primary key,
        property_id bigint not null,
        package_name varchar(150) not null,
        description text,
        base_price numeric(10, 2) default 0,
        is_active boolean default true,
        created_on timestamptz default now (),
        updated_on timestamptz,
        created_by uuid,
        updated_by uuid,
        constraint fk_booking_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_booking_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint fk_packages_property foreign key (property_id) references public.properties (id) on delete cascade
    );

create unique index if not exists ux_packages_property_name on public.packages (property_id, lower(package_name));

create index if not exists idx_packages_property_id on public.packages (property_id);

create index if not exists idx_packages_is_active on public.packages (is_active);