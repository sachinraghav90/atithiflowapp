ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS property_limit integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'users' AND constraint_name = 'chk_users_property_limit_non_negative'
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT chk_users_property_limit_non_negative
        CHECK (property_limit IS NULL OR property_limit >= 0);
    END IF;
END $$;
