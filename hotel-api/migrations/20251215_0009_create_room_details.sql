create table
    if not exists public.room_details (
        id bigserial primary key,
        booking_id bigint not null,
        room_type varchar(100),
        ref_room_no varchar(20),
        ref_room_id bigint not null,
        description text,
        package_id bigint,
        room_status varchar(50),
        is_active boolean default true,
        created_by uuid,
        created_on timestamptz default now (),
        updated_by uuid,
        updated_on timestamptz,
        constraint fk_room_booking foreign key (booking_id) references public.bookings (id) on delete cascade,
        constraint fk_room_package foreign key (package_id) references public.packages (id) on delete set null,
        constraint fk_room_created_by foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_room_updated_by foreign key (updated_by) references public.users (id) on delete set null,
        constraint fk_room_ref_room foreign key (ref_room_id) references public.ref_rooms (id) on delete cascade
    );

create index if not exists idx_room_details_booking_id on public.room_details (booking_id);

-- create index if not exists idx_room_details_room_no on public.room_details (room_no);
create index if not exists idx_room_details_room_status on public.room_details (ref_room_id, room_status);

-- create index if not exists idx_room_details_is_active on public.room_details (is_active);
CREATE INDEX IF NOT EXISTS idx_room_booking_overlap ON public.room_details (ref_room_id) WHERE room_status IN ('BOOKED', 'CHECKED_IN');