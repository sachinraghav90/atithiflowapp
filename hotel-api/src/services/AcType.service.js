import { generateRefRoomTypes } from "../../utils/generateRefRoomTypes.js";
import { getDb } from "../../utils/getDb.js";

class AcTypeService {

    #DB

    constructor() {
        this.#DB = getDb();
    }

    async getAll() {
        const { rows } = await this.#DB.query(
            `SELECT * FROM ac_types ORDER BY name`
        );
        return rows;
    }

    async create({ name, userId }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO ac_types (name, created_by)
            VALUES ($1, $2)
            RETURNING *
            `,
            [name, userId]
        );
        await generateRefRoomTypes(this.#DB, userId)
        return rows[0];
    }

    async updateById(id, { name, userId }) {
        const { rows } = await this.#DB.query(
            `
            UPDATE ac_types
            SET
                name = $1,
                updated_by = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [name, userId, id]
        );
        return rows[0];
    }
}

export default Object.freeze(new AcTypeService())