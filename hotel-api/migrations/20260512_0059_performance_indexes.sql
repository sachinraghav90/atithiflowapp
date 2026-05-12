-- Migration: Add missing performance indexes to stabilize dashboard and login
-- This addresses the high latency (1.3s+) seen in laundry and booking queries

-- 1. Laundry Orders: Index on property_id and created_on for fast dashboard loading
CREATE INDEX IF NOT EXISTS idx_laundry_orders_property_created ON public.laundry_orders (property_id, created_on DESC);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_property_status ON public.laundry_orders (property_id, laundry_status);

-- 2. Kitchen Inventory: Index on property_id for fast stock lookups
CREATE INDEX IF NOT EXISTS idx_kitchen_inventory_property ON public.kitchen_inventory (property_id);

-- 3. Bookings: Composite index for status-based filtering by property
CREATE INDEX IF NOT EXISTS idx_bookings_property_status ON public.bookings (property_id, booking_status);

-- 4. Audit Logs: Index on property_id and table for history side-sheets
CREATE INDEX IF NOT EXISTS idx_audits_property_table_event ON public.audits (property_id, table_name, event_id);

-- 5. Enquiry Room Details: Index on enquiry_id for fast joins
CREATE INDEX IF NOT EXISTS idx_enquiry_room_details_enquiry ON public.enquiry_room_details (enquiry_id);
