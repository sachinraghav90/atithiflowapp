-- Add booking_shift_comment to enquiries
ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS booking_shift_comment TEXT;
