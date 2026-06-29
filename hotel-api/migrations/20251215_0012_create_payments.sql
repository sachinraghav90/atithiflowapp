create table
    if not exists public.payments (
        id bigserial primary key,
        booking_id bigint not null,
        property_id bigint not null,
        payment_date timestamptz,
        paid_amount numeric(10, 2) not null,
        payment_method varchar(50),
        payment_type varchar(50),
        payment_status varchar(50),
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_payments_booking foreign key (booking_id) references public.bookings (id) on delete cascade,
        constraint fk_payments_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_payments_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_payments_updated_by foreign key (updated_by) references public.users (id) on delete set null
        -- constraint chk_paid_amount check (paid_amount >= 0)
    );

alter table public.payments
add column if not exists transaction_id varchar(255),
add column if not exists bank_name varchar(255),
add column if not exists comments text;

alter table public.payments
alter column booking_id drop not null;