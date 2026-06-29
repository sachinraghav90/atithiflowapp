CREATE TABLE IF NOT EXISTS public.kitchen_inventory (
    id BIGSERIAL PRIMARY KEY,

    property_id BIGINT NOT NULL
        REFERENCES public.properties(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    inventory_master_id BIGINT NOT NULL
        REFERENCES public.inventory_master(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    quantity NUMERIC(12,2) DEFAULT 0,
    -- unit CITEXT,

    created_by UUID
        REFERENCES public.users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    updated_by UUID
        REFERENCES public.users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    created_on TIMESTAMPTZ DEFAULT now(),
    updated_on TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT kitchen_inventory_unique
        UNIQUE (property_id, inventory_master_id)
);
