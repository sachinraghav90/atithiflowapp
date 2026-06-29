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
    s.id,
    UPPER(TRIM(r.name)) = 'SUPER_ADMIN',
    UPPER(TRIM(r.name)) = 'SUPER_ADMIN',
    UPPER(TRIM(r.name)) = 'SUPER_ADMIN',
    UPPER(TRIM(r.name)) = 'SUPER_ADMIN'
FROM public.roles r
CROSS JOIN public.sidebar_links s
ON CONFLICT (role_id, sidebar_link_id) DO NOTHING;