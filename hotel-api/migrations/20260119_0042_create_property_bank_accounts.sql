CREATE TABLE
    IF NOT EXISTS public.property_bank_accounts (
        id BIGSERIAL PRIMARY KEY,
        property_id BIGINT NOT NULL,
        account_holder_name VARCHAR(150) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        ifsc_code VARCHAR(20) NOT NULL,
        bank_name VARCHAR(150) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW (),
        updated_at TIMESTAMPTZ DEFAULT NOW (),
        created_by UUID,
        updated_by UUID,
        CONSTRAINT fk_property_bank_accounts_property FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE,
        CONSTRAINT fk_property_bank_accounts_created_by FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL,
        CONSTRAINT fk_property_bank_accounts_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE SET NULL
    );