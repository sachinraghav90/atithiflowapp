import { getDb } from "../../utils/getDb.js";

class SidebarLinkService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async create({ payload, userId }) {
        const {
            link_name,
            endpoint,
            parent_id = null,
            sort_order = 0,
            is_active = true
        } = payload;

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.sidebar_links (
              link_name,
              endpoint,
              parent_id,
              sort_order,
              is_active,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `,
            [
                link_name,
                endpoint,
                parent_id,
                sort_order,
                is_active,
                userId
            ]
        );

        return rows[0];
    }

    async getAll() {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.sidebar_links
        ORDER BY sort_order, id
      `
        );

        return rows;
    }

    async getActive() {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.sidebar_links
        WHERE is_active = true
        ORDER BY sort_order, id
      `
        );

        return rows;
    }

    async getById({ id }) {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.sidebar_links
        WHERE id = $1
      `,
            [id]
        );

        return rows[0] ?? null;
    }

    async update({ id, payload, userId }) {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(payload)) {
            fields.push(`${key} = $${idx++}`);
            values.push(value);
        }

        if (!fields.length) {
            throw new Error("No fields to update");
        }

        // audit fields
        fields.push(`updated_by = $${idx++}`);
        fields.push(`updated_on = now()`);

        values.push(userId);

        const { rows } = await this.#DB.query(
            `
        UPDATE public.sidebar_links
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING *
      `,
            [...values, id]
        );

        return rows[0] ?? null;
    }

    /**
     * DELETE sidebar link
     * (children auto-deleted via FK)
     */
    async delete({ id }) {
        await this.#DB.query(
            `
        DELETE FROM public.sidebar_links
        WHERE id = $1
      `,
            [id]
        );

        return true;
    }
}

const sidebarLinkService = new SidebarLinkService();
Object.freeze(sidebarLinkService);

export default sidebarLinkService;
