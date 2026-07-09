import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

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

        const oldFloors = await this.getByPropertyId({ property_id });
        const oldMap = new Map(oldFloors.map(f => [f.floor_number, f.rooms_count]));

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

        try {
            const changes = {};

            const newMap = new Map(floors.map(f => [f.floor_number, f.rooms_count]));

            for (const [floorNum, roomCount] of newMap.entries()) {
                if (!oldMap.has(floorNum)) {
                    changes[`Floor ${floorNum}`] = { old: "None", new: `Added with ${roomCount} rooms` };
                } else if (oldMap.get(floorNum) !== roomCount) {
                    changes[`Floor ${floorNum} Rooms Count`] = { old: String(oldMap.get(floorNum)), new: String(roomCount) };
                }
            }

            for (const floorNum of oldMap.keys()) {
                if (!newMap.has(floorNum)) {
                    // This is technically handled by deleteFloorsAbove, but just in case
                    changes[`Floor ${floorNum}`] = { old: `Had ${oldMap.get(floorNum)} rooms`, new: "Removed" };
                }
            }

            if (Object.keys(changes).length > 0) {
                await AuditService.log({
                    property_id,
                    event_id: property_id,
                    table_name: "properties",
                    event_type: "UPDATE",
                    task_name: "Update Property Floors",
                    comments: "Property floors updated",
                    details: JSON.stringify(changes),
                    user_id
                });
            }
        } catch (error) {
            console.error("Audit log failed for property floors:", error);
        }

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
