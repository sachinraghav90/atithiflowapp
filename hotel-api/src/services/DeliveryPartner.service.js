import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class DeliveryPartnerService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ===========================
       GET BY PROPERTY (PAGINATED)
    ============================ */
    async getByProperty({ propertyId, page = 1, limit = 10 }) {

        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
            SELECT *
            FROM delivery_partners
            WHERE property_id = $1
            ORDER BY name ASC
          --  LIMIT $2 OFFSET $3
            `,
            [propertyId,
                // limit, offset
            ]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM delivery_partners
            WHERE property_id = $1
            `,
            [propertyId]
        );

        const total = countRows[0].total;

        return rows
        // return {
        //     data: rows,
        //     pagination: {
        //         page,
        //         limit,
        //         total,
        //         totalPages: Math.ceil(total / limit)
        //     }
        // };
    }


    /* ===========================
       LIGHT LIST (Dropdown)
    ============================ */
    async getLightByProperty(propertyId) {

        const { rows } = await this.#DB.query(
            `
            SELECT id, name
            FROM delivery_partners
            WHERE property_id = $1
                AND is_active = true
            ORDER BY name ASC
            `,
            [propertyId]
        );

        return rows;
    }


    /* ===========================
       CREATE
    ============================ */
    async create({
        property_id,
        name,
        created_by
    }) {

        const { rows } = await this.#DB.query(
            `
            INSERT INTO delivery_partners (
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

        await AuditService.log({
            property_id,
            event_id: rows[0].id,
            table_name: "delivery_partners",
            event_type: "CREATE",
            task_name: "Create Delivery Partner",
            comments: "Delivery partner created",
            details: JSON.stringify({
                delivery_partner_id: rows[0].id,
                name
            }),
            user_id: created_by
        });

        return rows[0];
    }


    /* ===========================
       UPDATE
    ============================ */
    async updateById(id, { name, updated_by, is_active }) {

        const { rows } = await this.#DB.query(
            `
            UPDATE delivery_partners
            SET
                name = COALESCE($1, name),
                is_active = COALESCE($4, is_active),
                updated_by = $2,
                updated_on = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [
                name,
                updated_by,
                id,
                is_active
            ]
        );

        const partner = rows[0];

        if (partner) {
            await AuditService.log({
                property_id: partner.property_id,
                event_id: id,
                table_name: "delivery_partners",
                event_type: "UPDATE",
                task_name: "Update Delivery Partner",
                comments: "Delivery partner updated",
                details: JSON.stringify({
                    delivery_partner_id: id,
                    name: partner.name
                }),
                user_id: updated_by
            });
        }

        return partner;
    }


    /* ===========================
       DELETE
    ============================ */
    async deleteById(id, userId) {

        const { rows, rowCount } = await this.#DB.query(
            `
            DELETE FROM delivery_partners
            WHERE id = $1
            RETURNING id, property_id, name
            `,
            [id]
        );

        if (rowCount > 0) {

            await AuditService.log({
                property_id: rows[0].property_id,
                event_id: id,
                table_name: "delivery_partners",
                event_type: "DELETE",
                task_name: "Delete Delivery Partner",
                comments: "Delivery partner deleted",
                details: JSON.stringify({
                    delivery_partner_id: id,
                    name: rows[0].name
                }),
                user_id: userId
            });

            return true;
        }

        return false;
    }

}

export default Object.freeze(new DeliveryPartnerService());