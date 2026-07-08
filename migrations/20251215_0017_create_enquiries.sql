create table
    if not exists public.enquiries (
        id bigserial primary key,
        property_id bigint not null,
        booking_id bigint,
        guest_name varchar(150) not null,
        mobile varchar(20),
        email varchar(150),
        source varchar(100),
        enquiry_type varchar(50),
        status varchar(50) default 'open',
        agent_name varchar(150),
        room_type varchar(100),
        no_of_rooms integer,
        check_in date,
        check_out date,
        booked_by varchar(150),
        comment text,
        follow_up_date timestamptz,
        quote_amount numeric(10, 2),
        is_reserved boolean default false,
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_enquiries_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_enquiries_booking foreign key (booking_id) references public.bookings (id) on delete set null,
        constraint fk_enquiries_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_enquiries_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_no_of_rooms check (
            no_of_rooms is null
            or no_of_rooms >= 0
        ),
        constraint chk_quote_amount check (
            quote_amount is null
            or quote_amount >= 0
        )
    );

create index if not exists idx_enquiries_property_status on public.enquiries (property_id, status);

CREATE INDEX IF NOT EXISTS idx_enquiries_property_created ON public.enquiries (property_id, created_on DESC);

CREATE INDEX IF NOT EXISTS idx_enquiries_follow_up ON public.enquiries (follow_up_date)
WHERE
    follow_up_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enquiries_property_active_created ON public.enquiries (property_id, is_active, created_on DESC);

alter table public.enquiries
add column if not exists agent_type varchar(255),
add column if not exists contact_method varchar(255),
add column if not exists city varchar(255),
add column if not exists nationality varchar(255),
add column if not exists plan varchar(255),
add column if not exists total_members varchar(255),
add column if not exists senior_citizens varchar(255),
add column if not exists child varchar(255),
add column if not exists specially_abled varchar(255),
add column if not exists offer_amount varchar(255);