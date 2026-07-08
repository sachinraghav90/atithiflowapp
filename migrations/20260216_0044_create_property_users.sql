create table if not exists property_users (
    id bigserial primary key,

    property_id bigint,
    user_id uuid not null,
    role_id bigint not null,

    is_active boolean default true,

    assigned_by uuid,
    assigned_on timestamptz default now(),

    constraint fk_property foreign key (property_id)
        references properties(id) on delete cascade,

    constraint fk_user foreign key (user_id)
        references users(id) on delete cascade,

    constraint fk_role foreign key (role_id)
        references roles(id) on delete restrict,

    constraint unique_property_user_role
        unique(property_id, user_id, role_id)
);
