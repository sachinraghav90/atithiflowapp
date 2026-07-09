ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS emergency_contact_relation varchar(50),
ADD COLUMN IF NOT EXISTS emergency_contact_relation_2 varchar(50),
ADD COLUMN IF NOT EXISTS emergency_contact_2 varchar(20),
ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(20),
ADD COLUMN IF NOT EXISTS emergency_contact_name_2 varchar(20),
ADD COLUMN IF NOT EXISTS nationality varchar(20),
ADD COLUMN IF NOT EXISTS country varchar(20),
ADD COLUMN IF NOT EXISTS salutation varchar(20);