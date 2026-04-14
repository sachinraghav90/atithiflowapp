CREATE TABLE
    if not exists room_type_rates (
        id BIGSERIAL PRIMARY KEY,
        property_id BIGINT NOT NULL,
        room_category_name VARCHAR(50) NOT NULL,
        bed_type_name VARCHAR(50) NOT NULL,
        ac_type_name VARCHAR(30) NOT NULL,
        base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        created_by UUID,
        updated_by UUID,
        CONSTRAINT fk_room_type_rates_property FOREIGN KEY (property_id) REFERENCES properties (id),
        CONSTRAINT fk_room_type_rates_created_by FOREIGN KEY (created_by) REFERENCES public.users (id),
        CONSTRAINT fk_room_type_rates_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id),
        CONSTRAINT uq_room_type_rates_combination UNIQUE (
            property_id,
            room_category_name,
            bed_type_name,
            ac_type_name
        )
    );