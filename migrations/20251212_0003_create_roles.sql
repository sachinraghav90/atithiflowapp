create table if not exists public.roles (
  id bigserial primary key,
  name varchar(100) not null unique,
  created_on timestamptz default now(),
  updated_on timestamptz
);

create unique index if not exists ux_roles_name on public.roles (lower(name));
