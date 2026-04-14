create table
    if not exists public.guests (
        id bigserial primary key,
        booking_id bigint not null,
        property_id bigint not null,
        salutation varchar(20),
        first_name varchar(100) not null,
        middle_name varchar(100),
        last_name varchar(100) not null,
        gender varchar(20),
        dob date,
        age integer,
        have_vehicle boolean default false,
        address text,
        phone varchar(20),
        email varchar(150),
        guest_type varchar(50),
        nationality varchar(100),
        id_type varchar(50),
        id_number varchar(100),
        id_proof bytea,
        id_proof_mime varchar(100),
        emergency_contact varchar(20),
        emergency_contact_name varchar(150),
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_guests_booking foreign key (booking_id) references public.bookings (id) on delete cascade,
        constraint fk_guests_property foreign key (property_id) references public.properties (id) on delete cascade,
        constraint fk_guests_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_guests_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_guest_age check (
            age is null
            or age >= 0
        )
    );