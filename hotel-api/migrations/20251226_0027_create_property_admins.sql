-- create table
--     if not exists public.property_admins (
--         id bigserial primary key,
--         property_id bigint not null,
--         user_id uuid not null,
--         role varchar(20) default 'ADMIN',
--         created_at timestamptz default now (),
--         created_by uuid,
--         updated_at timestamptz default now (),
--         updated_by uuid,
--         constraint fk_created_by_user foreign key (created_by) references public.users (id) on delete set null,
--         constraint fk_updated_by_user foreign key (updated_by) references public.users (id) on delete set null,
--         constraint fk_user_id foreign key (user_id) references public.users (id) on delete cascade,
--         constraint fk_property foreign key (property_id) references public.properties (id) on delete cascade
--     );

-- create unique index if not exists uniq_admin_one_property on public.property_admins (user_id);

-- create unique index if not exists uniq_property_admin_pair on property_admins (property_id, user_id);

-- create index if not exists idx_property_admins_property on property_admins (property_id);