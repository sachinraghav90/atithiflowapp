import { getDb } from "../../utils/getDb.js";

const INVENTORY_UPDATE_FIELDS = [
    { column: "property_id", aliases: ["property_id", "propertyId"] },
    { column: "inventory_type_id", aliases: ["inventory_type_id", "inventoryTypeId"] },
    { column: "use_type", aliases: ["use_type", "useType"] },
    { column: "name", aliases: ["name"] },
    { column: "unit", aliases: ["unit"] },
    { column: "is_active", aliases: ["is_active", "isActive"] },
];

function hasOwnValue(payload, key) {
    return Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== undefined;
}

function readPayloadValue(payload, aliases) {
    for (const alias of aliases) {
        if (hasOwnValue(payload, alias)) {
            return payload[alias];
        }
    }

    return undefined;
}

function createServiceError(message, statusCode, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (code) error.code = code;
    return error;
}

class InventoryService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* =====================================================
       GET inventory by property
    ===================================================== */

    async getInventoryByPropertyId({
        propertyId,
        inventoryTypeId,
        page = 1,
        limit = 10,
        search = "",
        type = "",
        useType = "",
        status = "",
        exportRows = false
    }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;
        const normalizedSearch = search.trim();

        let where = `WHERE im.property_id = $1`;
        const values = [propertyId];
        let i = values.length + 1;

        if (inventoryTypeId) {
            where += ` AND im.inventory_type_id = $${i++}`;
            values.push(inventoryTypeId);
        }

        if (type) {
            where += ` AND it.type = $${i++}`;
            values.push(type);
        }

        if (useType) {
            where += ` AND im.use_type = $${i++}`;
            values.push(useType);
        }

        if (status === "active" || status === "true") {
            where += ` AND im.is_active = $${i++}`;
            values.push(true);
        } else if (status === "inactive" || status === "false") {
            where += ` AND im.is_active = $${i++}`;
            values.push(false);
        }

        if (normalizedSearch) {
            const formattedIdMatch = normalizedSearch.match(/^in0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const inventoryId = Number(rawId);

                where += ` AND (
                    im.id = $${i++}
                    OR im.name ILIKE $${i++}
                )`;
                values.push(inventoryId, `%${normalizedSearch}%`);
            } else {
                where += ` AND (
                    im.name ILIKE $${i}
                    OR TO_CHAR(im.created_on, 'DD/MM/YYYY') ILIKE $${i}
                )`;
                values.push(`%${normalizedSearch}%`);
                i += 1;
            }
        }

        const query = `
            SELECT 
                im.*,
                it.type AS inventory_type
            FROM public.inventory_master im
            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id
            ${where}
            ORDER BY im.created_on DESC
            ${exportRows ? "" : `LIMIT $${i++} OFFSET $${i++}`}
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.inventory_master im
            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id
            ${where}
        `;

        const [{ rows: countRows }, result] = await Promise.all([
            this.#DB.query(countQuery, values),
            this.#DB.query(query, exportRows ? values : [...values, safeLimit, offset])
        ]);

        const total = countRows[0]?.total ?? 0;

        return {
            data: result.rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.max(1, Math.ceil(total / safeLimit)),
            },
        };
    }

    /* =====================================================
       CREATE inventory
    ===================================================== */
    async createInventory(payload, userId) {

        const query = `
            INSERT INTO public.inventory_master (
                property_id,
                inventory_type_id,
                use_type,
                name,
                unit,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *;
        `;

        const values = [
            payload.property_id,
            payload.inventory_type_id,
            payload.use_type,
            payload.name,
            payload.unit ?? null,
            userId
        ];

        const result = await this.#DB.query(query, values);

        return result.rows[0];
    }

    /* =====================================================
       CREATE inventory
    ===================================================== */
    async createInventory(payload, userId) {

        const query = `
            INSERT INTO public.inventory_master (
                property_id,
                inventory_type_id,
                use_type,
                name,
                unit,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *;
        `;

        const values = [
            payload.property_id,
            payload.inventory_type_id,
            payload.use_type,
            payload.name,
            payload.unit ?? null,
            userId
        ];

        const result = await this.#DB.query(query, values);

        return result.rows[0];
    }

    /* =====================================================
    BULK CREATE inventory
    ===================================================== */

    async bulkCreateInventory({ items = [] }, userId) {

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error("Items array required");
        }

        const propertyIds = items.map(i => i.property_id);
        const inventoryTypeIds = items.map(i => i.inventory_type_id);
        const useTypes = items.map(i => i.use_type ?? null);
        const names = items.map(i => i.name);
        const units = items.map(i => i.unit ?? null);   // NEW

        const query = `
            INSERT INTO public.inventory_master (
                property_id,
                inventory_type_id,
                use_type,
                name,
                unit,
                created_by
            )
            SELECT
                unnest($1::bigint[]),
                unnest($2::bigint[]),
                unnest($3::text[]),
                unnest($4::text[]),
                unnest($5::text[]),
                $6
            RETURNING *;
        `;

        const values = [
            propertyIds,
            inventoryTypeIds,
            useTypes,
            names,
            units,
            userId
        ];

        const result = await this.#DB.query(query, values);

        return result.rows;
    }

    /* =====================================================
    CHECK DUPLICATES INVENTORY
    ===================================================== */
    
    async checkDuplicates(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        const duplicates = await Promise.all(
            items.map(async (item) => {
                if (!item.property_id || !item.inventory_type_id || !item.name?.trim()) return false;
                
                const duplicate = await this.#findDuplicateInventory({
                    id: item.id || -1,
                    property_id: item.property_id,
                    inventory_type_id: item.inventory_type_id,
                    name: item.name
                });
                
                return duplicate !== null;
            })
        );
        
        return duplicates;
    }

    async #getInventoryById(id) {
        const result = await this.#DB.query(
            `
                SELECT *
                FROM public.inventory_master
                WHERE id = $1
                LIMIT 1;
            `,
            [id]
        );

        return result.rows[0] ?? null;
    }

    async #findDuplicateInventory({ id, property_id, inventory_type_id, name }) {
        const result = await this.#DB.query(
            `
                SELECT id
                FROM public.inventory_master
                WHERE property_id = $1
                  AND inventory_type_id = $2
                  AND name = $3
                  AND id <> $4
                LIMIT 1;
            `,
            [property_id, inventory_type_id, name, id]
        );

        return result.rows[0] ?? null;
    }

    /* =====================================================
       UPDATE inventory
    ===================================================== */

    async updateInventory(id, payload = {}, userId) {
        const requestPayload = payload && typeof payload === "object" ? payload : {};
        const inventoryId = Number(id);

        if (!Number.isInteger(inventoryId) || inventoryId <= 0) {
            throw createServiceError("Invalid inventory id", 400);
        }

        const existing = await this.#getInventoryById(inventoryId);

        if (!existing) {
            throw createServiceError("Inventory not found", 404);
        }

        const updatePayload = {};

        for (const { column, aliases } of INVENTORY_UPDATE_FIELDS) {
            const value = readPayloadValue(requestPayload, aliases);
            if (value !== undefined) {
                updatePayload[column] = column === "name" && typeof value === "string"
                    ? value.trim()
                    : value;
            }
        }

        if (!Object.keys(updatePayload).length) {
            throw createServiceError("No valid fields provided for update", 400);
        }

        if (
            updatePayload.name !== undefined &&
            (typeof updatePayload.name !== "string" || !updatePayload.name.trim())
        ) {
            throw createServiceError("Inventory name is required", 400);
        }

        if (
            updatePayload.use_type !== undefined &&
            (typeof updatePayload.use_type !== "string" || !updatePayload.use_type.trim())
        ) {
            throw createServiceError("Inventory use type is required", 400);
        }

        if (updatePayload.property_id !== undefined && !Number(updatePayload.property_id)) {
            throw createServiceError("Valid property id is required", 400);
        }

        if (updatePayload.inventory_type_id !== undefined && !Number(updatePayload.inventory_type_id)) {
            throw createServiceError("Valid inventory type is required", 400);
        }

        const effectivePropertyId = updatePayload.property_id ?? existing.property_id;
        const effectiveInventoryTypeId = updatePayload.inventory_type_id ?? existing.inventory_type_id;
        const effectiveName = String(updatePayload.name ?? existing.name ?? "").trim();

        if (effectivePropertyId && effectiveInventoryTypeId && effectiveName) {
            const duplicate = await this.#findDuplicateInventory({
                id: inventoryId,
                property_id: effectivePropertyId,
                inventory_type_id: effectiveInventoryTypeId,
                name: effectiveName,
            });

            if (duplicate) {
                const error = new Error("Inventory item already exists in this category");
                error.statusCode = 409;
                error.code = "INVENTORY_DUPLICATE";
                throw error;
            }
        }

        const fields = [];
        const values = [];
        let i = 1;

        for (const { column } of INVENTORY_UPDATE_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(updatePayload, column)) {
                fields.push(`${column} = $${i++}`);
                values.push(updatePayload[column]);
            }
        }

        fields.push(`updated_by = $${i++}`);
        values.push(userId);

        fields.push(`updated_on = now()`);

        const query = `
            UPDATE public.inventory_master
            SET ${fields.join(", ")}
            WHERE id = $${i}
            RETURNING *;
        `;

        values.push(inventoryId);

        const result = await this.#DB.query(query, values);

        return result.rows[0];
    }

    /* =====================================================
       DELETE inventory
    ===================================================== */

    async deleteInventory(id) {

        const query = `
            DELETE FROM public.inventory_master
            WHERE id = $1
            RETURNING *;
        `;

        const result = await this.#DB.query(query, [id]);

        if (!result.rowCount) {
            throw new Error("Inventory not found");
        }

        return result.rows[0];
    }

    /* =====================================================
   GET inventory by property + inventory type (string)
===================================================== */

    async getInventoryByType({ propertyId, inventoryType }) {

        const query = `
            SELECT 
                im.*,
                it.type AS inventory_type
            FROM public.inventory_master im
            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id
            WHERE 
                im.property_id = $1
                AND it.type = $2
            ORDER BY im.created_on DESC;
        `;

        const values = [propertyId, inventoryType];

        const result = await this.#DB.query(query, values);

        return result.rows;
    }

    /* =====================================================
    GET all inventory types
    ===================================================== */

    async getInventoryTypes() {

        const query = `
        SELECT 
            id,
            type
        FROM public.inventory_types
        ORDER BY type ASC;
    `;

        const result = await this.#DB.query(query);

        return result.rows;
    }

}

export default Object.freeze(new InventoryService());
