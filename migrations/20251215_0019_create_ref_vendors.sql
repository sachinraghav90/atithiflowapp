create table
    if not exists public.ref_vendors (
        id bigserial primary key,
        property_id bigint not null,
        name varchar(150) not null,
        pan_no varchar(20),
        gst_no varchar(20),
        address text,
        contact_no varchar(20),
        email_id varchar(150),
        vendor_type varchar(50),
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_ref_vendors_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_ref_vendors_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_ref_vendors_updated_by foreign key (updated_by) references public.users (id) on delete set null
    );