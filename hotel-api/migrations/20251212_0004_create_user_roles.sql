-- create table if not exists public.user_roles (
--   user_id uuid not null,
--   role_id bigint not null,

--   assigned_on timestamptz default now(),

--   constraint fk_user foreign key (user_id) references public.users(id) on delete cascade,
--   constraint fk_role foreign key (role_id) references public.roles(id) on delete cascade,

--   constraint pk_user_roles primary key (user_id, role_id)
-- );

-- create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
-- create index if not exists idx_user_roles_role_id on public.user_roles (role_id);
