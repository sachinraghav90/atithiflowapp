create table
    if not exists public.sidebar_links (
        id bigserial primary key,
        link_name varchar(100) not null,
        endpoint varchar(200) not null,
        parent_id bigint,
        sort_order integer default 0,
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_sidebar_parent foreign key (parent_id) references public.sidebar_links (id) on delete cascade,
        constraint fk_created_by_user foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_updated_by_user foreign key (updated_by) references public.users (id) on delete set null
    );

create index if not exists idx_sidebar_links_active on public.sidebar_links (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sidebar_links_endpoint_ci ON public.sidebar_links (LOWER(endpoint));