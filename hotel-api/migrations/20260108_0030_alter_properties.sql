ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS gst_no varchar(50),
ADD COLUMN IF NOT EXISTS location_link text,
ADD COLUMN IF NOT EXISTS status varchar(155) DEFAULT 'OWNED',
ADD COLUMN IF NOT EXISTS bank_accounts varchar(155) DEFAULT null,
-- Office logo
ADD COLUMN IF NOT EXISTS logo bytea,
ADD COLUMN IF NOT EXISTS logo_mime varchar(100),
-- Office address
ADD COLUMN IF NOT EXISTS address_line_1_office varchar(255),
ADD COLUMN IF NOT EXISTS address_line_2_office varchar(255),
ADD COLUMN IF NOT EXISTS city_office varchar(100),
ADD COLUMN IF NOT EXISTS state_office varchar(100),
ADD COLUMN IF NOT EXISTS postal_code_office varchar(20),
ADD COLUMN IF NOT EXISTS country_office varchar(100),
-- Office contact
ADD COLUMN IF NOT EXISTS phone_office varchar(20),
ADD COLUMN IF NOT EXISTS phone2_office varchar(20),
ADD COLUMN IF NOT EXISTS email_office varchar(150),
ADD COLUMN IF NOT EXISTS restaurant_tables integer default 0 CHECK (restaurant_tables >= 0);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'properties'
          AND column_name = 'country'
          AND data_type = 'character'
    ) THEN
        ALTER TABLE public.properties
        ALTER COLUMN country TYPE varchar(100);
    END IF;
END $$;

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS chk_country_len;

ALTER TABLE public.properties
ALTER COLUMN address_line_1 DROP NOT NULL;

ALTER TABLE public.properties
ALTER COLUMN city DROP NOT NULL;

ALTER TABLE public.properties
ALTER COLUMN state DROP NOT NULL;
