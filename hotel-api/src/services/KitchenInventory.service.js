import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class KitchenInventoryService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    #buildAuditEntity(master, inventory_master_id, unit = null) {
        return {
            inventory_master_id,
            inventory_name: master.name,
            inventory_type: master.inventory_type,
            use_type: master.use_type,
            ...(master.use_type === "usable" && unit
                ? { unit }
                : {})
        };
    }


    /* =====================================================
       GET Kitchen Inventory with master details
    ===================================================== */
    async getByPropertyId({ propertyId, page = 1, limit = 10 }) {

        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
            SELECT
                ki.id,
                ki.quantity,
                ki.unit,
                ki.created_on,

                im.id AS inventory_master_id,
                im.name,
                im.use_type,

                it.type AS inventory_type

            FROM public.kitchen_inventory ki

            JOIN public.inventory_master im
                ON im.id = ki.inventory_master_id
                AND im.property_id = ki.property_id

            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id

            WHERE ki.property_id = $1

            ORDER BY it.type, im.name
            LIMIT $2 OFFSET $3
            `,
            [propertyId, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM public.kitchen_inventory
            WHERE property_id = $1
            `,
            [propertyId]
        );

        const total = countRows[0].total;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /* =====================================================
       CREATE kitchen stock entry
    ===================================================== */
    async create({
        property_id,
        inventory_master_id,
        quantity = 0,
        unit = null,
        created_by
    }) {

        /* ---------- GET INVENTORY MASTER SNAPSHOT ---------- */

        const { rows: masterRows } = await this.#DB.query(
            `
            SELECT
                im.name,
                im.use_type,
                it.type AS inventory_type
            FROM public.inventory_master im
            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id
            WHERE im.id = $1
            `,
            [inventory_master_id]
        );

        const master = masterRows[0];

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.kitchen_inventory (
                property_id,
                inventory_master_id,
                quantity,
                unit,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *
            `,
            [
                property_id,
                inventory_master_id,
                quantity,
                unit,
                created_by
            ]
        );

        const inventory = rows[0];

        /* ---------- AUDIT ---------- */

        await AuditService.log({
            property_id,
            event_id: inventory.id,
            table_name: "kitchen_inventory",
            event_type: "CREATE",
            task_name: "Create Kitchen Inventory",
            comments: "New kitchen inventory item added",
            details: JSON.stringify({
                entity: this.#buildAuditEntity(master, inventory_master_id, inventory.unit),

                after: {
                    quantity,
                    unit: inventory.unit
                },
                changed_fields: ["quantity", "unit"]
            }),
            user_id: created_by
        });

        return inventory;
    }

    /* =====================================================
       UPDATE quantity
    ===================================================== */
    async updateById(id, { quantity, unit, updated_by, comments }) {

        const { rows: oldRows } = await this.#DB.query(
            `
            SELECT
                ki.id,
                ki.property_id,
                ki.quantity,
                ki.unit,
                ki.inventory_master_id,

                im.name,
                im.use_type,
                it.type AS inventory_type

            FROM public.kitchen_inventory ki
            JOIN public.inventory_master im
                ON im.id = ki.inventory_master_id
            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id
            WHERE ki.id = $1
            `,
            [id]
        );

        const oldData = oldRows[0];

        if (!oldData) {
            throw new Error("Kitchen inventory not found");
        }

        if (quantity === undefined && unit === undefined) return oldData;

        const { rows } = await this.#DB.query(
            `
            UPDATE public.kitchen_inventory
            SET quantity = $1,
                unit = $2,
                updated_by = $3,
                updated_on = NOW()
            WHERE id = $4
            RETURNING *
            `,
            [
                quantity === undefined ? oldData.quantity : quantity,
                unit === undefined ? oldData.unit : unit,
                updated_by,
                id
            ]
        );

        const inventory = rows[0];

        const before = {
            quantity: oldData.quantity,
            unit: oldData.unit
        };

        const after = {
            quantity: inventory.quantity,
            unit: inventory.unit
        };

        const changed_fields = Object.keys(after).filter(
            key => before[key] !== after[key]
        );

        /* ---------- AUDIT ---------- */

        await AuditService.log({
            property_id: inventory.property_id,
            event_id: inventory.id,
            table_name: "kitchen_inventory",
            event_type: "UPDATE",
            task_name: "Update Kitchen Inventory",
            comments: comments || "Kitchen inventory item updated",
            details: JSON.stringify({
                entity: {
                    inventory_master_id: oldData.inventory_master_id,
                    inventory_name: oldData.name,
                    inventory_type: oldData.inventory_type,
                    use_type: oldData.use_type,
                    unit: inventory.unit
                },
                before,
                after,
                changed_fields
            }),
            user_id: updated_by
        });

        return inventory;
    }

    /* =====================================================
       ADJUST STOCK (UPSERT + DELTA QUANTITY)
    ===================================================== */
    async adjustStock({
        property_id,
        inventory_master_id,
        quantity,
        unit = null,
        user_id
    }) {

        const { rows: masterRows } = await this.#DB.query(
            `
            SELECT
                im.name,
                im.use_type,
                it.type AS inventory_type
            FROM public.inventory_master im
            JOIN public.inventory_types it
                ON it.id = im.inventory_type_id
            WHERE im.id = $1
            `,
            [inventory_master_id]
        );

        const master = masterRows[0];

        const { rows: beforeRows } = await this.#DB.query(
            `
            SELECT quantity, unit
            FROM public.kitchen_inventory
            WHERE property_id = $1
            AND inventory_master_id = $2
            `,
            [property_id, inventory_master_id]
        );

        const before = beforeRows[0] || null;

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.kitchen_inventory (
                property_id,
                inventory_master_id,
                quantity,
                unit,
                created_by,
                updated_by
            )
            VALUES ($1,$2,$3,$4,$5,$5)

            ON CONFLICT (property_id, inventory_master_id)

            DO UPDATE SET
                quantity = kitchen_inventory.quantity + EXCLUDED.quantity,
                unit = COALESCE(EXCLUDED.unit, kitchen_inventory.unit),
                updated_by = EXCLUDED.updated_by,
                updated_on = NOW()

            RETURNING *
            `,
            [
                property_id,
                inventory_master_id,
                quantity,
                unit,
                user_id
            ]
        );

        const inventory = rows[0];

        await AuditService.log({
            property_id,
            event_id: inventory.id,
            table_name: "kitchen_inventory",
            event_type: "UPDATE",
            task_name: "Adjust Kitchen Inventory Stock",
            comments: "Kitchen inventory stock adjusted",
            details: JSON.stringify({
                entity: this.#buildAuditEntity(master, inventory_master_id, inventory.unit),
                before: before
                    ? { quantity: before.quantity, unit: before.unit }
                    : null,
                adjustment: quantity,
                after: {
                    quantity: inventory.quantity,
                    unit: inventory.unit
                }
            }),
            user_id
        });

        return inventory;
    }

    /* =====================================================
        BULK ADJUST STOCK
        - Adds multiple inventory adjustments in one transaction
    ===================================================== */
    async bulkAdjustStock({
        property_id,
        items,
        user_id
    }) {

        if (!Array.isArray(items) || !items.length) {
            throw new Error("Items array is required");
        }

        const client = await this.#DB.connect();

        try {

            await client.query("BEGIN");

            const results = [];

            for (const item of items) {

                const { inventory_master_id, quantity } = item;

                if (!inventory_master_id) {
                    throw new Error("inventory_master_id missing");
                }

                if (!quantity || isNaN(quantity)) {
                    throw new Error("Invalid quantity");
                }

                /* ---------- GET MASTER SNAPSHOT ---------- */

                const { rows: masterRows } = await client.query(
                    `
                    SELECT
                        im.name,
                        im.use_type,
                        it.type AS inventory_type
                    FROM public.inventory_master im
                    JOIN public.inventory_types it
                        ON it.id = im.inventory_type_id
                    WHERE im.id = $1
                    `,
                    [inventory_master_id]
                );

                const master = masterRows[0];

                if (!master) {
                    throw new Error(`Inventory master not found: ${inventory_master_id}`);
                }

                /* ---------- BEFORE STATE ---------- */

                const { rows: beforeRows } = await client.query(
                    `
                    SELECT quantity, unit
                    FROM public.kitchen_inventory
                    WHERE property_id = $1
                    AND inventory_master_id = $2
                    `,
                    [property_id, inventory_master_id]
                );

                const before = beforeRows[0] || null;

                /* ---------- UPSERT ---------- */

                const { rows } = await client.query(
                    `
                    INSERT INTO public.kitchen_inventory (
                        property_id,
                        inventory_master_id,
                        quantity,
                        unit,
                        created_by,
                        updated_by
                    )
                    VALUES ($1,$2,$3,$4,$5,$5)

                    ON CONFLICT (property_id, inventory_master_id)

                    DO UPDATE SET
                        quantity = kitchen_inventory.quantity + EXCLUDED.quantity,
                        unit = COALESCE(EXCLUDED.unit, kitchen_inventory.unit),
                        updated_by = EXCLUDED.updated_by,
                        updated_on = NOW()

                    RETURNING *
                    `,
                    [
                        property_id,
                        inventory_master_id,
                        quantity,
                        item.unit ?? null,
                        user_id
                    ]
                );

                const inventory = rows[0];

                /* ---------- AUDIT ---------- */

                await AuditService.log({
                    property_id,
                    event_id: inventory.id,
                    table_name: "kitchen_inventory",
                    event_type: "UPDATE",
                    task_name: "Bulk Adjust Kitchen Inventory",
                    comments: "Kitchen inventory bulk adjustment",
                    details: JSON.stringify({
                        entity: this.#buildAuditEntity(master, inventory_master_id, inventory.unit),
                        before: before
                            ? { quantity: before.quantity, unit: before.unit }
                            : null,
                        adjustment: quantity,
                        after: {
                            quantity: inventory.quantity,
                            unit: inventory.unit
                        }
                    }),
                    user_id
                });

                results.push(inventory);
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

export default Object.freeze(new KitchenInventoryService());
