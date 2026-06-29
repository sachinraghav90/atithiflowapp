CREATE TABLE IF NOT EXISTS public.enquiry_room_details (
    id BIGSERIAL PRIMARY KEY,
    enquiry_id BIGINT NOT NULL,
    room_type VARCHAR(255) NOT NULL,
    no_of_rooms INTEGER NOT NULL DEFAULT 1,

    created_on timestamptz DEFAULT now(),

    CONSTRAINT fk_enquiry_room_details_enquiry
        FOREIGN KEY (enquiry_id)
        REFERENCES public.enquiries(id)
        ON DELETE CASCADE
);
