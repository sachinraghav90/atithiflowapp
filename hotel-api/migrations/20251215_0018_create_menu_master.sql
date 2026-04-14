create table
    if not exists public.menu_master (
        id bigserial primary key,
        property_id bigint not null,
        item_name varchar(100) not null,
        category varchar(50),
        price numeric(10, 2) not null default 0,
        is_active boolean default true,
        is_veg boolean default false,
        description text,
        image bytea,
        image_mime varchar(100),
        prep_time integer,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_menu_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_menu_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_menu_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_menu_price check (price >= 0),
        constraint chk_prep_time check (
            prep_time is null
            or prep_time >= 0
        )
    );