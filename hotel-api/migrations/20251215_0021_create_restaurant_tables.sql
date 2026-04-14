create table
    if not exists public.restaurant_tables (
        id bigserial primary key,
        property_id bigint not null,
        table_no varchar(10) not null,
        capacity integer not null default 1,
        location varchar(50),
        status varchar(20) default 'Available',
        min_order_amount numeric(10, 2) default 0,
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_rest_tables_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_rest_tables_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_rest_tables_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_rest_tables_capacity check (capacity > 0),
        constraint chk_rest_tables_min_amount check (min_order_amount >= 0)
    );