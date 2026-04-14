ALTER TABLE public.menu_master
DROP COLUMN IF EXISTS category;

ALTER TABLE public.menu_master
ADD COLUMN IF NOT EXISTS menu_item_group_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'menu_master_group_fk'
    ) THEN
        ALTER TABLE public.menu_master
        ADD CONSTRAINT menu_master_group_fk
        FOREIGN KEY (menu_item_group_id)
        REFERENCES public.menu_item_groups(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
    END IF;
END $$;
