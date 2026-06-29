-- Migration: 20260514_0103_enhance_laundry_orders_schema.sql
-- Description: Adds missing financial and guest context fields to laundry_orders

-- 1. Add fields to laundry_orders
ALTER TABLE public.laundry_orders 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_mobile VARCHAR(20);

-- 2. Add notes to laundry_order_items
ALTER TABLE public.laundry_order_items
ADD COLUMN IF NOT EXISTS notes TEXT;
