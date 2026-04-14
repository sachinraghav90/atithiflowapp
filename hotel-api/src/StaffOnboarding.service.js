import { getDb } from "../utils/getDb.js"
import role from "./services/Role.service.js"
import StaffService from "./services/Staff.service.js"
import supabase from "./services/Supabase.service.js"
import userService from "./services/user.service.js"

class StaffOnboardingService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async createStaffWithUser({ payload, files, createdBy }) {

        const client = await this.#DB.connect()
        let authUserId

        try {

            const { data, error } = await supabase.createUser({
                email: payload.email,
                password: payload.password,
            })

            if (error) throw error

            authUserId = data.user.id

            await client.query("BEGIN")

            const user = await userService.createUser({
                client,
                authUserId,
                email: payload.email,
                propertyId: payload.property_id,
                created_by: createdBy
            })

            /* ---------------------------------- */
            /* ROLE ASSIGNMENT (NEW SOURCE)      */
            /* ---------------------------------- */

            for (const roleId of payload.role_ids) {

                await role.createUserRole({
                    client,
                    userId: user.id,
                    roleId,
                    propertyId: payload.property_id   // ⭐ NEW
                })

            }

            const staff = await StaffService.create({
                client,
                payload: { ...payload, user_id: user.id },
                files,
                userId: createdBy,
            })

            /* ---------- VISA SAVE ---------- */

            if (payload.nationality === "foreigner") {

                await client.query(`
                    INSERT INTO public.visa_details (
                        visa_number,
                        issued_date,
                        expiry_date,
                        staff_id
                    )
                    VALUES ($1,$2,$3,$4)
                `,
                    [
                        payload.visa_number,
                        payload.visa_issue_date,
                        payload.visa_expiry_date,
                        staff.id
                    ]
                )

            }

            await client.query("COMMIT")

            return { staff_id: staff.id, user_id: user.id }

        } catch (err) {

            console.log("🚀 createStaffWithUser error:", err)

            await client.query("ROLLBACK")

            if (authUserId) {
                await supabase.deleteUser(authUserId)
            }

            throw err

        } finally {

            client.release()

        }

    }


    async updateStaffWithUser({ staffId, payload, files, updatedBy }) {

        const client = await this.#DB.connect()

        try {

            await client.query("BEGIN")

            if (payload.email || payload.password) {

                await supabase.updateUser({
                    authUserId: payload.user_id,
                    email: payload.email,
                    password: payload.password
                })

            }

            await userService.updateUser({
                client,
                userId: payload.user_id,
                payload,
                updatedBy
            })

            /* ---------------------------------- */
            /* ROLE UPDATE (NEW SOURCE)          */
            /* ---------------------------------- */

            if (Array.isArray(payload.role_ids)) {

                // remove existing roles for property
                await client.query(`
                    DELETE FROM public.property_users
                    WHERE user_id = $1
                    AND property_id = $2
                `,
                    [payload.user_id, payload.property_id]
                )

                // reassign roles
                for (const roleId of payload.role_ids) {

                    await role.createUserRole({
                        client,
                        userId: payload.user_id,
                        roleId,
                        propertyId: payload.property_id
                    })

                }

            }

            await StaffService.update(
                staffId,
                payload,
                files,
                updatedBy,
                client
            )

            /* ---------- VISA UPDATE ---------- */

            if (payload.nationality === "foreigner") {

                const { rowCount } = await client.query(
                    `SELECT 1 FROM public.visa_details WHERE staff_id = $1`,
                    [staffId]
                )

                if (rowCount) {

                    await client.query(`
                        UPDATE public.visa_details
                        SET visa_number=$1,
                            issued_date=$2,
                            expiry_date=$3
                        WHERE staff_id=$4
                    `,
                        [
                            payload.visa_number,
                            payload.visa_issue_date,
                            payload.visa_expiry_date,
                            staffId
                        ]
                    )

                } else {

                    await client.query(`
                        INSERT INTO public.visa_details (
                            visa_number,
                            issued_date,
                            expiry_date,
                            staff_id
                        )
                        VALUES ($1,$2,$3,$4)
                    `,
                        [
                            payload.visa_number,
                            payload.visa_issue_date,
                            payload.visa_expiry_date,
                            staffId
                        ]
                    )

                }

            } else {

                await client.query(
                    `DELETE FROM public.visa_details WHERE staff_id=$1`,
                    [staffId]
                )

            }

            await client.query("COMMIT")

            return { staff_id: staffId, user_id: payload.user_id }

        } catch (err) {

            await client.query("ROLLBACK")

            console.error("updateStaffWithUser error:", err)

            throw err

        } finally {

            client.release()

        }

    }

    async updatePassword({ password, user_id }) {
        await supabase.updateUser({
            authUserId: user_id,
            password: password
        })
    }
}

export default Object.freeze(new StaffOnboardingService())
