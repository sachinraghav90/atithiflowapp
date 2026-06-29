ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS system_generated boolean default false;