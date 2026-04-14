create extension if not exists "pgcrypto";

create table
    if not exists public.properties (
        id bigserial primary key,
        brand_name varchar(150) not null,
        address_line_1 varchar(200) not null,
        address_line_2 varchar(200),
        city varchar(100) not null,
        state varchar(100) not null,
        postal_code varchar(20),
        country char(100),
        checkin_time time,
        checkout_time time,
        is_active boolean default true,
        owner_user_id uuid null,
        created_by uuid,
        created_on timestamp
        with
            time zone default now (),
            updated_by uuid,
            updated_on timestamp
        with
            time zone,
            room_tax_rate numeric(7, 2) default 0,
            gst numeric(7, 2) default 0,
            serial_number varchar(50),
            total_floors integer,
            phone varchar(20),
            phone2 varchar(20),
            email varchar(150),
            total_rooms integer,
            year_opened smallint,
            is_pet_friendly boolean default false,
            smoking_policy text,
            cancellation_policy text,
            image bytea,
            image_mime varchar(100)
            -- constraint chk_country_len check (
            --     country is null
            --     or length (country) = 2
            -- )
    );

create index if not exists idx_properties_city on public.properties (city);

create index if not exists idx_properties_is_active on public.properties (is_active);

create index if not exists idx_properties_owner on public.properties (owner_user_id);