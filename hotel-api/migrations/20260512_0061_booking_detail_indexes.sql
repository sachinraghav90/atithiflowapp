-- Migration: Add indexes for booking details lookup
-- This speeds up the GET /bookings/:id call which was taking 1.3s+

-- 1. Index on room_details for faster room lookups per booking
CREATE INDEX IF NOT EXISTS idx_room_details_booking_id ON public.room_details (booking_id);

-- 2. Index on guests for faster guest lookups per booking
CREATE INDEX IF NOT EXISTS idx_guests_booking_id ON public.guests (booking_id);

-- 3. Index on payments for faster payment history per booking
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);

-- 4. Index on laundry_orders for faster laundry history per booking
CREATE INDEX IF NOT EXISTS idx_laundry_orders_booking_id ON public.laundry_orders (booking_id);
