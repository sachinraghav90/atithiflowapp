CREATE TABLE
    IF NOT EXISTS public.visa_details (
        id BIGSERIAL PRIMARY KEY,
        visa_number VARCHAR(50) NOT NULL,
        issued_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        staff_id BIGINT NULL,
        guest_id BIGINT NULL,
        CONSTRAINT chk_visa_dates CHECK (expiry_date >= issued_date),
        CONSTRAINT fk_visa_staff FOREIGN KEY (staff_id) REFERENCES public.staff (id) ON DELETE SET NULL,
        CONSTRAINT fk_visa_guest FOREIGN KEY (guest_id) REFERENCES public.guests (id) ON DELETE SET NULL
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_visa_guest_id ON public.visa_details (guest_id)
WHERE
    guest_id IS NOT NULL;