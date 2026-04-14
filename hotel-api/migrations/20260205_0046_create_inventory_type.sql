CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE
    IF NOT EXISTS public.inventory_types (
        id BIGSERIAL PRIMARY KEY,
        type CITEXT NOT NULL UNIQUE,
        created_on TIMESTAMPTZ DEFAULT now ()
    );