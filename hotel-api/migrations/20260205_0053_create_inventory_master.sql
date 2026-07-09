CREATE TABLE IF NOT EXISTS public.inventory_master (
    id BIGSERIAL PRIMARY KEY,

    property_id BIGINT NOT NULL
        REFERENCES public.properties(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    inventory_type_id BIGINT NOT NULL
        REFERENCES public.inventory_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    use_type CITEXT NOT NULL,
    name CITEXT NOT NULL,

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

    CONSTRAINT inventory_master_unique
        UNIQUE (property_id, inventory_type_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_master_property_type
ON public.inventory_master(property_id, inventory_type_id);

ALTER TABLE public.inventory_master
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unit varchar(50);
