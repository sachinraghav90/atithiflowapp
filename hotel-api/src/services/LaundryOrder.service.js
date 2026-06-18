import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class LaundryOrderService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* =========================================================
       CREATE ORDER (supports multiple items)
    ========================================================= */

    async createOrder({
        bookingId,
        propertyId,
        vendorId,
        pickupDate,
        deliveryDate,
        userId,
        vendorStatus,
        items = [],
        comments,
        guestName,
        guestMobile,
        totalAmount,
        roomNo
    }) {

        if (!items.length) {
            throw new Error("At least one laundry item required");
        }

        const client = await this.#DB.connect();

        try {

            await client.query("BEGIN");

            const laundryType = bookingId ? "GUEST" : "HOTEL";

            /* ---------- FETCH MASTER ITEMS ---------- */

            const laundryIds = items.map(i => i.laundryId);

            const masterQuery = `
            SELECT id, item_rate
            FROM public.laundry
            WHERE id = ANY($1)
              AND property_id = $2;
        `;

            const masterRes = await client.query(masterQuery, [
                laundryIds,
                propertyId
            ]);

            const rateMap = new Map(
                masterRes.rows.map(r => [
                    r.id,
                    Number(r.item_rate) || 0
                ])
            );

            // Calculate subtotal from items
            let subtotal = 0;
            for (const item of items) {
                const qty = Number(item.itemCount) || 0;
                const rate = rateMap.get(item.laundryId.toString()) || 0;
                subtotal += qty * rate;
            }
            subtotal = Number(subtotal.toFixed(2));

            // Fetch property's laundry_gst
            const propRes = await client.query(
                `SELECT laundry_gst FROM public.properties WHERE id = $1`,
                [propertyId]
            );
            const laundry_gst = propRes.rows[0]?.laundry_gst !== null ? Number(propRes.rows[0]?.laundry_gst) : 0;

            const gst_rate = laundry_gst;
            const cgst_rate = Number((gst_rate / 2).toFixed(2));
            const sgst_rate = Number((gst_rate / 2).toFixed(2));
            const cgst_amount = Number((subtotal * cgst_rate / 100).toFixed(2));
            const sgst_amount = Number((subtotal * sgst_rate / 100).toFixed(2));
            const grand_total_amount = Number((subtotal + cgst_amount + sgst_amount).toFixed(2));
            const finalTotal = grand_total_amount;

            /* ---------- CREATE ORDER ---------- */

            const orderQuery = `
            INSERT INTO public.laundry_orders (
                booking_id,
                property_id,
                vendor_id,
                laundry_type,
                laundry_status,
                pickup_date,
                delivery_date,
                created_by,
                vendor_status,
                comments,
                guest_name,
                guest_mobile,
                total_amount,
                room_no,

                subtotal_amount,
                gst_rate,
                cgst_rate,
                sgst_rate,
                cgst_amount,
                sgst_amount,
                grand_total_amount
            )
            VALUES (
                $1,$2,$3,$4,
                'PENDING',
                $5,$6,$7,$8,$9,$10,$11,$12,$13,
                $14,$15,$16,$17,$18,$19,$20
            )
            RETURNING *;
        `;

            const orderRes = await client.query(orderQuery, [
                bookingId,
                propertyId,
                vendorId,
                laundryType,
                pickupDate,
                deliveryDate,
                userId,
                vendorStatus,
                comments,
                guestName,
                guestMobile,
                finalTotal,
                roomNo,

                subtotal,
                gst_rate,
                cgst_rate,
                sgst_rate,
                cgst_amount,
                sgst_amount,
                grand_total_amount
            ]);

            const order = orderRes.rows[0];

            /* ---------- INSERT ITEMS ---------- */

            const values = [];
            const placeholders = [];

            let paramIndex = 1;

            for (const item of items) {

                const qty = Number(item.itemCount) || 0;

                if (qty <= 0) {
                    throw new Error("Invalid item quantity");
                }

                const rate = rateMap.get(item.laundryId.toString());

                if (rate === undefined) {
                    throw new Error("Invalid laundry item");
                }

                placeholders.push(
                    `($${paramIndex++},$${paramIndex++},$${paramIndex++},$${paramIndex++},DEFAULT,$${paramIndex++},$${paramIndex++},$${paramIndex++})`
                );

                values.push(
                    order.id,
                    item.laundryId,
                    qty,
                    rate,
                    item.roomNo ?? item.room_no ?? null,
                    userId,
                    item.notes ?? null
                );
            }

            const itemsInsert = `
            INSERT INTO public.laundry_order_items (
                order_id,
                laundry_id,
                item_count,
                item_rate,
                amount,
                room_no,
                created_by,
                notes
            )
            VALUES ${placeholders.join(",")}
        `;

            await client.query(itemsInsert, values);

            /* ---------- AUDIT LOG ---------- */

            await AuditService.log({
                client,
                property_id: propertyId,
                event_id: order.id,
                table_name: "laundry_orders",
                event_type: "CREATE",
                task_name: "Laundry Order Created",
                comments: comments || `Laundry order created with ${items.length} items`,
                details: JSON.stringify({
                    order,
                    items
                }),
                user_id: userId
            });


            await client.query("COMMIT");

            return order;

        } catch (err) {

            await client.query("ROLLBACK");
            throw err;

        } finally {
            client.release();
        }
    }

    /* =========================================================
       GET BY PROPERTY
    ========================================================= */

    async getByPropertyId({
        propertyId,
        page = 1,
        limit = 10,
        status,
        vendorStatus,
        laundryType,
        search = "",
        exportRows = false
    }) {

        const safePage = Math.max(parseInt(page) || 1, 1);
        const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;
        const normalizedSearch = search.trim();

        const filters = [`lo.property_id = $1`];
        const values = [propertyId];
        let paramIndex = 2;

        if (status) {
            filters.push(`lo.laundry_status = $${paramIndex++}`);
            values.push(status);
        }

        if (vendorStatus) {
            filters.push(`COALESCE(lo.vendor_status, 'NOT_ALLOTTED') = $${paramIndex++}`);
            values.push(vendorStatus);
        }

        if (laundryType) {
            filters.push(`lo.laundry_type ILIKE $${paramIndex++}`);
            values.push(laundryType);
        }

        if (normalizedSearch) {
            const formattedIdMatch = normalizedSearch.match(/^LO0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const laundryOrderId = Number(rawId);

                filters.push(`(
                    lo.id = $${paramIndex}
                    OR lo.id::text ILIKE $${paramIndex + 1}
                    OR CONCAT('LO', LPAD(lo.id::text, 4, '0')) ILIKE $${paramIndex + 1}
                    OR COALESCE(lo.booking_id::text, '') ILIKE $${paramIndex + 1}
                    OR COALESCE(lo.laundry_type, '') ILIKE $${paramIndex + 1}
                    OR COALESCE(lo.laundry_status, '') ILIKE $${paramIndex + 1}
                    OR COALESCE(lo.vendor_status, 'NOT_ALLOTTED') ILIKE $${paramIndex + 1}
                    OR COALESCE(rv.name, '') ILIKE $${paramIndex + 1}
                    OR TO_CHAR(lo.pickup_date, 'DD/MM/YYYY') ILIKE $${paramIndex + 1}
                    OR TO_CHAR(lo.delivery_date, 'DD/MM/YYYY') ILIKE $${paramIndex + 1}
                    OR EXISTS (
                        SELECT 1
                        FROM public.laundry_order_items loi_search
                        LEFT JOIN public.laundry l_search
                            ON l_search.id = loi_search.laundry_id
                        WHERE loi_search.order_id = lo.id
                          AND (
                              COALESCE(l_search.item_name, '') ILIKE $${paramIndex + 1}
                              OR COALESCE(loi_search.room_no, '') ILIKE $${paramIndex + 1}
                              OR loi_search.item_count::text ILIKE $${paramIndex + 1}
                          )
                    )
                )`);
                values.push(laundryOrderId, `%${normalizedSearch}%`);
                paramIndex += 2;
            } else {
                filters.push(`(
                    lo.id::text ILIKE $${paramIndex}
                    OR CONCAT('LO', LPAD(lo.id::text, 4, '0')) ILIKE $${paramIndex}
                    OR COALESCE(lo.booking_id::text, '') ILIKE $${paramIndex}
                    OR COALESCE(lo.laundry_type, '') ILIKE $${paramIndex}
                    OR COALESCE(lo.laundry_status, '') ILIKE $${paramIndex}
                    OR COALESCE(lo.vendor_status, 'NOT_ALLOTTED') ILIKE $${paramIndex}
                    OR COALESCE(rv.name, '') ILIKE $${paramIndex}
                    OR TO_CHAR(lo.pickup_date, 'DD/MM/YYYY') ILIKE $${paramIndex}
                    OR TO_CHAR(lo.delivery_date, 'DD/MM/YYYY') ILIKE $${paramIndex}
                    OR EXISTS (
                        SELECT 1
                        FROM public.laundry_order_items loi_search
                        LEFT JOIN public.laundry l_search
                            ON l_search.id = loi_search.laundry_id
                        WHERE loi_search.order_id = lo.id
                          AND (
                              COALESCE(l_search.item_name, '') ILIKE $${paramIndex}
                              OR COALESCE(loi_search.room_no, '') ILIKE $${paramIndex}
                              OR loi_search.item_count::text ILIKE $${paramIndex}
                          )
                    )
                )`);
                values.push(`%${normalizedSearch}%`);
                paramIndex += 1;
            }
        }

        const whereClause = filters.join(" AND ");
        const dataParams = exportRows ? values : [...values, safeLimit, offset];

        const dataQuery = `
            WITH filtered_orders AS (
                SELECT lo.*
                FROM public.laundry_orders lo
                LEFT JOIN public.ref_vendors rv
                    ON rv.id = lo.vendor_id
                WHERE ${whereClause}
                ORDER BY lo.created_on DESC
                ${exportRows ? "" : `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`}
            )
            SELECT
                fo.*,
                COALESCE(items.items, '[]') AS items
            FROM filtered_orders fo
            LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object(
                        'laundry_id', loi.laundry_id,
                        'item_name', l.item_name,
                        'item_count', loi.item_count,
                        'item_rate', loi.item_rate,
                        'amount', loi.amount,
                        'room_no', loi.room_no
                    )
                    ORDER BY loi.id
                ) AS items
                FROM public.laundry_order_items loi
                LEFT JOIN public.laundry l
                    ON l.id = loi.laundry_id
                WHERE loi.order_id = fo.id
            ) items ON true
            ORDER BY fo.created_on DESC;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.laundry_orders lo
            LEFT JOIN public.ref_vendors rv
                ON rv.id = lo.vendor_id
            WHERE ${whereClause};
        `;

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(dataQuery, dataParams),
            this.#DB.query(countQuery, values)
        ]);

        const total = countRes.rows[0].total;

        return {
            data: dataRes.rows,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.max(1, Math.ceil(total / safeLimit))
            }
        };
    }

    /* =========================================================
       GET BY BOOKING
    ========================================================= */

    async getByBookingId(bookingId) {

        const query = `
            SELECT
                lo.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'laundry_id', loi.laundry_id,
                            'item_name', l.item_name,
                            'item_count', loi.item_count,
                            'item_rate', loi.item_rate,
                            'amount', loi.amount,
                            'room_no', loi.room_no
                        )
                        ORDER BY loi.id
                    ) FILTER (WHERE loi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM public.laundry_orders lo
            LEFT JOIN public.laundry_order_items loi
                ON loi.order_id = lo.id
            LEFT JOIN public.laundry l
                ON l.id = loi.laundry_id
            WHERE lo.booking_id = $1
              AND lo.status = 'active'
            GROUP BY lo.id
            ORDER BY lo.created_on DESC;
        `;

        const { rows } = await this.#DB.query(query, [bookingId]);

        return rows;
    }

    /* =========================================================
       UPDATE ORDER HEADER ONLY
    ========================================================= */

    async updateOrder({
        id,
        laundryStatus,
        pickupDate,
        deliveryDate,
        userId,
        vendorStatus,
        vendorId,
        comments,
        staffReceivedBy,
        guestReceivedBy
    }) {

        /* ---------- GET BEFORE STATE ---------- */

        const beforeRes = await this.#DB.query(
            `SELECT * FROM laundry_orders WHERE id = $1`,
            [id]
        );

        const before = beforeRes.rows[0];

        if (!before) {
            throw new Error("Laundry order not found");
        }

        /* ---------- UPDATE ---------- */

        const query = `
            UPDATE public.laundry_orders
            SET
                laundry_status = COALESCE($2, laundry_status),
                pickup_date = COALESCE($3, pickup_date),
                delivery_date = COALESCE($4, delivery_date),
                vendor_status = COALESCE($6, vendor_status),
                vendor_id = COALESCE($7, vendor_id),
                staff_received_by = $8,
                guest_received_by = $9,
                updated_by = $5,
                updated_on = NOW()
            WHERE id = $1
              AND laundry_status != 'CANCELLED'
            RETURNING *;
        `;

        // enforce cleanup
        let finalStaffReceivedBy = null;
        let finalGuestReceivedBy = null;

        const type = before.laundry_type ? before.laundry_type.toUpperCase() : "";

        if (laundryStatus === "DELIVERED" || before.laundry_status === "DELIVERED") {
            finalStaffReceivedBy = staffReceivedBy || null;
            finalGuestReceivedBy = guestReceivedBy || null;
        }

        let rows, rowCount;
        try {
            const result = await this.#DB.query(query, [
                id,
                laundryStatus !== undefined ? laundryStatus : null,
                pickupDate !== undefined ? pickupDate : null,
                deliveryDate !== undefined ? deliveryDate : null,
                userId !== undefined ? userId : null,
                vendorStatus !== undefined ? vendorStatus : null,
                vendorId !== undefined ? vendorId : null,
                finalStaffReceivedBy,
                finalGuestReceivedBy
            ]);
            rows = result.rows;
            rowCount = result.rowCount;
        } catch (err) {
            console.error("SQL UPDATE ERROR:", err);
            throw err;
        }

        if (!rowCount) {
            throw new Error("Laundry order cannot be updated");
        }

        const after = rows[0];

        /* ---------- BUILD CHANGE LOG ---------- */

        const changes = [];

        if (before.laundry_status !== after.laundry_status) {
            changes.push(`Laundry: ${before.laundry_status} → ${after.laundry_status}`);
        }

        if (before.vendor_status !== after.vendor_status) {
            changes.push(`Vendor: ${before.vendor_status} → ${after.vendor_status}`);
        }

        if (before.vendor_id !== after.vendor_id) {
            changes.push("Vendor Assigned");
        }

        if (before.delivery_date !== after.delivery_date) {
            changes.push("Delivery Date Updated");
        }

        if ((before.comments || "") !== (after.comments || "")) {
            changes.push("Comments Updated");
        }

        if (before.staff_received_by !== after.staff_received_by) {
            changes.push("Staff Received By Updated");
        }

        if (before.guest_received_by !== after.guest_received_by) {
            changes.push("Guest Received By Updated");
        }

        /* ---------- AUDIT LOG ---------- */

        await AuditService.log({
            property_id: before.property_id,
            event_id: id,
            table_name: "laundry_orders",
            event_type: "UPDATE",
            task_name: "Laundry Order Updated",
            comments: comments || (changes.length
                ? changes.join(", ")
                : "Laundry order header updated"),
            details: JSON.stringify({
                before,
                after
            }),
            user_id: userId
        });

        return after;
    }
}

export default Object.freeze(new LaundryOrderService());
