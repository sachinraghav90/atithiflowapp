create extension if not exists "pgcrypto";

create table
    if not exists public.properties (
        id bigserial primary key,
        brand_name varchar(150) not null,
        address_line_1 varchar(200),
        address_line_2 varchar(200),
        city varchar(100),
        state varchar(100),
        postal_code varchar(20),
        country varchar(100),
        checkin_time time,
        checkout_time time,
        is_active boolean default true,
        owner_user_id uuid null,
        created_by uuid,
        created_on timestamp with time zone default now (),
        updated_by uuid,
        updated_on timestamp with time zone,
        room_tax_rate numeric(7, 2) default 0,
        gst numeric(7, 2) default 0,
        restaurant_gst numeric(7, 2) default 0,
        laundry_gst numeric(7, 2) default 0,
        serial_number varchar(50),
        room_number_prefix varchar(20),
        total_floors integer,
        phone varchar(20),
        phone2 varchar(20),
        email varchar(150),
        total_rooms integer,
        year_opened smallint,
        is_pet_friendly boolean default false,
        smoking_policy text,
        cancellation_policy text,
        booking_instructions text,
        image bytea,
        image_mime varchar(100),
        gst_no varchar(50),
        location_link text,
        status varchar(155) default 'OWNED',
        bank_accounts varchar(155) default null,
        logo bytea,
        logo_mime varchar(100),
        address_line_1_office varchar(255),
        address_line_2_office varchar(255),
        city_office varchar(100),
        state_office varchar(100),
        postal_code_office varchar(20),
        country_office varchar(100),
        phone_office varchar(20),
        phone2_office varchar(20),
        email_office varchar(150),
        restaurant_tables integer default 0 check (restaurant_tables >= 0)
    );

create index if not exists idx_properties_city on public.properties (city);

create index if not exists idx_properties_is_active on public.properties (is_active);

create index if not exists idx_properties_owner on public.properties (owner_user_id);