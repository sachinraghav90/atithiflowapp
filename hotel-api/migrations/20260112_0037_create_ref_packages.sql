CREATE TABLE
    IF NOT EXISTS public.ref_packages (
        id BIGSERIAL PRIMARY KEY,
        package_name VARCHAR(150) NOT NULL,
        description TEXT,
        created_on TIMESTAMPTZ DEFAULT now (),
        updated_on TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        CONSTRAINT fk_ref_packages_created_by FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL,
        CONSTRAINT fk_ref_packages_updated_by FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE SET NULL
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_ref_packages_package_name_ci ON public.ref_packages (LOWER(package_name));