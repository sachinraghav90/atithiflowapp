create table
    if not exists public.ref_laundry (
        id bigserial primary key,
        item_name varchar(255) not null,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_ref_laundry_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_ref_laundry_updated_by foreign key (updated_by) references public.users (id) on delete set null
    );

create unique index if not exists uq_ref_laundry_item_name on public.ref_laundry (item_name);