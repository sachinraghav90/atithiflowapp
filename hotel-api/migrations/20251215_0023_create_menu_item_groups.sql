CREATE TABLE IF NOT EXISTS public.menu_item_groups (
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
    updated_on TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT menu_item_groups_unique
        UNIQUE (property_id, name)
);

alter table public.menu_item_groups
add column if not exists is_active boolean default true;