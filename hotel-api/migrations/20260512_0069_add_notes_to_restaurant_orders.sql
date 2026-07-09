-- Add notes column to restaurant_orders table
ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS notes TEXT;
