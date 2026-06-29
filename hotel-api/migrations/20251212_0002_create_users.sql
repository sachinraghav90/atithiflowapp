create extension if not exists "pgcrypto";

create table
    if not exists public.users (
        id uuid primary key references auth.users (id) on delete cascade,
        property_id bigint,
        -- user_name varchar(100) not null,
        -- password varchar(255) not null,  -- using supabase auth
        email varchar(150) not null,
        staff_id varchar(50),
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint users_email_unique unique (email),
        constraint fk_property foreign key (property_id) references public.properties (id) on delete restrict,
        constraint fk_created_by_user foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_updated_by_user foreign key (updated_by) references public.users (id) on delete set null
    );

create index if not exists idx_users_is_active on public.users (is_active);
create index if not exists idx_users_property_id on public.users(property_id);