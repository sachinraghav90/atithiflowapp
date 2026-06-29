create table
    if not exists public.role_sidebar_links (
        role_id bigint not null,
        sidebar_link_id bigint not null,
        can_read boolean default false,
        can_create boolean default false,
        can_update boolean default false,
        can_delete boolean default false,
        created_on timestamptz default now (),
        constraint pk_role_sidebar_links primary key (role_id, sidebar_link_id),
        constraint fk_rsl_role foreign key (role_id) references public.roles (id) on delete cascade,
        constraint fk_rsl_sidebar foreign key (sidebar_link_id) references public.sidebar_links (id) on delete cascade
    );