CREATE TABLE IF NOT EXISTS public.vendor_bank_accounts (
  id bigserial PRIMARY KEY,
  vendor_id bigint NOT NULL,
  account_holder_name character varying(150) NOT NULL,
  account_number character varying(50) NOT NULL,
  ifsc_code character varying(20) NOT NULL,
  bank_name character varying(150) NOT NULL,
  qr_code text NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,

  CONSTRAINT fk_vendor_bank_accounts_vendor
    FOREIGN KEY (vendor_id)
    REFERENCES public.ref_vendors(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_vendor_bank_accounts_created_by
    FOREIGN KEY (created_by)
    REFERENCES public.users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_vendor_bank_accounts_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES public.users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vendor_bank_accounts_vendor_id
ON public.vendor_bank_accounts(vendor_id);
