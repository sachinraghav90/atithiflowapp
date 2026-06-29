create table
    if not exists public.restaurant_order_items (
        id bigserial primary key,
        order_id bigint not null,
        menu_item_id bigint not null,
        quantity integer not null default 1,
        unit_price numeric(10, 2) not null,
        item_total numeric(10, 2) not null,
        notes varchar(255),
        created_on timestamptz default now (),
        constraint fk_order_items_order foreign key (order_id) references public.restaurant_orders (id) on delete cascade,
        constraint fk_order_items_menu foreign key (menu_item_id) references public.menu_master (id) on delete restrict,
        constraint chk_order_item_quantity check (quantity > 0),
        constraint chk_order_item_price check (unit_price >= 0),
        constraint chk_order_item_total check (item_total >= 0)
    );