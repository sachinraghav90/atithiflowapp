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

    async getByProperty({ propertyId, page = 1, limit = 10, search = "", status = "", type = "", group = "" }) {

        const offset = (page - 1) * limit;

        const whereConditions = ["m.property_id = $1"];
        const params = [propertyId];

        if (search) {
            params.push(`%${search}%`);
            const pIdx = params.length;
            const searchIdMatch = search.match(/^#?ME(\d+)$/i) || search.match(/^#?ME0+(\d+)$/i) || search.match(/^(\d+)$/i);
            if (searchIdMatch) {
                params.push(Number(searchIdMatch[1]));
                whereConditions.push(`(m.item_name ILIKE $${pIdx} OR m.description ILIKE $${pIdx} OR m.id = $${params.length})`);
            } else {
                whereConditions.push(`(m.item_name ILIKE $${pIdx} OR m.description ILIKE $${pIdx})`);
            }
        }

        if (status) {
            params.push(status === "active");
            whereConditions.push(`m.is_active = $${params.length}`);
        }

        if (type) {
            params.push(type === "veg");
            whereConditions.push(`m.is_veg = $${params.length}`);
        }

        if (group) {
            if (group === "None") {
                whereConditions.push(`m.menu_item_group_id IS NULL`);
            } else {
                params.push(group);
                whereConditions.push(`g.name = $${params.length}`);
            }
        }

        const whereClause = "WHERE " + whereConditions.join(" AND ");

        const { rows } = await this.#DB.query(
            `
            SELECT
                m.id,
                m.property_id,
                m.menu_sequence,
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
            ${whereClause}
            ORDER BY m.menu_sequence DESC NULLS LAST, m.id DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `,
            [...params, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM public.menu_master m
            LEFT JOIN public.menu_item_groups g
                ON g.id = m.menu_item_group_id
            ${whereClause}
            `,
            params
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
        userId,
    }) {
        const client = await this.#DB.connect();
        try {
            await client.query("BEGIN");

            // -----------------------------
            // Allocate sequence
            // -----------------------------
            const seqResult = await client.query(`
                INSERT INTO public.property_counters (property_id, counter_name, next_value)
                VALUES ($1, 'MENU', 2)
                ON CONFLICT (property_id, counter_name)
                DO UPDATE SET 
                    next_value = public.property_counters.next_value + 1,
                    updated_on = now()
                RETURNING next_value - 1 AS menu_sequence
            `, [propertyId]);
            
            const nextSeq = seqResult.rows[0].menu_sequence;

            const { rows } = await client.query(
                `
                INSERT INTO public.menu_master (
                    property_id,
                    menu_sequence,
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
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING id, property_id, item_name, menu_item_group_id, price, is_active, is_veg, description, prep_time, created_on, updated_on
                `,
                [
                    propertyId,
                    nextSeq,
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

        const created = rows[0];

        await AuditService.log({
            property_id: propertyId,
            event_id: created.id,
            table_name: "menu_master",
            event_type: "CREATE",
            task_name: "Create Menu Item",
            comments: "Menu item created",
            details: JSON.stringify({
                item_name: created.item_name,
                price: created.price,
                prep_time: created.prep_time,
                menu_item_group_id: created.menu_item_group_id,
                is_active: created.is_active,
                is_veg: created.is_veg,
                description: created.description,
                ...(image !== undefined && image !== null ? { item_image: "Image Uploaded" } : {})
            }),
            user_id: userId
        });

        await client.query("COMMIT");
        return created;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
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
        const { rows: existingRows } = await this.#DB.query(
            `
            SELECT m.*, g.name AS menu_item_group 
            FROM public.menu_master m
            LEFT JOIN public.menu_item_groups g ON g.id = m.menu_item_group_id
            WHERE m.id = $1
            `,
            [id]
        );
        const oldRow = existingRows[0];

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
            RETURNING id, property_id, item_name, menu_item_group_id, price, is_active, is_veg, description, prep_time, created_on, updated_on
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

        const updated = rows[0];

        let newGroupName = oldRow?.menu_item_group;
        if (oldRow && updated.menu_item_group_id !== oldRow.menu_item_group_id) {
            if (updated.menu_item_group_id) {
                const { rows: gRows } = await this.#DB.query(
                    `SELECT name FROM public.menu_item_groups WHERE id = $1`,
                    [updated.menu_item_group_id]
                );
                newGroupName = gRows[0]?.name;
            } else {
                newGroupName = null;
            }
        }

        if (oldRow) {
            const before = {};
            const after = {};
            let hasChanges = false;

            if (itemName !== undefined && oldRow.item_name !== updated.item_name) { before.item_name = oldRow.item_name; after.item_name = updated.item_name; hasChanges = true; }
            if (price !== undefined && Number(oldRow.price) !== Number(updated.price)) { before.price = Number(oldRow.price); after.price = Number(updated.price); hasChanges = true; }
            if (isActive !== undefined && Boolean(oldRow.is_active) !== Boolean(updated.is_active)) { before.is_active = Boolean(oldRow.is_active); after.is_active = Boolean(updated.is_active); hasChanges = true; }
            if (isVeg !== undefined && Boolean(oldRow.is_veg) !== Boolean(updated.is_veg)) { before.is_veg = Boolean(oldRow.is_veg); after.is_veg = Boolean(updated.is_veg); hasChanges = true; }
            if (description !== undefined && oldRow.description !== updated.description) { before.description = oldRow.description || null; after.description = updated.description || null; hasChanges = true; }
            if (prepTime !== undefined && oldRow.prep_time !== updated.prep_time) { before.prep_time = oldRow.prep_time || null; after.prep_time = updated.prep_time || null; hasChanges = true; }
            if (menuItemGroupId !== undefined && oldRow.menu_item_group_id !== updated.menu_item_group_id) { before.menu_item_group = oldRow.menu_item_group || "None"; after.menu_item_group = newGroupName || "None"; hasChanges = true; }
            if (image !== undefined) { before.image = "Old Image"; after.image = "Updated"; hasChanges = true; }

            if (hasChanges) {
                await AuditService.log({
                    property_id: updated.property_id,
                    event_id: updated.id,
                    table_name: "menu_master",
                    event_type: "Update",
                    task_name: "Update Menu Item",
                    comments: "Menu item updated",
                    details: JSON.stringify({ before, after }),
                    user_id: userId
                });
            }
        }

        return updated;
    }

    /* ===============================
       DELETE
    =============================== */

  async deleteById(id, userId) {

    const { rows, rowCount } = await this.#DB.query(
        `
        DELETE FROM public.menu_master
        WHERE id = $1
        RETURNING id, property_id, item_name, image IS NOT NULL AS has_image
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
        details: JSON.stringify({
            item_name: rows[0].item_name,
            ...(rows[0].has_image ? { item_image: "Image Removed" } : {})
        }),
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
        let result;

        try {
            await client.query("BEGIN");

            const propertyCounts = {};
            items.forEach(i => {
                const propId = i.propertyId ?? propertyId;
                propertyCounts[propId] = (propertyCounts[propId] || 0) + 1;
            });
            
            const propNextValues = {};
            for (const propId of Object.keys(propertyCounts)) {
                const count = propertyCounts[propId];
                const seqResult = await client.query(`
                    INSERT INTO public.property_counters (property_id, counter_name, next_value)
                    VALUES ($1, 'MENU', 1 + $2)
                    ON CONFLICT (property_id, counter_name)
                    DO UPDATE SET 
                        next_value = public.property_counters.next_value + $2,
                        updated_on = now()
                    RETURNING next_value
                `, [propId, count]);
                
                propNextValues[propId] = seqResult.rows[0].next_value - count;
            }

            const menuSequences = items.map(i => {
                const propId = i.propertyId ?? propertyId;
                const seq = propNextValues[propId];
                propNextValues[propId]++;
                return seq;
            });

            const propertyIds = items.map(i => i.propertyId ?? propertyId);
            const itemNames = items.map(i => {
                if (!i.itemName) throw new Error("Package, Stay Duration and Guests required");
                return i.itemName;
            });
            const menuItemGroupIds = items.map(i => i.menuItemGroupId ?? null);
            const prices = items.map(i => i.price ?? 0);
            const isActives = items.map(i => i.isActive ?? true);
            const isVegs = items.map(i => i.isVeg ?? false);
            const descriptions = items.map(i => i.description ?? null);
            const images = items.map(i => i.image ?? null);
            const imageMimes = items.map(i => i.imageMime ?? null);
            const prepTimes = items.map(i => i.prepTime ?? null);

            const query = `
                INSERT INTO public.menu_master (
                    property_id,
                    menu_sequence,
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
                SELECT
                    unnest($1::bigint[]),
                    unnest($2::integer[]),
                    unnest($3::text[]),
                    unnest($4::bigint[]),
                    unnest($5::numeric[]),
                    unnest($6::boolean[]),
                    unnest($7::boolean[]),
                    unnest($8::text[]),
                    unnest($9::bytea[]),
                    unnest($10::text[]),
                    unnest($11::integer[]),
                    $12
                RETURNING id, property_id, item_name, menu_item_group_id, price, is_active, is_veg, description, prep_time, created_on, updated_on
            `;

            const values = [
                propertyIds,
                menuSequences,
                itemNames,
                menuItemGroupIds,
                prices,
                isActives,
                isVegs,
                descriptions,
                images,
                imageMimes,
                prepTimes,
                userId
            ];

            result = await client.query(query, values);

            await client.query("COMMIT");

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        if (result.rows && result.rows.length > 0) {
            Promise.all(result.rows.map(row => 
                AuditService.log({
                    property_id: row.property_id,
                    event_id: row.id,
                    table_name: "menu_master",
                    event_type: "CREATE",
                    task_name: "Bulk Create Menu Item",
                    comments: `Menu item created: ${row.item_name}`,
                    details: JSON.stringify({
                        item_name: row.item_name,
                        price: row.price,
                        prep_time: row.prep_time,
                        menu_item_group_id: row.menu_item_group_id,
                        is_active: row.is_active,
                        is_veg: row.is_veg,
                        description: row.description
                    }),
                    user_id: userId
                })
            )).catch(e => console.error("Bulk audit log failed:", e));
        }

        return result.rows;
    }

}

export default Object.freeze(new MenuMasterService());
