DROP TRIGGER IF EXISTS trg_backfill_role_sidebar_links ON public.sidebar_links;

DROP FUNCTION IF EXISTS public.backfill_role_sidebar_links_for_new_sidebar_link;

CREATE OR REPLACE FUNCTION public.backfill_role_sidebar_links_for_new_sidebar_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

    INSERT INTO public.role_sidebar_links (
        role_id,
        sidebar_link_id,
        can_read,
        can_create,
        can_update,
        can_delete
    )
    SELECT
        r.id,
        NEW.id,
        UPPER(r.name) = 'SUPER_ADMIN',
        UPPER(r.name) = 'SUPER_ADMIN',
        UPPER(r.name) = 'SUPER_ADMIN',
        UPPER(r.name) = 'SUPER_ADMIN'
    FROM public.roles r
    ON CONFLICT (role_id, sidebar_link_id) DO NOTHING;

    RETURN NEW;

END;
$$;

CREATE TRIGGER trg_backfill_role_sidebar_links
AFTER INSERT ON public.sidebar_links
FOR EACH ROW
EXECUTE FUNCTION public.backfill_role_sidebar_links_for_new_sidebar_link();