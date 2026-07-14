import { getDb } from "../../utils/getDb.js";

class MenuItemGroupService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ==============================
       GET ALL BY PROPERTY (PAGINATED)
    =============================== */
    async getByPropertyId({ propertyId, page = 1, limit = 10 }) {

        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
            SELECT *
            FROM public.menu_item_groups
            WHERE property_id = $1
            ORDER BY name ASC
            LIMIT $2 OFFSET $3
            `,
            [propertyId, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM public.menu_item_groups
            WHERE property_id = $1
            `,
            [propertyId]
        );

        const total = countRows[0].total;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /* ==============================
       LIGHT LIST (DROPDOWN)
    =============================== */
    async getLightByPropertyId(propertyId) {

        const { rows } = await this.#DB.query(
            `
            SELECT id, name
            FROM public.menu_item_groups
            WHERE property_id = $1
            ORDER BY name ASC
            `,
            [propertyId]
        );

        return rows;
    }

    /* ==============================
       CREATE
    =============================== */
    async create({
        property_id,
        name,
        created_by
    }) {

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.menu_item_groups (
                property_id,
                name,
                created_by
            )
            VALUES ($1,$2,$3)
            RETURNING *
            `,
            [
                property_id,
                name,
                created_by
            ]
        );

        return rows[0];
    }

    /* ==============================
       UPDATE
    =============================== */
    async updateById(id, {
        name,
        updated_by,
        is_active
    }) {

        const fields = [];
        const values = [];
        let i = 1;

        if (name !== undefined) {
            fields.push(`name = $${i++}`);
            values.push(name);
        }

        if (is_active === false || is_active === true) {
            fields.push(`is_active = $${i++}`);
            values.push(is_active);
        }

        fields.push(`updated_by = $${i++}`);
        values.push(updated_by);

        fields.push(`updated_on = NOW()`);

        const { rows } = await this.#DB.query(
            `
            UPDATE public.menu_item_groups
            SET ${fields.join(", ")}
            WHERE id = $${i}
            RETURNING *
            `,
            [...values, id]
        );

        return rows[0];
    }

    /* ==============================
       DELETE
    =============================== */
    async deleteById(id) {

        const { rowCount } = await this.#DB.query(
            `
            DELETE FROM public.menu_item_groups
            WHERE id = $1
            `,
            [id]
        );

        return rowCount > 0;
    }

}

export default Object.freeze(new MenuItemGroupService());
