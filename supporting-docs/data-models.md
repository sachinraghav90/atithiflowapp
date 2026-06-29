# AtithiFlow Latest Data Model

> WARNING: This schema is for context/documentation only and is not meant to be run directly.
> Table order and constraints may not be valid for execution.

```sql
CREATE TABLE public.properties (
  id bigint NOT NULL DEFAULT nextval('properties_id_seq'::regclass),
  brand_name character varying NOT NULL,
  address_line_1 character varying,
  address_line_2 character varying,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  checkin_time time without time zone,
  checkout_time time without time zone,
  is_active boolean DEFAULT true,
  owner_user_id uuid,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  room_tax_rate numeric DEFAULT 0,
  gst numeric DEFAULT 0,
  restaurant_gst numeric DEFAULT 0,
  laundry_gst numeric DEFAULT 0,
  serial_number character varying,
  room_number_prefix character varying,
  total_floors integer,
  phone character varying,
  phone2 character varying,
  email character varying,
  total_rooms integer,
  year_opened smallint,
  is_pet_friendly boolean DEFAULT false,
  smoking_policy text,
  cancellation_policy text,
  booking_instructions text,
  image bytea,
  image_mime character varying,
  gst_no character varying,
  location_link text,
  status character varying DEFAULT 'OWNED'::character varying,
  bank_accounts character varying DEFAULT NULL::character varying,
  logo bytea,
  logo_mime character varying,
  address_line_1_office character varying,
  address_line_2_office character varying,
  city_office character varying,
  state_office character varying,
  postal_code_office character varying,
  country_office character varying,
  phone_office character varying,
  phone2_office character varying,
  email_office character varying,
  restaurant_tables integer DEFAULT 0 CHECK (restaurant_tables >= 0),
  CONSTRAINT properties_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL,
  property_id bigint,
  email character varying NOT NULL UNIQUE,
  staff_id character varying,
  is_active boolean DEFAULT true,
  property_limit integer CHECK (property_limit IS NULL OR property_limit >= 0),
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.roles (
  id bigint NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.packages (
  id bigint NOT NULL DEFAULT nextval('packages_id_seq'::regclass),
  property_id bigint NOT NULL,
  package_name character varying NOT NULL,
  description text,
  base_price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  system_generated boolean DEFAULT false,
  CONSTRAINT packages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_booking_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_booking_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT fk_packages_property FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

CREATE TABLE public.audits (
  id bigint NOT NULL DEFAULT nextval('audits_id_seq'::regclass),
  property_id bigint NOT NULL,
  event_id bigint NOT NULL,
  table_name character varying NOT NULL,
  event_type character varying NOT NULL,
  task_name character varying,
  comments text,
  details text,
  user_id uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone,
  CONSTRAINT audits_pkey PRIMARY KEY (id),
  CONSTRAINT fk_audits_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_audits_property FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

CREATE TABLE public.bookings (
  id bigint NOT NULL DEFAULT nextval('bookings_id_seq'::regclass),
  property_id bigint NOT NULL,
  booking_sequence integer NOT NULL,
  final_amount numeric DEFAULT 0,
  cancellation_fee numeric DEFAULT 0,
  is_no_show boolean DEFAULT false,
  package_id bigint NOT NULL,
  channel_source character varying,
  booking_nights integer CHECK (booking_nights IS NULL OR booking_nights >= 0),
  estimated_arrival timestamp with time zone,
  estimated_departure timestamp with time zone,
  actual_arrival timestamp with time zone,
  actual_departure timestamp with time zone,
  discount_type character varying,
  discount numeric DEFAULT 0,
  booking_status character varying,
  booking_type character varying,
  booking_date date,
  adult integer DEFAULT 0,
  child integer DEFAULT 0,
  total_guest integer CHECK (total_guest IS NULL OR total_guest >= 0),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  comments text,
  price_before_tax numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  price_after_discount numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  room_tax_amount numeric DEFAULT 0,
  pickup boolean DEFAULT false,
  drop boolean DEFAULT false,
  estimated_arrival_time character varying DEFAULT NULL::character varying,
  guest_image bytea,
  guest_image_mime character varying,
  pickup_time timestamp with time zone,
  pickup_location character varying,
  drop_time timestamp with time zone,
  drop_location character varying,
  early_checkin_amount numeric DEFAULT 0,
  delayed_checkout_amount numeric DEFAULT 0,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT fk_booking_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_booking_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT fk_bookings_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_bookings_package FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT uq_bookings_property_booking_sequence UNIQUE (property_id, booking_sequence)
);

CREATE TABLE public.property_counters (
  id bigint NOT NULL DEFAULT nextval('property_counters_id_seq'::regclass),
  property_id bigint NOT NULL,
  counter_name character varying NOT NULL,
  next_value integer NOT NULL DEFAULT 1,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone DEFAULT now(),
  CONSTRAINT property_counters_pkey PRIMARY KEY (id),
  CONSTRAINT property_counters_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT uq_property_counters UNIQUE (property_id, counter_name)
);

CREATE TABLE public.room_categories (
  id bigint NOT NULL DEFAULT nextval('room_categories_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT room_categories_pkey PRIMARY KEY (id),
  CONSTRAINT fk_room_categories_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_room_categories_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.bed_types (
  id bigint NOT NULL DEFAULT nextval('bed_types_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT bed_types_pkey PRIMARY KEY (id),
  CONSTRAINT fk_bed_types_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_bed_types_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.ac_types (
  id bigint NOT NULL DEFAULT nextval('ac_types_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT ac_types_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ac_types_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_ac_types_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.ref_room_types (
  id bigint NOT NULL DEFAULT nextval('ref_room_types_id_seq'::regclass),
  room_category_name character varying NOT NULL,
  bed_type_name character varying NOT NULL,
  ac_type_name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT ref_room_types_pkey PRIMARY KEY (id),
  CONSTRAINT fk_room_type_rates_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_room_type_rates_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.room_type_rates (
  id bigint NOT NULL DEFAULT nextval('room_type_rates_id_seq'::regclass),
  property_id bigint NOT NULL,
  room_category_name character varying NOT NULL,
  bed_type_name character varying NOT NULL,
  ac_type_name character varying NOT NULL,
  base_price numeric NOT NULL CHECK (base_price >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT room_type_rates_pkey PRIMARY KEY (id),
  CONSTRAINT fk_room_type_rates_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_room_type_rates_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_room_type_rates_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.ref_rooms (
  id bigint NOT NULL DEFAULT nextval('ref_rooms_id_seq'::regclass),
  room_type character varying NOT NULL,
  room_no character varying NOT NULL,
  property_id bigint NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  floor_number integer NOT NULL DEFAULT 0,
  room_type_id bigint,
  dirty boolean DEFAULT false,
  under_maintenance boolean DEFAULT false,
  CONSTRAINT ref_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ref_rooms_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_ref_rooms_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_ref_rooms_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT fk_ref_rooms_room_type_id FOREIGN KEY (room_type_id) REFERENCES public.room_type_rates(id)
);

CREATE TABLE public.room_details (
  id bigint NOT NULL DEFAULT nextval('room_details_id_seq'::regclass),
  booking_id bigint NOT NULL,
  room_type character varying,
  ref_room_no character varying,
  ref_room_id bigint NOT NULL,
  description text,
  package_id bigint,
  room_status character varying,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  is_cancelled boolean DEFAULT false,
  cancelled_on timestamp with time zone,
  cancelled_by uuid,
  is_changed boolean DEFAULT false,
  CONSTRAINT room_details_pkey PRIMARY KEY (id),
  CONSTRAINT fk_room_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_room_package FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT fk_room_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_room_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT fk_room_ref_room FOREIGN KEY (ref_room_id) REFERENCES public.ref_rooms(id)
);

CREATE TABLE public.guests (
  id bigint NOT NULL DEFAULT nextval('guests_id_seq'::regclass),
  booking_id bigint NOT NULL,
  property_id bigint NOT NULL,
  salutation character varying,
  first_name character varying NOT NULL,
  middle_name character varying,
  last_name character varying,
  gender character varying,
  dob date,
  age integer CHECK (age IS NULL OR age >= 0),
  have_vehicle boolean DEFAULT false,
  address text,
  phone character varying,
  email character varying,
  guest_type character varying,
  nationality character varying,
  id_type character varying,
  id_number character varying,
  id_proof bytea,
  id_proof_mime character varying,
  emergency_contact character varying,
  emergency_contact_name character varying,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  country character varying,
  coming_from character varying,
  going_to character varying,
  booking_type character varying,
  CONSTRAINT guests_pkey PRIMARY KEY (id),
  CONSTRAINT fk_guests_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_guests_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_guests_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_guests_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.vehicles (
  id bigint NOT NULL DEFAULT nextval('vehicles_id_seq'::regclass),
  booking_id bigint NOT NULL,
  property_id bigint NOT NULL,
  vehicle_type character varying,
  vehicle_name character varying,
  vehicle_number character varying,
  room_no character varying,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  color character varying,
  phone character varying,
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT fk_vehicles_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_vehicles_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_vehicles_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_vehicles_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.payments (
  id bigint NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
  booking_id bigint,
  property_id bigint NOT NULL,
  payment_date timestamp with time zone,
  paid_amount numeric NOT NULL,
  payment_method character varying,
  payment_type character varying,
  payment_status character varying,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  transaction_id character varying,
  bank_name character varying,
  comments text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_payments_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.laundry (
  id bigint NOT NULL DEFAULT nextval('laundry_id_seq'::regclass),
  property_id bigint NOT NULL,
  item_name USER-DEFINED NOT NULL,
  description text,
  item_rate numeric DEFAULT 0,
  system_generated boolean DEFAULT false,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT laundry_pkey PRIMARY KEY (id),
  CONSTRAINT fk_laundry_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_laundry_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_laundry_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.ref_vendors (
  id bigint NOT NULL DEFAULT nextval('ref_vendors_id_seq'::regclass),
  property_id bigint NOT NULL,
  name character varying NOT NULL,
  pan_no character varying,
  gst_no character varying,
  address text,
  contact_no character varying,
  email_id character varying,
  vendor_type character varying,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  bank_name character varying,
  account_holder_name character varying,
  account_number character varying,
  ifsc_code character varying,
  qr_code text,
  CONSTRAINT ref_vendors_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ref_vendors_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_ref_vendors_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_ref_vendors_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.ref_laundry (
  id bigint NOT NULL DEFAULT nextval('ref_laundry_id_seq'::regclass),
  item_name character varying NOT NULL,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  CONSTRAINT ref_laundry_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ref_laundry_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_ref_laundry_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.staff (
  id bigint NOT NULL DEFAULT nextval('staff_id_seq'::regclass),
  first_name character varying NOT NULL,
  middle_name character varying,
  last_name character varying NOT NULL,
  address text,
  gender character varying,
  marital_status character varying,
  employment_type character varying,
  email character varying,
  phone1 character varying,
  phone2 character varying,
  emergency_contact character varying,
  id_proof_type character varying,
  id_number character varying,
  id_proof bytea,
  id_proof_mime character varying,
  blood_group character varying,
  designation character varying,
  department character varying,
  hire_date date,
  leave_days integer DEFAULT 0 CHECK (leave_days IS NULL OR leave_days >= 0),
  dob date,
  image bytea,
  image_mime character varying,
  shift_pattern character varying,
  status character varying DEFAULT 'active'::character varying,
  user_id uuid NOT NULL,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  emergency_contact_relation character varying,
  emergency_contact_relation_2 character varying,
  emergency_contact_2 character varying,
  emergency_contact_name character varying,
  emergency_contact_name_2 character varying,
  nationality character varying,
  country character varying,
  salutation character varying,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_staff_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_staff_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.enquiries (
  id bigint NOT NULL DEFAULT nextval('enquiries_id_seq'::regclass),
  property_id bigint NOT NULL,
  booking_id bigint,
  guest_name character varying NOT NULL,
  mobile character varying,
  email character varying,
  source character varying,
  enquiry_type character varying,
  status character varying DEFAULT 'open'::character varying,
  agent_name character varying,
  room_type character varying,
  no_of_rooms integer CHECK (no_of_rooms IS NULL OR no_of_rooms >= 0),
  check_in date,
  check_out date,
  booked_by character varying,
  comment text,
  follow_up_date timestamp with time zone,
  quote_amount numeric CHECK (quote_amount IS NULL OR quote_amount >= 0::numeric),
  is_reserved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  agent_type character varying,
  contact_method character varying,
  city character varying,
  nationality character varying,
  plan character varying,
  total_members character varying,
  senior_citizens character varying,
  child character varying,
  specially_abled character varying,
  offer_amount character varying,
  has_alternate_stay boolean DEFAULT false,
  alternate_check_in date,
  alternate_check_out date,
  alternate_room_details jsonb,
  booking_shift_comment text,
  CONSTRAINT enquiries_pkey PRIMARY KEY (id),
  CONSTRAINT fk_enquiries_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_enquiries_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_enquiries_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_enquiries_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.enquiry_room_details (
  id bigint NOT NULL DEFAULT nextval('enquiry_room_details_id_seq'::regclass),
  enquiry_id bigint NOT NULL,
  room_type character varying NOT NULL,
  no_of_rooms integer NOT NULL DEFAULT 1,
  created_on timestamp with time zone DEFAULT now(),
  CONSTRAINT enquiry_room_details_pkey PRIMARY KEY (id),
  CONSTRAINT fk_enquiry_room_details_enquiry FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id)
);

CREATE TABLE public.menu_item_groups (
  id bigint NOT NULL DEFAULT nextval('menu_item_groups_id_seq'::regclass),
  property_id bigint NOT NULL,
  name USER-DEFINED NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT menu_item_groups_pkey PRIMARY KEY (id),
  CONSTRAINT menu_item_groups_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT menu_item_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT menu_item_groups_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.menu_master (
  id bigint NOT NULL DEFAULT nextval('menu_master_id_seq'::regclass),
  property_id bigint NOT NULL,
  item_name character varying NOT NULL,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0::numeric),
  is_active boolean DEFAULT true,
  is_veg boolean DEFAULT false,
  description text,
  image bytea,
  image_mime character varying,
  prep_time integer CHECK (prep_time IS NULL OR prep_time >= 0),
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  menu_item_group_id bigint,
  CONSTRAINT menu_master_pkey PRIMARY KEY (id),
  CONSTRAINT fk_menu_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_menu_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_menu_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT menu_master_group_fk FOREIGN KEY (menu_item_group_id) REFERENCES public.menu_item_groups(id)
);

CREATE TABLE public.delivery_partners (
  id bigint NOT NULL DEFAULT nextval('delivery_partners_id_seq'::regclass),
  property_id bigint NOT NULL,
  name USER-DEFINED NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT delivery_partners_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partners_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT delivery_partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT delivery_partners_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.restaurant_orders (
  id bigint NOT NULL DEFAULT nextval('restaurant_orders_id_seq'::regclass),
  property_id bigint NOT NULL,
  table_no character varying,
  room_id bigint,
  booking_id bigint,
  order_date timestamp with time zone DEFAULT now(),
  total_amount numeric DEFAULT 0 CHECK (total_amount IS NULL OR total_amount >= 0::numeric),
  order_status character varying DEFAULT 'New'::character varying,
  payment_status character varying DEFAULT 'Pending'::character varying,
  waiter_staff_id bigint,
  expected_delivery_time timestamp with time zone,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  guest_name character varying,
  guest_mobile character varying,
  order_type character varying,
  delivery_partner_id bigint,
  notes text,
  subtotal_amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_rate numeric DEFAULT 0,
  sgst_rate numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  grand_total_amount numeric DEFAULT 0,
  CONSTRAINT restaurant_orders_pkey PRIMARY KEY (id),
  CONSTRAINT fk_rest_orders_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_rest_orders_room FOREIGN KEY (room_id) REFERENCES public.ref_rooms(id),
  CONSTRAINT fk_rest_orders_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_rest_orders_waiter FOREIGN KEY (waiter_staff_id) REFERENCES public.staff(id),
  CONSTRAINT fk_rest_orders_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_rest_orders_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT restaurant_orders_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);

CREATE TABLE public.restaurant_order_items (
  id bigint NOT NULL DEFAULT nextval('restaurant_order_items_id_seq'::regclass),
  order_id bigint NOT NULL,
  menu_item_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  item_total numeric NOT NULL CHECK (item_total >= 0::numeric),
  notes character varying,
  created_on timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.restaurant_orders(id),
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES public.menu_master(id)
);

CREATE TABLE public.restaurant_tables (
  id bigint NOT NULL DEFAULT nextval('restaurant_tables_id_seq'::regclass),
  property_id bigint NOT NULL,
  table_no character varying NOT NULL,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  location character varying,
  status character varying DEFAULT 'Available'::character varying,
  min_order_amount numeric DEFAULT 0 CHECK (min_order_amount >= 0::numeric),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id),
  CONSTRAINT fk_rest_tables_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_rest_tables_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_rest_tables_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.sidebar_links (
  id bigint NOT NULL DEFAULT nextval('sidebar_links_id_seq'::regclass),
  link_name character varying NOT NULL,
  endpoint character varying NOT NULL,
  parent_id bigint,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  CONSTRAINT sidebar_links_pkey PRIMARY KEY (id),
  CONSTRAINT fk_sidebar_parent FOREIGN KEY (parent_id) REFERENCES public.sidebar_links(id),
  CONSTRAINT fk_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.role_sidebar_links (
  role_id bigint NOT NULL,
  sidebar_link_id bigint NOT NULL,
  can_read boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_on timestamp with time zone DEFAULT now(),
  CONSTRAINT role_sidebar_links_pkey PRIMARY KEY (role_id, sidebar_link_id),
  CONSTRAINT fk_rsl_role FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT fk_rsl_sidebar FOREIGN KEY (sidebar_link_id) REFERENCES public.sidebar_links(id)
);

CREATE TABLE public.property_floors (
  id bigint NOT NULL DEFAULT nextval('property_floors_id_seq'::regclass),
  property_id integer NOT NULL,
  floor_number integer NOT NULL,
  rooms_count integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT property_floors_pkey PRIMARY KEY (id),
  CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.ref_packages (
  id bigint NOT NULL DEFAULT nextval('ref_packages_id_seq'::regclass),
  package_name character varying NOT NULL,
  description text,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT ref_packages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ref_packages_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_ref_packages_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.addresses (
  id bigint NOT NULL DEFAULT nextval('addresses_id_seq'::regclass),
  entity_type character varying NOT NULL,
  entity_id bigint NOT NULL,
  address_type character varying NOT NULL,
  address_line_1 character varying NOT NULL,
  address_line_2 character varying,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  is_primary boolean DEFAULT false,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT fk_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.property_bank_accounts (
  id bigint NOT NULL DEFAULT nextval('property_bank_accounts_id_seq'::regclass),
  property_id bigint NOT NULL,
  account_holder_name character varying NOT NULL,
  account_number character varying NOT NULL,
  ifsc_code character varying NOT NULL,
  bank_name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT property_bank_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_property_bank_accounts_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_property_bank_accounts_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_property_bank_accounts_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.laundry_orders (
  id bigint NOT NULL DEFAULT nextval('laundry_orders_id_seq'::regclass),
  booking_id bigint,
  property_id bigint NOT NULL,
  vendor_id bigint,
  laundry_type character varying,
  description text,
  laundry_status character varying,
  vendor_status character varying,
  status character varying DEFAULT 'active'::character varying,
  pickup_date timestamp with time zone,
  delivery_date timestamp with time zone,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  comments text,
  room_no character varying,
  total_amount numeric DEFAULT 0,
  guest_name character varying,
  guest_mobile character varying,
  subtotal_amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_rate numeric DEFAULT 0,
  sgst_rate numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  grand_total_amount numeric DEFAULT 0,
  staff_received_by character varying,
  guest_received_by character varying,
  CONSTRAINT laundry_orders_pkey PRIMARY KEY (id),
  CONSTRAINT fk_laundry_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_laundry_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_laundry_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_laundry_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.visa_details (
  id bigint NOT NULL DEFAULT nextval('visa_details_id_seq'::regclass),
  visa_number character varying NOT NULL,
  issued_date date NOT NULL,
  expiry_date date NOT NULL,
  staff_id bigint,
  guest_id bigint,
  CONSTRAINT visa_details_pkey PRIMARY KEY (id),
  CONSTRAINT fk_visa_staff FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT fk_visa_guest FOREIGN KEY (guest_id) REFERENCES public.guests(id)
);

CREATE TABLE public.inventory_types (
  id bigint NOT NULL DEFAULT nextval('inventory_types_id_seq'::regclass),
  type USER-DEFINED NOT NULL UNIQUE,
  created_on timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inventory_master (
  id bigint NOT NULL DEFAULT nextval('inventory_master_id_seq'::regclass),
  property_id bigint NOT NULL,
  inventory_type_id bigint NOT NULL,
  use_type USER-DEFINED NOT NULL,
  name USER-DEFINED NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  unit character varying,
  CONSTRAINT inventory_master_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_master_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT inventory_master_inventory_type_id_fkey FOREIGN KEY (inventory_type_id) REFERENCES public.inventory_types(id),
  CONSTRAINT inventory_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT inventory_master_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.kitchen_inventory (
  id bigint NOT NULL DEFAULT nextval('kitchen_inventory_id_seq'::regclass),
  property_id bigint NOT NULL,
  inventory_master_id bigint NOT NULL,
  quantity numeric DEFAULT 0,
  unit USER-DEFINED,
  created_by uuid,
  updated_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_on timestamp with time zone DEFAULT now(),
  CONSTRAINT kitchen_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT kitchen_inventory_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT kitchen_inventory_inventory_master_id_fkey FOREIGN KEY (inventory_master_id) REFERENCES public.inventory_master(id),
  CONSTRAINT kitchen_inventory_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT kitchen_inventory_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.laundry_order_items (
  id bigint NOT NULL DEFAULT nextval('laundry_order_items_id_seq'::regclass),
  order_id bigint NOT NULL,
  laundry_id bigint NOT NULL,
  room_no character varying,
  item_count integer DEFAULT 0 CHECK (item_count IS NULL OR item_count >= 0),
  item_rate numeric DEFAULT 0,
  amount numeric DEFAULT ((COALESCE(item_count, 0))::numeric * COALESCE(item_rate, (0)::numeric)),
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  notes text,
  CONSTRAINT laundry_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT fk_loi_order FOREIGN KEY (order_id) REFERENCES public.laundry_orders(id),
  CONSTRAINT fk_loi_laundry FOREIGN KEY (laundry_id) REFERENCES public.laundry(id)
);

CREATE TABLE public.property_users (
  id bigint NOT NULL DEFAULT nextval('property_users_id_seq'::regclass),
  property_id bigint,
  user_id uuid NOT NULL,
  role_id bigint NOT NULL,
  is_active boolean DEFAULT true,
  assigned_by uuid,
  assigned_on timestamp with time zone DEFAULT now(),
  CONSTRAINT property_users_pkey PRIMARY KEY (id),
  CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES public.roles(id)
);

CREATE TABLE public.vendor_bank_accounts (
  id bigint NOT NULL DEFAULT nextval('vendor_bank_accounts_id_seq'::regclass),
  vendor_id bigint NOT NULL,
  account_holder_name character varying NOT NULL,
  account_number character varying NOT NULL,
  ifsc_code character varying NOT NULL,
  bank_name character varying NOT NULL,
  qr_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT vendor_bank_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_vendor_bank_accounts_vendor FOREIGN KEY (vendor_id) REFERENCES public.ref_vendors(id),
  CONSTRAINT fk_vendor_bank_accounts_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_vendor_bank_accounts_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.invoices (
  id bigint NOT NULL DEFAULT nextval('invoices_id_seq'::regclass),
  booking_id bigint NOT NULL,
  property_id bigint NOT NULL,
  invoice_no character varying NOT NULL UNIQUE,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_no character varying,
  seller_name character varying,
  seller_gstin character varying,
  seller_address text,
  seller_state character varying,
  seller_state_code character varying,
  buyer_name character varying,
  buyer_gstin character varying,
  buyer_address text,
  buyer_state character varying,
  buyer_state_code character varying,
  place_of_supply character varying,
  guest_name character varying,
  guest_mobile character varying,
  check_in_date date,
  check_out_date date,
  stay_taxable_amount numeric DEFAULT 0,
  laundry_taxable_amount numeric DEFAULT 0,
  early_checkin_amount numeric DEFAULT 0,
  delayed_checkout_amount numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  total_tax_amount numeric DEFAULT 0,
  round_off_amount numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  amount_in_words text,
  tax_amount_in_words text,
  invoice_status character varying DEFAULT 'ISSUED'::character varying,
  created_by uuid,
  created_on timestamp with time zone DEFAULT now(),
  updated_by uuid,
  updated_on timestamp with time zone,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT invoices_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT invoices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
```

## Property-wise Booking Numbering Note

`bookings.id` remains the global internal primary key and must continue to be used for API routes, foreign keys, joins, payments, guests, rooms, invoices, and status updates.

`bookings.booking_sequence` is the property-wise display sequence only.

Example:

```text
Property 1:
id 1 -> booking_sequence 1 -> BO001
id 2 -> booking_sequence 2 -> BO002

Property 2:
id 3 -> booking_sequence 1 -> BO001
id 4 -> booking_sequence 2 -> BO002
```

`property_counters` stores property-wise counters. For booking numbering, `counter_name = 'BOOKING'`.
