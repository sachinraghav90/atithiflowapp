import { getDb } from "../../utils/getDb.js";

class InventoryService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* =====================================================
       GET inventory by property
    ===================================================== */

    async getInventoryByPropertyId({ propertyId, inventoryTypeId, page = 1, limit = 10 }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        let where = `WHERE im.property_id = $1`;
        const values = [propertyId];
        let i = values.length + 1;

        if (inventoryTypeId) {
            where += ` AND im.inventory_type_id = $${i++}`;
            values.push(inventoryTypeId);
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
            LIMIT $${i++} OFFSET $${i++}
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.inventory_master im
            ${where}
        `;

        const [{ rows: countRows }, result] = await Promise.all([
            this.#DB.query(countQuery, values),
            this.#DB.query(query, [...values, safeLimit, offset])
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

    async updateInventory(id, payload, userId) {
        const existing = await this.#getInventoryById(id);

        if (!existing) {
            throw new Error("Inventory not found");
        }

        const effectivePropertyId = payload.property_id ?? existing.property_id;
        const effectiveInventoryTypeId = payload.inventory_type_id ?? existing.inventory_type_id;
        const effectiveName = payload.name ?? existing.name;

        if (effectivePropertyId && effectiveInventoryTypeId && effectiveName?.trim()) {
            const duplicate = await this.#findDuplicateInventory({
                id,
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

        for (const [key, value] of Object.entries(payload)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
        }

        if (!fields.length) {
            throw new Error("No fields provided for update");
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

        values.push(id);

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
