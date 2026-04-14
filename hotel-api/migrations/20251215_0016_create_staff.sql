create table
    if not exists public.staff (
        id bigserial primary key,
        first_name varchar(100) not null,
        middle_name varchar(100),
        last_name varchar(100) not null,
        address text,
        gender varchar(20),
        marital_status varchar(20),
        employment_type varchar(50),
        email varchar(150),
        phone1 varchar(20),
        phone2 varchar(20),
        emergency_contact varchar(20),
        id_proof_type varchar(50),
        id_number varchar(100),
        id_proof bytea,
        id_proof_mime varchar(100),
        blood_group varchar(10),
        designation varchar(100),
        department varchar(100),
        hire_date date,
        leave_days integer default 0,
        dob date,
        image bytea,
        image_mime varchar(100),
        shift_pattern varchar(50),
        status varchar(50) default 'active',
        user_id uuid not null,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_staff_user foreign key (user_id) references public.users (id) on delete set null,
        constraint fk_staff_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_staff_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint chk_leave_days check (
            leave_days is null
            or leave_days >= 0
        )
    );

create index if not exists idx_staff_user_id on public.staff (user_id);