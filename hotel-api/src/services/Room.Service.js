import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class RoomService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async bulkCreateRooms({
        propertyId,
        floors,          // [{ floor_number, rooms_count }]
        prefix = "",
        roomSerialNumber = 101,
        createdBy,
    }) {
        if (!Array.isArray(floors) || floors.length === 0) {
            return [];
        }

        /**
         * 1. Get room_type_id (STANDARD / Double Bed / AC)
         */
        const roomTypeRateQuery = `
        SELECT id
        FROM public.room_type_rates
        WHERE property_id = $1
          AND room_category_name = 'Standard'
          AND bed_type_name = 'Double Bed'
          AND ac_type_name = 'AC'
        LIMIT 1
    `;

        const roomTypeRes = await this.#DB.query(roomTypeRateQuery, [propertyId]);

        if (roomTypeRes.rowCount === 0) {
            throw new Error(
                "Room type rate not found for Standard / Double Bed / AC"
            );
        }

        const roomTypeId = roomTypeRes.rows[0].id;

        /**
         * 2. Bulk insert rooms
         */
        const values = [];
        const bindings = [];
        let i = 1;

        for (const floor of floors) {
            const floorNumber = floor.floor_number;
            const roomCount = floor.rooms_count;

            for (let roomIndex = 1; roomIndex <= roomCount; roomIndex++) {
                const roomNoNumber =
                    roomSerialNumber + (floorNumber * 100) + (roomIndex - 1);

                const roomNo = `${prefix}${roomNoNumber}`;

                values.push(`(
                $${i++},  -- room_no
                $${i++},  -- room_type (STRING)
                $${i++},  -- room_type_id (FK)
                $${i++},  -- property_id
                $${i++},  -- floor_number
                true,
                $${i++},  -- created_by
                now(),
                $${i++},  -- updated_by
                now()
            )`);

                bindings.push(
                    roomNo,
                    "STANDARD",
                    roomTypeId,
                    propertyId,
                    floorNumber,
                    createdBy,
                    createdBy
                );
            }
        }

        const query = `
        INSERT INTO public.ref_rooms (
            room_no,
            room_type,
            room_type_id,
            property_id,
            floor_number,
            is_active,
            created_by,
            created_on,
            updated_by,
            updated_on
        )
        VALUES ${values.join(",")}
        ON CONFLICT (property_id, lower(room_no)) DO NOTHING
        RETURNING id, room_no, floor_number
    `;

        const { rows } = await this.#DB.query(query, bindings);
        return rows;
    }

    async getRoomsByProperty(propertyId) {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.ref_rooms
        WHERE property_id = $1
        ORDER BY floor_number, room_no
        `,
            [propertyId]
        );
        return rows;
    }

    async getRoomByNumber({ propertyId, roomNo }) {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.ref_rooms
        WHERE property_id = $1
          AND lower(room_no) = lower($2)
        `,
            [propertyId, roomNo]
        );
        return rows[0];
    }

    async getRoomById(roomId) {
        const { rows } = await this.#DB.query(
            `SELECT * FROM public.ref_rooms WHERE id = $1`,
            [roomId]
        );
        return rows[0];
    }

    /**
   * Get room numbers by booking ID
   * @param {bigint} bookingId
   */
    async getRoomNumbersByBookingId(bookingId) {
        if (!bookingId) {
            throw new Error("bookingId is required");
        }

        const query = `
            SELECT
                rd.ref_room_id,
                r.room_no
            FROM public.room_details rd
            JOIN public.ref_rooms r
                ON r.id = rd.ref_room_id
            WHERE rd.booking_id = $1
              AND rd.is_active = true
            ORDER BY r.room_no
        `;

        const { rows } = await this.#DB.query(query, [bookingId]);
        return rows;
    }

    async bulkUpdateRooms({ updates, updatedBy }) {
        if (!Array.isArray(updates) || updates.length === 0) {
            return [];
        }

        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const ids = updates.map(u => u.id);

            const { rows: existingRooms } = await client.query(
                `
            SELECT id, property_id, floor_number, is_active, room_type_id
            FROM public.ref_rooms
            WHERE id = ANY($1)
            FOR UPDATE
            `,
                [ids]
            );

            const roomMap = new Map(existingRooms.map(r => [r.id, r]));

            const roomTypeCases = [];
            const activeCases = [];
            const bindings = [];
            let i = 1;

            for (const u of updates) {
                if (u.room_type_id !== undefined) {
                    roomTypeCases.push(`WHEN id = $${i} THEN $${i + 1}`);
                    bindings.push(u.id, u.room_type_id);
                    i += 2;
                }

                if (u.is_active !== undefined) {
                    activeCases.push(`WHEN id = $${i} THEN $${i + 1}`);
                    bindings.push(u.id, u.is_active);
                    i += 2;
                }
            }

            // 🔑 Build SET clauses safely
            const setClauses = [];

            if (roomTypeCases.length) {
                setClauses.push(`
                room_type_id = CASE
                    ${roomTypeCases.join(" ")}
                    ELSE room_type_id
                END
            `);
            }

            if (activeCases.length) {
                setClauses.push(`
                is_active = CASE
                    ${activeCases.join(" ")}
                    ELSE is_active
                END
            `);
            }

            bindings.push(updatedBy);
            bindings.push(ids);

            const updateQuery = `
            UPDATE public.ref_rooms
            SET
                ${setClauses.join(",")},
                updated_by = $${i},
                updated_on = NOW()
            WHERE id = ANY($${i + 1})
            RETURNING id, property_id, floor_number, is_active, room_type_id
        `;

            const { rows: updatedRooms } =
                await client.query(updateQuery, bindings);

            /* -------- FLOOR COUNTS (unchanged) -------- */
            const floorDelta = new Map();

            for (const updated of updatedRooms) {
                const prev = roomMap.get(updated.id);
                if (!prev) continue;

                if (!prev.is_active && updated.is_active) {
                    const key = `${updated.property_id}_${updated.floor_number}`;
                    floorDelta.set(key, (floorDelta.get(key) || 0) + 1);
                }

                if (prev.is_active && !updated.is_active) {
                    const key = `${updated.property_id}_${updated.floor_number}`;
                    floorDelta.set(key, (floorDelta.get(key) || 0) - 1);
                }
            }

            for (const [key, delta] of floorDelta.entries()) {
                if (delta === 0) continue;

                const [propertyId, floorNumber] = key.split("_");

                await client.query(
                    `
                UPDATE public.property_floors
                SET
                    rooms_count = GREATEST(rooms_count + $3, 0),
                    updated_by = $4,
                    updated_at = NOW()
                WHERE property_id = $1
                  AND floor_number = $2
                `,
                    [Number(propertyId), Number(floorNumber), delta, updatedBy]
                );
            }

            /* -------- PROPERTY COUNTS (unchanged) -------- */
            const propertyDelta = new Map();

            for (const updated of updatedRooms) {
                const prev = roomMap.get(updated.id);
                if (!prev) continue;

                if (!prev.is_active && updated.is_active) {
                    propertyDelta.set(
                        updated.property_id,
                        (propertyDelta.get(updated.property_id) || 0) + 1
                    );
                }

                if (prev.is_active && !updated.is_active) {
                    propertyDelta.set(
                        updated.property_id,
                        (propertyDelta.get(updated.property_id) || 0) - 1
                    );
                }
            }

            for (const [propertyId, delta] of propertyDelta.entries()) {
                if (delta === 0) continue;

                await client.query(
                    `
                UPDATE public.properties
                SET
                    total_rooms = GREATEST(COALESCE(total_rooms, 0) + $2, 0),
                    updated_by = $3,
                    updated_on = NOW()
                WHERE id = $1
                `,
                    [propertyId, delta, updatedBy]
                );
            }

            await client.query("COMMIT");
            return updatedRooms;

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async addRoom({
        propertyId,
        floorNumber,
        roomTypeId,
        createdBy,
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const { rows: maxFloorRows } = await client.query(
                `
                SELECT COALESCE(MAX(floor_number), -1) AS max_floor
                FROM public.property_floors
                WHERE property_id = $1
                `,
                [propertyId]
            );

            const currentMaxFloor = Number(maxFloorRows[0].max_floor);

            if (floorNumber > currentMaxFloor) {
                for (let f = currentMaxFloor + 1; f <= floorNumber; f++) {
                    await client.query(
                        `
                    INSERT INTO public.property_floors (
                        property_id,
                        floor_number,
                        rooms_count,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    )
                    VALUES ($1, $2, 0, $3, now(), $3, now())
                    ON CONFLICT (property_id, floor_number) DO NOTHING
                    `,
                        [propertyId, f, createdBy]
                    );
                }
            }

            const { rows: lastRoomRows } = await client.query(
                `
            SELECT room_no
            FROM public.ref_rooms
            WHERE property_id = $1
            AND floor_number = $2
            ORDER BY CAST(regexp_replace(room_no, '\\D', '', 'g') AS INT) DESC
            LIMIT 1
            FOR UPDATE
            `,
                [propertyId, floorNumber]
            );

            let prefix = "";
            let nextRoomNumber;
            let width;

            if (lastRoomRows.length > 0) {
                const lastRoomNo = lastRoomRows[0].room_no;
                // const numeric = parseInt(lastRoomNo.replace(/\D/g, ""), 10);
                const numericPart = lastRoomNo.replace(/\D/g, "");
                const numeric = parseInt(numericPart, 10);
                width = numericPart.length;

                prefix = lastRoomNo.replace(/\d/g, "");
                nextRoomNumber = numeric + 1;

            } else {
                const { rows: baseRows } = await client.query(
                    `
                SELECT room_no, floor_number
                FROM public.ref_rooms
                WHERE property_id = $1
                ORDER BY floor_number ASC,
                         CAST(regexp_replace(room_no, '\\D', '', 'g') AS INT) ASC
                LIMIT 1
                FOR UPDATE
                `,
                    [propertyId]
                );

                if (baseRows.length === 0) {
                    throw new Error(
                        "No existing rooms found. Run bulk room creation first."
                    );
                }

                const baseRoomNo = baseRows[0].room_no;
                const baseFloor = baseRows[0].floor_number;

                const baseNumericPart = baseRoomNo.replace(/\D/g, "");
                const baseNumeric = parseInt(baseNumericPart, 10);
                width = baseNumericPart.length;

                prefix = baseRoomNo.replace(/\d/g, "");

                nextRoomNumber =
                    baseNumeric + (floorNumber - baseFloor) * 100;

            }

            // const finalRoomNo = `${prefix}${nextRoomNumber}`;
            const paddedNumber = String(nextRoomNumber).padStart(width, "0");
            const finalRoomNo = `${prefix}${paddedNumber}`;


            const { rows } = await client.query(
                `
                INSERT INTO public.ref_rooms (
                    room_no,
                    room_type_id,
                    property_id,
                    floor_number,
                    is_active,
                    created_by,
                    created_on,
                    updated_by,
                    updated_on,
                    room_type
                )
                VALUES ($1, $2, $3, $4, true, $5, now(), $5, now(), $6)
                RETURNING id, room_no, floor_number
                `,
                [finalRoomNo, roomTypeId, propertyId, floorNumber, createdBy, "STANDARD"]
            );

            await client.query(
                `
                UPDATE public.property_floors
                SET
                    rooms_count = rooms_count + 1,
                    updated_by = $3,
                    updated_at = now()
                WHERE property_id = $1
                AND floor_number = $2
                `,
                [propertyId, floorNumber, createdBy]
            );

            await client.query(
                `
                UPDATE public.properties
                SET
                    total_rooms = COALESCE(total_rooms, 0) + 1,
                    total_floors = GREATEST(
                        COALESCE(total_floors, 0),
                        $2 + 1
                    ),
                    updated_by = $3,
                    updated_on = now()
                WHERE id = $1
                `,
                [propertyId, floorNumber, createdBy]
            );

            await client.query("COMMIT");
            return rows[0];

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteRoom({ roomId, deletedBy }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const { rows } = await client.query(
                `
            SELECT id, property_id, floor_number, is_active
            FROM public.ref_rooms
            WHERE id = $1
            FOR UPDATE
            `,
                [roomId]
            );

            if (!rows.length) {
                throw new Error("Room not found");
            }

            const room = rows[0];

            if (!room.is_active) {
                throw new Error("Room already inactive");
            }

            await client.query(
                `
            UPDATE public.ref_rooms
            SET
                is_active = false,
                updated_by = $2,
                updated_on = now()
            WHERE id = $1
            `,
                [roomId, deletedBy]
            );

            await client.query(
                `
            UPDATE public.property_floors
            SET
                rooms_count = GREATEST(rooms_count - 1, 0),
                updated_by = $3,
                updated_at = now()
            WHERE property_id = $1
              AND floor_number = $2
            `,
                [room.property_id, room.floor_number, deletedBy]
            );

            await client.query(
                `
                UPDATE public.properties
                SET
                    total_rooms = GREATEST(COALESCE(total_rooms, 0) - 1, 0),
                    updated_by = $2,
                    updated_on = now()
                WHERE id = $1
                `,
                [room.property_id, deletedBy]
            );

            await client.query("COMMIT");

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async getAvailableRooms({
        propertyId,
        arrivalDate,
        departureDate,
        roomTypeId, // optional filter
        limit = 50,
        offset = 0,
    }) {
        const baseParams = [propertyId, arrivalDate, departureDate];
        let roomTypeFilter = "";
        if (roomTypeId) {
            baseParams.push(roomTypeId);
            roomTypeFilter = `AND r.room_type_id = $${baseParams.length}`;
        }

        const availabilityQuery = `
            SELECT r.id
            FROM public.ref_rooms r
            WHERE r.property_id = $1
            AND r.is_active = true
            ${roomTypeFilter}
            AND NOT EXISTS (
                SELECT 1
                FROM public.room_details rd
                JOIN public.bookings b ON b.id = rd.booking_id
                WHERE rd.ref_room_id = r.id
                AND rd.is_cancelled = false
                AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'NO_SHOW')
                AND (b.estimated_arrival < $3 AND COALESCE(b.actual_departure, b.estimated_departure) > $2)
            )
        `;

        const [roomsResult, filterResult] = await Promise.all([
            this.#DB.query(`
                SELECT
                    r.id, r.room_no, r.floor_number,
                    rtr.room_category_name, rtr.bed_type_name, rtr.ac_type_name, rtr.base_price
                FROM public.ref_rooms r
                JOIN public.room_type_rates rtr ON rtr.id = r.room_type_id AND rtr.property_id = r.property_id
                WHERE r.id IN (${availabilityQuery})
                ORDER BY rtr.base_price, r.room_no
                LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}
            `, [...baseParams, limit, offset]),

            this.#DB.query(`
                SELECT 
                    array_agg(DISTINCT rtr.room_category_name) AS categories,
                    array_agg(DISTINCT rtr.bed_type_name) AS bed_types,
                    array_agg(DISTINCT rtr.ac_type_name) AS ac_types,
                    array_agg(DISTINCT r.floor_number) AS floors
                FROM public.ref_rooms r
                JOIN public.room_type_rates rtr ON rtr.id = r.room_type_id AND rtr.property_id = r.property_id
                WHERE r.id IN (${availabilityQuery})
            `, baseParams)
        ]);

        return {
            rooms: roomsResult.rows,
            filters: {
                categories: filterResult.rows[0]?.categories?.filter(Boolean) || [],
                bedTypes: filterResult.rows[0]?.bed_types?.filter(Boolean) || [],
                acTypes: filterResult.rows[0]?.ac_types?.filter(Boolean) || [],
                floors: filterResult.rows[0]?.floors?.sort((a, b) => a - b) || []
            }
        };
    }

    async checkRoomAvailability({
        roomId,
        arrivalDate,
        departureDate,
    }) {
        const { rowCount } = await this.#DB.query(
            `
            SELECT 1
            FROM public.room_details rd
            JOIN public.bookings b
            ON b.id = rd.booking_id
            WHERE rd.ref_room_id = $1
            AND b.booking_status IN ('RESERVED','CONFIRMED','CHECKED_IN')
            AND (
                b.estimated_arrival < $3
                AND b.estimated_departure > $2
            )
            LIMIT 1
            `,
            [roomId, arrivalDate, departureDate]
        )

        return rowCount === 0
    }

    async getAllRoomTypes() {
        const [categories, bedTypes, acTypes] = await Promise.all([
            this.#DB.query(`SELECT * FROM room_categories ORDER BY name`),
            this.#DB.query(`SELECT * FROM bed_types ORDER BY name`),
            this.#DB.query(`SELECT * FROM ac_types ORDER BY name`)
        ]);

        return {
            room_categories: categories.rows,
            bed_types: bedTypes.rows,
            ac_types: acTypes.rows
        };
    }

    // async getDailyRoomStatus({
    //     propertyId,
    //     date = null, // defaults to today
    // }) {
    //     const params = [propertyId, date];

    //     const query = `
    //     WITH target_day AS (
    //         SELECT COALESCE($2::date, CURRENT_DATE) AS day
    //     ),

    //     room_status AS (
    //         SELECT DISTINCT ON (r.id)
    //             r.id AS ref_room_id,
    //             r.room_no,
    //             r.floor_number,
    //             r.dirty,

    //             -- room type info
    //             rtr.room_category_name,
    //             rtr.bed_type_name,
    //             rtr.ac_type_name,

    //             b.booking_status,
    //             b.pickup,
    //             b.drop,

    //             CASE
    //                 WHEN b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'NO_SHOW')
    //                     AND b.estimated_arrival::date <= td.day
    //                     AND COALESCE(b.actual_departure::date, b.estimated_departure::date) > td.day
    //                     THEN b.booking_status

    //                 WHEN b.booking_status = 'CHECKED_OUT'
    //                     THEN CASE
    //                         WHEN r.dirty = true THEN 'DIRTY'
    //                         ELSE 'FREE'
    //                     END

    //                 ELSE 'FREE'
    //             END AS status

    //         FROM public.ref_rooms r
    //         CROSS JOIN target_day td

    //         LEFT JOIN public.room_type_rates rtr
    //             ON rtr.id = r.room_type_id

    //         LEFT JOIN public.room_details rd
    //             ON rd.ref_room_id = r.id
    //             AND rd.is_cancelled = false

    //         LEFT JOIN public.bookings b
    //             ON b.id = rd.booking_id
    //             AND b.booking_status IN (
    //                 'CONFIRMED',
    //                 'CHECKED_IN',
    //                 'CHECKED_OUT',
    //                 'NO_SHOW'
    //             )
    //             AND b.estimated_arrival::date <= td.day
    //             AND COALESCE(b.actual_departure::date, b.estimated_departure::date) >= td.day

    //         WHERE r.property_id = $1
    //         AND r.is_active = true

    //         ORDER BY r.id,
    //                 CASE b.booking_status
    //                     WHEN 'CHECKED_IN' THEN 1
    //                     WHEN 'CONFIRMED' THEN 2
    //                     WHEN 'NO_SHOW' THEN 3
    //                     WHEN 'CHECKED_OUT' THEN 4
    //                     ELSE 5
    //                 END
    //     ),

    //     summary AS (
    //         SELECT
    //             COUNT(*) FILTER (WHERE status = 'CHECKED_IN') AS checked_in,
    //             COUNT(*) FILTER (WHERE status = 'CONFIRMED')  AS confirmed,
    //             COUNT(*) FILTER (WHERE status = 'NO_SHOW')    AS no_show,
    //             COUNT(*) FILTER (WHERE status = 'FREE')       AS free,
    //             COUNT(*) FILTER (WHERE status = 'DIRTY')      AS dirty
    //         FROM room_status
    //     ),

    //     checking_in AS (
    //         SELECT json_agg(
    //             json_build_object(
    //                 'room_no', r.room_no,
    //                 'room_category', rtr.room_category_name,
    //                 'bed_type', rtr.bed_type_name,
    //                 'ac_type', rtr.ac_type_name,
    //                 'pickup', b.pickup,
    //                 'drop', b.drop
    //             )
    //         )
    //         FROM public.room_details rd
    //         JOIN public.ref_rooms r ON r.id = rd.ref_room_id
    //         LEFT JOIN public.room_type_rates rtr ON rtr.id = r.room_type_id
    //         JOIN public.bookings b ON b.id = rd.booking_id
    //         JOIN target_day td ON true
    //         WHERE r.property_id = $1
    //         AND b.estimated_arrival::date = td.day
    //         AND b.booking_status IN ('CONFIRMED','CHECKED_IN','NO_SHOW')
    //     ),

    //     checking_out AS (
    //         SELECT json_agg(
    //             json_build_object(
    //                 'room_no', r.room_no,
    //                 'room_category', rtr.room_category_name,
    //                 'bed_type', rtr.bed_type_name,
    //                 'ac_type', rtr.ac_type_name,
    //                 'pickup', b.pickup,
    //                 'drop', b.drop
    //             )
    //         )
    //         FROM public.room_details rd
    //         JOIN public.ref_rooms r ON r.id = rd.ref_room_id
    //         LEFT JOIN public.room_type_rates rtr ON rtr.id = r.room_type_id
    //         JOIN public.bookings b ON b.id = rd.booking_id
    //         JOIN target_day td ON true
    //         WHERE r.property_id = $1
    //         AND COALESCE(b.actual_departure::date, b.estimated_departure::date) = td.day
    //         AND b.booking_status = 'CHECKED_OUT'
    //     )

    //     SELECT
    //         (SELECT day FROM target_day) AS date,
    //         (SELECT row_to_json(summary) FROM summary) AS summary,
    //         (SELECT json_agg(room_status ORDER BY floor_number, room_no) FROM room_status) AS rooms,
    //         COALESCE((SELECT * FROM checking_in), '[]'::json) AS checking_in,
    //         COALESCE((SELECT * FROM checking_out), '[]'::json) AS checking_out;
    //     `;

    //     const { rows } = await this.#DB.query(query, params);
    //     return rows[0];
    // }

    async getDailyRoomStatus({ propertyId, date }) {
        const targetDate = date || new Date().toISOString().split("T")[0];

        const query = `
            WITH target_day AS (
                SELECT $2::date AS day
            ),

            active_rooms AS (
                SELECT
                    r.id AS ref_room_id,
                    r.room_no,
                    r.floor_number,
                    r.dirty,
                    r.property_id,
                    r.room_type_id,
                    r.is_active
                FROM ref_rooms r
                WHERE r.property_id = $1
                AND r.is_active = true
            ),

            room_meta AS (
                SELECT
                    ar.*, 
                    rtr.room_category_name,
                    rtr.bed_type_name,
                    rtr.ac_type_name
                FROM active_rooms ar
                LEFT JOIN room_type_rates rtr
                ON rtr.id = ar.room_type_id
            ),

            booking_overlap AS (
                SELECT
                    rd.ref_room_id,
                    b.id AS booking_id,
                    b.booking_status,
                    b.estimated_arrival,
                    COALESCE(b.actual_departure, b.estimated_departure) AS effective_departure,
                    b.actual_arrival,
                    b.actual_departure,
                    b.pickup,
                    b.drop,
                    rd.is_cancelled
                FROM room_details rd
                JOIN bookings b ON b.id = rd.booking_id
                JOIN target_day td ON (
                    td.day >= b.estimated_arrival::date
                    AND td.day < COALESCE(b.actual_departure, b.estimated_departure)::date
                )
                WHERE rd.is_cancelled = false
            ),

            resolved AS (
                SELECT
                    rm.ref_room_id,
                    rm.room_no,
                    rm.floor_number,
                    rm.dirty,
                    rm.room_category_name,
                    rm.bed_type_name,
                    rm.ac_type_name,
                    bo.booking_status,
                    bo.pickup,
                    bo.drop,
                    CASE
                        WHEN bo.booking_status = 'CHECKED_IN' THEN 'CHECKED_IN'
                        WHEN bo.booking_status = 'CHECKED_OUT' AND rm.dirty = true THEN 'DIRTY'
                        WHEN bo.booking_status = 'CHECKED_OUT' AND rm.dirty = false THEN 'FREE'
                        WHEN bo.booking_status IN ('BOOKED','CONFIRMED') THEN 'BOOKED'
                        WHEN bo.booking_id IS NULL THEN 'FREE'
                        ELSE 'FREE'
                    END AS status
                FROM room_meta rm
                LEFT JOIN booking_overlap bo
                ON bo.ref_room_id = rm.ref_room_id
            ),

            checking_in AS (
                SELECT DISTINCT
                    rm.room_no,
                    rm.room_category_name,
                    rm.bed_type_name,
                    rm.ac_type_name,
                    bo.pickup,
                    bo.drop
                FROM room_meta rm
                JOIN booking_overlap bo ON bo.ref_room_id = rm.ref_room_id
                JOIN target_day td ON true
                WHERE bo.booking_status IN ('BOOKED','CONFIRMED')
                AND bo.actual_arrival IS NULL
                AND bo.estimated_arrival::date = td.day
            ),

            checking_out AS (
                SELECT DISTINCT
                    rm.room_no,
                    rm.room_category_name,
                    rm.bed_type_name,
                    rm.ac_type_name,
                    bo.pickup,
                    bo.drop
                FROM room_meta rm
                JOIN booking_overlap bo ON bo.ref_room_id = rm.ref_room_id
                JOIN target_day td ON true
                WHERE bo.booking_status = 'CHECKED_IN'
                AND bo.actual_departure IS NULL
                AND COALESCE(bo.actual_departure, bo.effective_departure)::date = td.day
            )

            SELECT
            (SELECT day FROM target_day) AS date,
            jsonb_build_object(
                'checked_in', COUNT(*) FILTER (WHERE status = 'CHECKED_IN'),
                'confirmed', COUNT(*) FILTER (WHERE status = 'BOOKED'),
                'no_show', 0,
                'free', COUNT(*) FILTER (WHERE status = 'FREE'),
                'dirty', COUNT(*) FILTER (WHERE status = 'DIRTY')
            ) AS summary,

            jsonb_agg(jsonb_build_object(
                'ref_room_id', ref_room_id,
                'room_no', room_no,
                'floor_number', floor_number,
                'dirty', dirty,
                'room_category_name', room_category_name,
                'bed_type_name', bed_type_name,
                'ac_type_name', ac_type_name,
                'booking_status', booking_status,
                'pickup', pickup,
                'drop', drop,
                'status', status
            ) ORDER BY floor_number, room_no) AS rooms,

            (SELECT jsonb_agg(ci) FROM checking_in ci) AS checking_in,
            (SELECT jsonb_agg(co) FROM checking_out co) AS checking_out

            FROM resolved;
            `;

        const { rows } = await this.#DB.query(query, [propertyId, targetDate]);

        return rows[0];
    }

    async cancelBookingRoom({
        bookingId,
        refRoomId,
        cancelledBy,
        comments
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            // lock the room row
            const { rows } = await client.query(
                `
                SELECT id, is_cancelled
                FROM public.room_details
                WHERE booking_id = $1
                AND ref_room_id = $2
                FOR UPDATE
                `,
                [bookingId, refRoomId]
            );

            if (!rows.length) {
                throw new Error("Room not found in booking");
            }

            if (rows[0].is_cancelled) {
                throw new Error("Room already cancelled");
            }

            // cancel only this room
            await client.query(
                `
                UPDATE public.room_details
                SET
                    is_cancelled = true,
                    cancelled_on = now(),
                    cancelled_by = $3
                WHERE booking_id = $1
                AND ref_room_id = $2
                `,
                [bookingId, refRoomId, cancelledBy]
            );

            /**
             * If all rooms are cancelled → cancel booking automatically
             */
            const { rows: activeRooms } = await client.query(
                `
                SELECT 1
                FROM public.room_details
                WHERE booking_id = $1
                AND is_cancelled = false
                LIMIT 1
                `,
                [bookingId]
            );

            if (activeRooms.length === 0) {
                await client.query(
                    `
                    UPDATE public.bookings
                    SET
                        booking_status = 'CANCELLED',
                        is_active = false,
                        comments = COALESCE($2, comments),
                        updated_by = $3,
                        updated_on = now()
                    WHERE id = $1
                    `,
                    [bookingId, comments, cancelledBy]
                );
            }

            await client.query("COMMIT");

            try {
                const query = `
                            SELECT property_id
                            FROM public.bookings
                            WHERE id = $1
                            `;

                const result = await db.query(query, [bookingId]);
                const propertyId = result.rows[0]?.property_id;

                await AuditService.log({
                    property_id: propertyId,
                    event_id: bookingId,
                    table_name: "room_details",
                    event_type: "CANCEL",
                    task_name: "Cancel Booking Room",
                    comments: "Room cancelled from booking",
                    details: JSON.stringify({
                        booking_id: bookingId,
                        ref_room_id: refRoomId,
                        comments
                    }),
                    user_id: cancelledBy
                });

            } catch (error) {

            }

            return {
                message: "Room cancelled successfully"
            };

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async getAllRoomsMeta({ propertyId }) {

        const query = `
                WITH active_rooms AS (
                    SELECT
                        r.id AS ref_room_id,
                        r.room_no,
                        r.floor_number,
                        r.room_type_id
                    FROM ref_rooms r
                    WHERE r.property_id = $1
                    AND r.is_active = true
                ),

                room_meta AS (
                    SELECT
                        ar.ref_room_id,
                        ar.room_no,
                        ar.floor_number,
                        rtr.room_category_name,
                        rtr.bed_type_name,
                        rtr.ac_type_name
                    FROM active_rooms ar
                    LEFT JOIN room_type_rates rtr
                    ON rtr.id = ar.room_type_id
                )

                SELECT
                    jsonb_agg(
                        jsonb_build_object(
                            'ref_room_id', ref_room_id,
                            'room_no', room_no,
                            'floor_number', floor_number,
                            'room_category_name', room_category_name,
                            'bed_type_name', bed_type_name,
                            'ac_type_name', ac_type_name
                        )
                        ORDER BY floor_number, room_no
                    ) AS rooms
                FROM room_meta;
            `;

        const { rows } = await this.#DB.query(query, [propertyId]);

        return rows[0]?.rooms || [];
    }

}

export default Object.freeze(new RoomService())