ALTER TABLE ref_rooms
add column if not exists floor_number integer not null default 0;
