CREATE TABLE IF NOT EXISTS public.laundry_order_items (
    id BIGSERIAL PRIMARY KEY,

    order_id BIGINT NOT NULL,
    laundry_id BIGINT NOT NULL,

    -- room_no VARCHAR(10),

    item_count INTEGER DEFAULT 0,
    item_rate NUMERIC(10,2) DEFAULT 0,

    amount NUMERIC(10,2) GENERATED ALWAYS AS (
        COALESCE(item_count,0) * COALESCE(item_rate,0)
    ) STORED,

    created_by UUID,
    created_on TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    updated_on TIMESTAMPTZ,

    CONSTRAINT fk_loi_order
        FOREIGN KEY (order_id)
        REFERENCES public.laundry_orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_loi_laundry
        FOREIGN KEY (laundry_id)
        REFERENCES public.laundry(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_item_count CHECK (
        item_count IS NULL OR item_count >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_loi_order_id
ON public.laundry_order_items(order_id);

-- CREATE UNIQUE INDEX IF NOT EXISTS uq_loi_order_item_room
-- ON public.laundry_order_items(order_id, laundry_id, room_no);
