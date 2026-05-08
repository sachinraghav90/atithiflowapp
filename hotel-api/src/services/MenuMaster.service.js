import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class MenuMasterService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ===============================
       GET BY PROPERTY (PAGINATED)
    =============================== */

    async getByProperty({ propertyId, page = 1, limit = 10 }) {

        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
            SELECT
                m.id,
                m.property_id,
                m.item_name,
                m.menu_item_group_id,
                g.name AS menu_item_group,
                m.price,
                m.is_active,
                m.is_veg,
                m.description,
                m.prep_time,
                m.created_on,
                m.updated_on
            FROM public.menu_master m
            LEFT JOIN public.menu_item_groups g
                ON g.id = m.menu_item_group_id
            WHERE m.property_id = $1
            ORDER BY m.item_name
            LIMIT $2 OFFSET $3
            `,
            [propertyId, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM public.menu_master
            WHERE property_id = $1
            `,
            [propertyId]
        );

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit),
            }
        };
    }

    /* ===============================
       GET IMAGE
    =============================== */

    async getImageById(id) {
        const { rows } = await this.#DB.query(
            `
            SELECT image, image_mime
            FROM public.menu_master
            WHERE id = $1
            `,
            [id]
        );

        return rows[0] || null;
    }

    /* ===============================
       LIGHT LIST
    =============================== */

    async getIdNameStatusByProperty(propertyId) {

        const { rows } = await this.#DB.query(
            `
            SELECT
                id,
                item_name,
                is_active,
                price,
                menu_item_group_id
            FROM public.menu_master
            WHERE property_id = $1
            ORDER BY item_name
            `,
            [propertyId]
        );

        return rows;
    }

    /* ===============================
       CREATE
    =============================== */

    async create({
        propertyId,
        itemName,
        menuItemGroupId,
        price,
        isActive = true,
        isVeg = false,
        description,
        image,
        imageMime,
        prepTime,
        userId
    }) {

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.menu_master (
                property_id,
                item_name,
                menu_item_group_id,
                price,
                is_active,
                is_veg,
                description,
                image,
                image_mime,
                prep_time,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
            `,
            [
                propertyId,
                itemName,
                menuItemGroupId,
                price,
                isActive,
                isVeg,
                description,
                image,
                imageMime,
                prepTime,
                userId
            ]
        );

        await AuditService.log({
            property_id: propertyId,
            event_id: rows[0].id,
            table_name: "menu_master",
            event_type: "CREATE",
            task_name: "Create Menu Item",
            comments: "Menu item created",
            details: JSON.stringify(rows[0]),
            user_id: userId
        });

        return rows[0];
    }

    /* ===============================
       UPDATE
    =============================== */

    async updateById(id, {

        itemName,
        menuItemGroupId,
        price,
        isActive,
        isVeg,
        description,
        image,
        imageMime,
        prepTime,
        userId

    }) {

        const { rows } = await this.#DB.query(
            `
            UPDATE public.menu_master
            SET
                item_name = COALESCE($1, item_name),
                menu_item_group_id = COALESCE($2, menu_item_group_id),
                price = COALESCE($3, price),
                is_active = COALESCE($4, is_active),
                is_veg = COALESCE($5, is_veg),
                description = COALESCE($6, description),
                image = COALESCE($7, image),
                image_mime = COALESCE($8, image_mime),
                prep_time = COALESCE($9, prep_time),
                updated_by = $10,
                updated_on = NOW()
            WHERE id = $11
            RETURNING *
            `,
            [
                itemName,
                menuItemGroupId,
                price,
                isActive,
                isVeg,
                description,
                image,
                imageMime,
                prepTime,
                userId,
                id
            ]
        );

        if (!rows[0]) return null;

        await AuditService.log({
            property_id: rows[0].property_id,
            event_id: rows[0].id,
            table_name: "menu_master",
            event_type: "UPDATE",
            task_name: "Update Menu Item",
            comments: "Menu item updated",
            details: JSON.stringify(rows[0]),
            user_id: userId
        });

        return rows[0];
    }

    /* ===============================
       DELETE
    =============================== */

    async deleteById(id, userId) {

        const { rows, rowCount } = await this.#DB.query(
            `
            DELETE FROM public.menu_master
            WHERE id = $1
            RETURNING id, property_id, item_name
            `,
            [id]
        );

        if (!rowCount) return false;

        await AuditService.log({
            property_id: rows[0].property_id,
            event_id: rows[0].id,
            table_name: "menu_master",
            event_type: "DELETE",
            task_name: "Delete Menu Item",
            comments: "Menu item deleted",
            details: JSON.stringify(rows[0]),
            user_id: userId
        });

        return true;
    }

    /* =====================================
    GET MENU ITEMS BY GROUP ID
    ===================================== */

    async getByGroupId({
        propertyId,
        groupId,
        onlyActive = false
    }) {

        const values = [propertyId, groupId];
        let where = `
        WHERE m.property_id = $1
        AND m.menu_item_group_id = $2
    `;

        if (onlyActive) {
            where += ` AND m.is_active = true`;
        }

        const { rows } = await this.#DB.query(
            `
            SELECT
                m.id,
                m.property_id,
                m.item_name,
                m.menu_item_group_id,
                g.name AS menu_item_group,
                m.price,
                m.is_active,
                m.is_veg,
                m.description,
                m.prep_time,
                m.created_on,
                m.updated_on
            FROM public.menu_master m
            LEFT JOIN public.menu_item_groups g
                ON g.id = m.menu_item_group_id
            ${where}
            ORDER BY m.item_name ASC
            `,
            values
        );

        return rows;
    }

    /* ===============================
    BULK CREATE
    =============================== */

    async bulkCreate({
        propertyId,
        userId,
        items = []
    }) {
        console.log("🚀 ~ MenuMasterService ~ bulkCreate ~ items:", items)

        if (!Array.isArray(items) || !items.length) {
            throw new Error("Items required");
        }

        const client = await this.#DB.connect();

        try {

            await client.query("BEGIN");

            const results = [];

            for (const item of items) {

                const {
                    itemName,
                    menuItemGroupId,
                    price,
                    isActive = true,
                    isVeg = false,
                    description,
                    prepTime,
                    image,
                    imageMime
                } = item;

                if (!itemName) {
                    throw new Error("Package, Stay Duration and Guests required");
                }

                const { rows } = await client.query(
                    `
                    INSERT INTO public.menu_master (
                        property_id,
                        item_name,
                        menu_item_group_id,
                        price,
                        is_active,
                        is_veg,
                        description,
                        image,
                        image_mime,
                        prep_time,
                        created_by
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    RETURNING *
                    `,
                    [
                        propertyId,
                        itemName,
                        menuItemGroupId ?? null,
                        price ?? 0,
                        isActive,
                        isVeg,
                        description ?? null,
                        image ?? null,        // ✅ buffer from multer
                        imageMime ?? null,    // ✅ mime from multer
                        prepTime ?? null,
                        userId
                    ]
                );

                const created = rows[0];

                await AuditService.log({
                    client,
                    property_id: propertyId,
                    event_id: created.id,
                    table_name: "menu_master",
                    event_type: "CREATE",
                    task_name: "Bulk Create Menu Item",
                    comments: `Menu item created: ${created.item_name}`,
                    details: JSON.stringify(created),
                    user_id: userId
                });

                results.push(created);
            }

            await client.query("COMMIT");

            return results;

        } catch (err) {

            await client.query("ROLLBACK");
            throw err;

        } finally {

            client.release();

        }
    }

}

export default Object.freeze(new MenuMasterService());
