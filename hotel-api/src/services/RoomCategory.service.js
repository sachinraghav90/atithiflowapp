import { generateRefRoomTypes } from "../../utils/generateRefRoomTypes.js";
import { getDb } from "../../utils/getDb.js";

class RoomCategoryService {

    #DB

    constructor() {
        this.#DB = getDb();
    }

    async getAll() {
        const { rows } = await this.#DB.query(
            `SELECT * FROM room_categories ORDER BY name`
        );
        return rows;
    }

    async create({ name, description, userId }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO room_categories (name, description, created_by)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [name, description, userId]
        );
        await generateRefRoomTypes(this.#DB, userId)
        return rows[0];
    }

    async updateById(id, { name, description, userId }) {
        const { rows } = await this.#DB.query(
            `
            UPDATE room_categories
            SET
                name = $1,
                description = $2,
                updated_by = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
            `,
            [name, description, userId, id]
        );
        return rows[0];
    }
}

export default Object.freeze(new RoomCategoryService())