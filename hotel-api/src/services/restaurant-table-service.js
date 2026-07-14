import { getDb } from "../../utils/getDb.js";

class RestaurantTableService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ===========================
       GET BY PROPERTY (PAGINATED)
    ============================ */
    async getByPropertyId({ propertyId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
            SELECT *
            FROM restaurant_tables
            WHERE property_id = $1
            ORDER BY table_no ASC
            LIMIT $2 OFFSET $3
            `,
            [propertyId, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM restaurant_tables
            WHERE property_id = $1
            `,
            [propertyId]
        );

        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limit);

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    }

    /* ===========================
       GET TABLE NOS (LIGHT API)
    ============================ */
    async getTableNoByPropertyId(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT id, table_no, status
            FROM restaurant_tables
            WHERE property_id = $1
              -- AND status = 'Available'
            ORDER BY table_no ASC
            `,
            [propertyId]
        );

        return rows;
    }

    /* ===========================
       CREATE SINGLE TABLE
    ============================ */
    async create({
        property_id,
        table_no,
        capacity = 1,
        location = null,
        status = "Available",
        min_order_amount = 0,
        is_active = true,
        created_by
    }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO restaurant_tables (
                property_id,
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            `,
            [
                property_id,
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active,
                created_by
            ]
        );

        return rows[0];
    }

    /* ===========================
       UPDATE BY ID
    ============================ */
    async updateById(id, {
        table_no,
        capacity,
        location,
        status,
        min_order_amount,
        is_active,
        updated_by
    }) {
        const fields = [];
        const values = [];
        let i = 1;

        if (table_no !== undefined) {
            fields.push(`table_no = $${i++}`);
            values.push(table_no);
        }
        if (capacity !== undefined) {
            fields.push(`capacity = $${i++}`);
            values.push(capacity);
        }
        if (location !== undefined) {
            fields.push(`location = $${i++}`);
            values.push(location);
        }
        if (status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(status);
        }
        if (min_order_amount !== undefined) {
            fields.push(`min_order_amount = $${i++}`);
            values.push(min_order_amount);
        }
        if (is_active !== undefined) {
            fields.push(`is_active = $${i++}`);
            values.push(is_active);
        }

        fields.push(`updated_by = $${i++}`);
        values.push(updated_by);

        fields.push(`updated_on = NOW()`);

        const { rows } = await this.#DB.query(
            `
            UPDATE restaurant_tables
            SET ${fields.join(", ")}
            WHERE id = $${i}
            RETURNING *
            `,
            [...values, id]
        );

        return rows[0];
    }

    /* ===========================
       BULK CREATE
    ============================ */
    async createBulk({ property_id, tables, created_by }) {
        if (!Array.isArray(tables) || tables.length === 0) return [];

        const values = [];
        const bindings = [];
        let i = 1;

        for (const t of tables) {
            values.push(`(
                $${i++}, -- property_id
                $${i++}, -- table_no
                $${i++}, -- capacity
                $${i++}, -- location
                $${i++}, -- status
                $${i++}, -- min_order_amount
                $${i++}, -- is_active
                $${i++}  -- created_by
            )`);

            bindings.push(
                property_id,
                t.table_no,
                t.capacity ?? 1,
                t.location ?? null,
                t.status ?? "Available",
                t.min_order_amount ?? 0,
                t.is_active ?? true,
                created_by
            );
        }

        const { rows } = await this.#DB.query(
            `
            INSERT INTO restaurant_tables (
                property_id,
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active,
                created_by
            )
            VALUES ${values.join(",")}
            RETURNING *
            `,
            bindings
        );

        return rows;
    }

    /* ===========================
       BULK UPDATE
    ============================ */
    async updateBulk({ updates, updated_by }) {
        if (!Array.isArray(updates) || updates.length === 0) return [];

        const results = [];

        for (const u of updates) {
            const updated = await this.updateById(u.id, {
                table_no: u.table_no,
                capacity: u.capacity,
                location: u.location,
                status: u.status,
                min_order_amount: u.min_order_amount,
                is_active: u.is_active,
                updated_by
            });

            results.push(updated);
        }

        return results;
    }
}

export default Object.freeze(new RestaurantTableService());
