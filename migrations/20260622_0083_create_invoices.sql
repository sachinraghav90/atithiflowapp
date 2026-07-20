CREATE TABLE IF NOT EXISTS public.invoices (
  id BIGSERIAL PRIMARY KEY,

  booking_id BIGINT NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  invoice_no VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_no VARCHAR(100),

  seller_name VARCHAR(255),
  seller_gstin VARCHAR(30),
  seller_address TEXT,
  seller_state VARCHAR(100),
  seller_state_code VARCHAR(10),

  buyer_name VARCHAR(255),
  buyer_gstin VARCHAR(30),
  buyer_address TEXT,
  buyer_state VARCHAR(100),
  buyer_state_code VARCHAR(10),

  place_of_supply VARCHAR(100),
  guest_name VARCHAR(255),
  guest_mobile VARCHAR(50),
  check_in_date DATE,
  check_out_date DATE,

  stay_taxable_amount NUMERIC(12,2) DEFAULT 0,
  laundry_taxable_amount NUMERIC(12,2) DEFAULT 0,
  early_checkin_amount NUMERIC(12,2) DEFAULT 0,
  delayed_checkout_amount NUMERIC(12,2) DEFAULT 0,

  taxable_amount NUMERIC(12,2) DEFAULT 0,
  cgst_amount NUMERIC(12,2) DEFAULT 0,
  sgst_amount NUMERIC(12,2) DEFAULT 0,
  igst_amount NUMERIC(12,2) DEFAULT 0,
  total_tax_amount NUMERIC(12,2) DEFAULT 0,
  round_off_amount NUMERIC(12,2) DEFAULT 0,
  grand_total NUMERIC(12,2) DEFAULT 0,

  amount_in_words TEXT,
  tax_amount_in_words TEXT,

  invoice_status VARCHAR(30) DEFAULT 'ISSUED',

  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_on TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_on TIMESTAMPTZ,

  CONSTRAINT uq_invoices_invoice_no UNIQUE (invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id
ON public.invoices(booking_id);

CREATE INDEX IF NOT EXISTS idx_invoices_property_id
ON public.invoices(property_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_booking_issued
ON public.invoices(booking_id)
WHERE invoice_status = 'ISSUED';
