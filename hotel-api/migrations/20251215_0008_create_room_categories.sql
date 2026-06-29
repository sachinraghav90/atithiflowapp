CREATE TABLE
    if not exists room_categories (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        created_by UUID,
        updated_by UUID,
        CONSTRAINT uq_room_categories_name UNIQUE (name),
        CONSTRAINT fk_room_categories_created_by FOREIGN KEY (created_by) REFERENCES public.users (id),
        CONSTRAINT fk_room_categories_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id)
    );