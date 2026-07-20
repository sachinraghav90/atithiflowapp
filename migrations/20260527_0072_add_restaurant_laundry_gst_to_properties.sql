-- Migration: 20260527_0066_add_restaurant_laundry_gst_to_properties.sql
-- Description: Add configurable GST columns to properties and detailed tax columns to restaurant_orders and laundry_orders

-- 1. Add restaurant_gst and laundry_gst to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS restaurant_gst numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS laundry_gst numeric(7,2) DEFAULT 0;

-- 2. Add tax columns to restaurant_orders table
ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS subtotal_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_rate numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_rate numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_rate numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total_amount numeric(10,2) DEFAULT 0;

-- 3. Add tax columns to laundry_orders table
ALTER TABLE public.laundry_orders
ADD COLUMN IF NOT EXISTS subtotal_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_rate numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_rate numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_rate numeric(7,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total_amount numeric(10,2) DEFAULT 0;
