import { getDb } from "../../utils/getDb.js";

class PropertyFloorService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async upsertFloor({
        property_id,
        floor_number,
        rooms_count,
        user_id = null,
    }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.property_floors (
                property_id,
                floor_number,
                rooms_count,
                created_by,
                updated_by
            )
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (property_id, floor_number)
            DO UPDATE SET
                rooms_count = EXCLUDED.rooms_count,
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
            RETURNING *
            `,
            [property_id, floor_number, rooms_count, user_id]
        );

        return rows[0];
    }

    async bulkUpsertFloors({
        property_id,
        floors,
        user_id = null,
    }) {
        if (!Array.isArray(floors) || floors.length === 0) {
            return [];
        }

        const values = [];
        const placeholders = floors.map((f, i) => {
            const base = i * 5;
            values.push(
                property_id,
                f.floor_number,
                f.rooms_count,
                user_id,
                user_id
            );
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
        });

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.property_floors (
                property_id,
                floor_number,
                rooms_count,
                created_by,
                updated_by
            )
            VALUES ${placeholders.join(",")}
            ON CONFLICT (property_id, floor_number)
            DO UPDATE SET
                rooms_count = EXCLUDED.rooms_count,
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
            RETURNING id
            `,
            values
        );

        return rows;
    }

    async getByPropertyId({ property_id }) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                id,
                property_id,
                floor_number,
                rooms_count,
                created_at,
                updated_at
            FROM public.property_floors
            WHERE property_id = $1
            ORDER BY floor_number
            `,
            [property_id]
        );

        return rows;
    }

    async deleteFloorsAbove({
        property_id,
        max_floor_number,
    }) {
        await this.#DB.query(
            `
            DELETE FROM public.property_floors
            WHERE property_id = $1
            AND floor_number > $2
            `,
            [property_id, max_floor_number]
        );
    }
}

const propertyFloorService = new PropertyFloorService();
Object.freeze(propertyFloorService);

export default propertyFloorService;
