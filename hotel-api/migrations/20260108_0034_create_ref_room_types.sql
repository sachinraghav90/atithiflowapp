CREATE TABLE
    IF NOT EXISTS ref_room_types (
        id BIGSERIAL PRIMARY KEY,
        room_category_name VARCHAR(50) NOT NULL,
        bed_type_name VARCHAR(50) NOT NULL,
        ac_type_name VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        created_by UUID,
        updated_by UUID,
        CONSTRAINT uq_room_type_combination UNIQUE (room_category_name, bed_type_name, ac_type_name),
        CONSTRAINT fk_room_type_rates_created_by FOREIGN KEY (created_by) REFERENCES public.users (id),
        CONSTRAINT fk_room_type_rates_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id)
    );