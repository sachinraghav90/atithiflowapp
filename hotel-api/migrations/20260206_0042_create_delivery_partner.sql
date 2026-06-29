CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id BIGSERIAL PRIMARY KEY,

    property_id BIGINT NOT NULL
        REFERENCES public.properties(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

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
    updated_on TIMESTAMPTZ,

    CONSTRAINT delivery_partners_unique
        UNIQUE (property_id, name)
);

ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS delivery_partner_id BIGINT
REFERENCES public.delivery_partners(id)
ON UPDATE CASCADE
ON DELETE SET NULL;

alter table public.delivery_partners
add column if not exists is_active boolean default true;

