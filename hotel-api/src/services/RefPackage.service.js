import { getDb } from "../../utils/getDb.js";

class RefPackageService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async create({ package_name, description }, userId) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.ref_packages (
                package_name,
                description,
                created_by
            )
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [package_name.trim(), description ?? null, userId]
        );

        return rows[0];
    }

    async updateById(id, { package_name, description }, userId) {
        const { rows } = await this.#DB.query(
            `
            UPDATE public.ref_packages
            SET
                package_name = COALESCE($2, package_name),
                description  = COALESCE($3, description),
                updated_by   = $4,
                updated_on   = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [
                id,
                package_name ? package_name.trim() : null,
                description ?? null,
                userId
            ]
        );

        return rows[0] ?? null;
    }

    async deleteById(id) {
        const { rows } = await this.#DB.query(
            `
            DELETE FROM public.ref_packages
            WHERE id = $1
            RETURNING id
            `,
            [id]
        );

        return rows[0] ?? null;
    }

    async getAll() {
        const { rows } = await this.#DB.query(
            `
            SELECT *
            FROM public.ref_packages
            ORDER BY package_name
            `
        );

        return rows;
    }
}

export default Object.freeze(new RefPackageService())