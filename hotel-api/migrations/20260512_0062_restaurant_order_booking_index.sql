-- Migration: Add index for restaurant orders booking lookup
-- This optimizes the "Restaurant Orders" tab in the Booking details side-sheet

CREATE INDEX IF NOT EXISTS idx_restaurant_orders_booking_id ON public.restaurant_orders(booking_id);
