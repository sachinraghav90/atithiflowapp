import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class LaundryService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async getByPropertyId({ propertyId, page = 1, limit = 10, search = "", status = "" }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        let whereClause = "WHERE property_id = $1";
        const values = [propertyId];
        let i = 2;

        if (status) {
            whereClause += ` AND is_active = $${i++}`;
            values.push(status === "true");
        }

        if (search) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^LP0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const itemId = Number(rawId);

                whereClause += ` AND (
                    id = $${i}
                    OR item_name ILIKE $${i + 1}
                    OR description ILIKE $${i + 1}
                )`;
                values.push(itemId, `%${normalizedSearch}%`);
                i += 2;
            } else {
                whereClause += ` AND (
                    item_name ILIKE $${i}
                    OR description ILIKE $${i}
                )`;
                values.push(`%${normalizedSearch}%`);
                i++;
            }
        }

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.laundry
            ${whereClause}
        `;

        const dataQuery = `
            SELECT *
            FROM public.laundry
            ${whereClause}
            ORDER BY system_generated DESC, item_name
            LIMIT $${i++} OFFSET $${i++}
        `;

        const [{ rows: countRows }, { rows }] = await Promise.all([
            this.#DB.query(countQuery, values),
            this.#DB.query(dataQuery, [...values, safeLimit, offset])
        ]);

        const total = countRows[0]?.total ?? 0;

        return {
            data: rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.max(1, Math.ceil(total / safeLimit)),
            },
        };
    }

    async createLaundry({
        propertyId,
        itemName,
        description,
        itemRate,
        userId
    }) {
        const query = `
            insert into public.laundry (
                property_id,
                item_name,
                description,
                item_rate,
                system_generated,
                created_by
            )
            values ($1, $2, $3, $4, false, $5)
            returning *;
        `;

        const { rows } = await this.#DB.query(query, [
            propertyId,
            itemName,
            description ?? null,
            itemRate ?? 0,
            userId
        ]);

        await AuditService.log({
            property_id: propertyId,
            event_id: rows[0].id,
            table_name: "laundry",
            event_type: "CREATE",
            task_name: "Create Laundry Item",
            comments: "Laundry item created",
            details: JSON.stringify({
                laundry_id: rows[0].id,
                item_name: itemName,
                description: description ?? null,
                item_rate: itemRate ?? 0,
                system_generated: false
            }),
            user_id: userId
        });


        return rows[0];
    }

    async bulkCreateLaundry({
        propertyId,
        items,
        userId
    }) {

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error("Items array is required");
        }

        const names = items.map(i => i.itemName?.trim());
        const descriptions = items.map(i => i.description ?? null);
        const rates = items.map(i => i.itemRate ?? 0);
        const isActive = items.map(i => i.isActive !== false);

        const query = `
                    insert into public.laundry (
                        property_id,
                        item_name,
                        description,
                        item_rate,
                        is_active,
                        system_generated,
                        created_by
                    )
                    select
                        $1,
                        unnest($2::text[]),
                        unnest($3::text[]),
                        unnest($4::numeric[]),
                        unnest($5::boolean[]),
                        false,
                        $6
                    on conflict (property_id, item_name) do nothing
                    returning *;
                `;

        const { rows } = await this.#DB.query(query, [
            propertyId,
            names,
            descriptions,
            rates,
            isActive,
            userId
        ]);

        if (rows.length > 0) {
            const itemMap = new Map(
                items.map((item) => [
                    item.itemName?.trim()?.toLowerCase(),
                    item
                ])
            );

            await Promise.all(
                rows.map((row) =>
                    AuditService.log({
                        property_id: propertyId,
                        event_id: row.id,
                        table_name: "laundry",
                        event_type: "CREATE",
                        task_name: "Create Laundry Item",
                        comments: "Laundry item created",
                        details: JSON.stringify({
                            laundry_id: row.id,
                            item_name: row.item_name,
                            description: row.description ?? null,
                            item_rate: row.item_rate ?? 0,
                            is_active: row.is_active,
                            system_generated: false,
                            requested: itemMap.get(row.item_name?.trim()?.toLowerCase()) ?? null
                        }),
                        user_id: userId
                    })
                )
            );
        }

        return rows;
    }

    async bulkUpdate({ updates, userId }) {
        if (!Array.isArray(updates) || updates.length === 0) {
            throw new Error("Updates array is required");
        }

        const ids = updates.map(u => u.id);

        const names = updates.map(u => u.itemName ?? null);
        const descriptions = updates.map(u => u.description ?? null);
        const rates = updates.map(u => u.itemRate ?? null);

        const isActive = updates.map(u =>
            typeof u.is_active === "boolean" ? u.is_active : null
        );

        const query = `
        update public.laundry l
        set
            item_name = coalesce(u.item_name, l.item_name),
            description = coalesce(u.description, l.description),
            item_rate = coalesce(u.item_rate, l.item_rate),
            is_active = coalesce(u.is_active, l.is_active),
            updated_by = $6,
            updated_on = now()
        from (
            select
                unnest($1::bigint[]) as id,
                unnest($2::text[]) as item_name,
                unnest($3::text[]) as description,
                unnest($4::numeric[]) as item_rate,
                unnest($5::boolean[]) as is_active
        ) u
        where l.id = u.id
        returning l.*;
    `;

        const { rows } = await this.#DB.query(query, [
            ids,
            names,
            descriptions,
            rates,
            isActive,
            userId
        ]);

        return rows;
    }


}

export default Object.freeze(new LaundryService());
