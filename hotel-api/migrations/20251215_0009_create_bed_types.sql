CREATE TABLE
    if not exists bed_types (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        created_by UUID,
        updated_by UUID,
        CONSTRAINT uq_bed_types_name UNIQUE (name),
        CONSTRAINT fk_bed_types_created_by FOREIGN KEY (created_by) REFERENCES public.users (id),
        CONSTRAINT fk_bed_types_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id)
    );