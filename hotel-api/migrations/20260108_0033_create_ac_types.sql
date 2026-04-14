CREATE TABLE
    if not exists ac_types (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        created_by UUID,
        updated_by UUID,
        CONSTRAINT uq_ac_types_name UNIQUE (name),
        CONSTRAINT fk_ac_types_created_by FOREIGN KEY (created_by) REFERENCES public.users (id),
        CONSTRAINT fk_ac_types_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id)
    );