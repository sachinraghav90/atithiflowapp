CREATE TABLE
    IF NOT EXISTS public.addresses (
        id BIGSERIAL PRIMARY KEY,
        -- Polymorphic association
        entity_type VARCHAR(50) NOT NULL, -- PROPERTY | STAFF | GUEST
        entity_id BIGINT NOT NULL,
        -- Address type
        address_type VARCHAR(50) NOT NULL, -- PROPERTY | OFFICE | HOME | PERMANENT | TEMPORARY
        -- Address fields
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        is_primary BOOLEAN DEFAULT FALSE,
        created_by UUID,
        created_on TIMESTAMPTZ DEFAULT now (),
        updated_by UUID,
        updated_on TIMESTAMPTZ,
        constraint fk_created_by_user foreign key (created_by) references public.users (id) on delete set null,
        constraint fk_updated_by_user foreign key (updated_by) references public.users (id) on delete set null
    );

CREATE INDEX IF NOT EXISTS idx_addresses_entity ON public.addresses (entity_type, entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_primary_address ON public.addresses (entity_type, entity_id, address_type);

CREATE INDEX IF NOT EXISTS idx_addresses_type ON public.addresses (address_type);