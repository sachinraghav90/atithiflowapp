create table
    if not exists public.audits (
        id bigserial primary key,
        property_id bigint not null,
        event_id bigint not null,
        table_name varchar(100) not null,
        event_type varchar(50) not null,
        task_name varchar(150),
        comments text,
        details text,
        user_id uuid,
        created_on timestamptz default now (),
        updated_on timestamptz,
        constraint fk_audits_user foreign key (user_id) references public.users (id) on delete set null,
        constraint fk_audits_property foreign key (property_id) references public.properties (id) on delete cascade
    );

create index if not exists idx_audits_event_id on public.audits (event_id);

create index if not exists idx_audits_table_name on public.audits (table_name);

create index if not exists idx_audits_event_type on public.audits (event_type);

create index if not exists idx_audits_user_id on public.audits (user_id);

create index if not exists idx_audits_created_on on public.audits (created_on);