import { getDb } from "../../utils/getDb.js"
import AuditService from "./Audit.service.js"

class VehicleService {

    #DB
    constructor() {
        this.#DB = getDb()
    }

    async upsertVehiclesByBooking({
        bookingId,
        vehicles,
        userId
    }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

            /* 🔒 Booking as source of truth */
            const { rows } = await client.query(
                `
                SELECT property_id
                FROM public.bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [bookingId]
            )

            if (!rows.length) {
                throw new Error("Booking not found")
            }

            const property_id = rows[0].property_id

            for (const vehicle of vehicles) {
                /* ------------------------------------
                   UPDATE FLOW (id present)
                ------------------------------------ */
                if (vehicle.id) {
                    const fields = []
                    const values = []
                    let i = 1

                    const set = (key, value) => {
                        fields.push(`${key} = $${i++}`)
                        values.push(value)
                    }

                    if (vehicle.vehicle_type !== undefined) set("vehicle_type", vehicle.vehicle_type)
                    if (vehicle.vehicle_name !== undefined) set("vehicle_name", vehicle.vehicle_name)
                    if (vehicle.vehicle_number !== undefined) set("vehicle_number", vehicle.vehicle_number)
                    if (vehicle.room_no !== undefined) set("room_no", vehicle.room_no)
                    if (vehicle.is_active !== undefined) set("is_active", vehicle.is_active)
                    if (vehicle.color !== undefined) set("color", vehicle.color)

                    if (!fields.length) continue

                    set("updated_by", userId)
                    fields.push("updated_on = now()")

                    await client.query(
                        `
                        UPDATE public.vehicles
                        SET ${fields.join(", ")}
                        WHERE id = $${i}
                            AND booking_id = $${i + 1}
                        `,
                        [...values, vehicle.id, bookingId]
                    )

                    await AuditService.log({
                        property_id,
                        event_id: vehicle.id,
                        table_name: "vehicles",
                        event_type: "UPDATE",
                        task_name: "Update Vehicle",
                        comments: "Vehicle updated",
                        details: JSON.stringify({
                            booking_id: bookingId,
                            vehicle_id: vehicle.id,
                            updates: vehicle
                        }),
                        user_id: userId
                    });

                }
                /* ------------------------------------
                   INSERT FLOW (no id)
                ------------------------------------ */
                else {
                    await client.query(
                        `
                        INSERT INTO public.vehicles (
                            booking_id,
                            property_id,
                            vehicle_type,
                            vehicle_name,
                            vehicle_number,
                            room_no,
                            created_by,
                            color
                        )
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                        `,
                        [
                            bookingId,
                            property_id,
                            vehicle.vehicle_type ?? null,
                            vehicle.vehicle_name ?? null,
                            vehicle.vehicle_number ?? null,
                            vehicle.room_no ?? null,
                            userId,
                            vehicle.color ?? null
                        ]
                    )

                    // await AuditService.log({
                    //     property_id,
                    //     event_id: null,
                    //     table_name: "vehicles",
                    //     event_type: "CREATE",
                    //     task_name: "Add Vehicle",
                    //     comments: "Vehicle added to booking",
                    //     details: JSON.stringify({
                    //         booking_id: bookingId,
                    //         vehicle
                    //     }),
                    //     user_id: userId
                    // });

                }
            }

            await client.query("COMMIT")

            return {
                message: "Vehicles saved successfully"
            }

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async getVehiclesByBooking(bookingId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
            id,
            vehicle_type,
            vehicle_name,
            vehicle_number,
            color,
            room_no,
            is_active,
            created_on,
            updated_on
            FROM public.vehicles
            WHERE booking_id = $1
            ORDER BY created_on DESC
            `,
            [bookingId]
        )

        return rows
    }
}

export default Object.freeze(new VehicleService())