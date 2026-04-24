import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class RestaurantOrderService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ===========================
       GET ORDERS (PAGINATED)
    =========================== */
    async getByProperty({
        propertyId,
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        search = "",
        exportRows = false
    }) {

        const offset = (page - 1) * limit;
        const normalizedSearch = search.trim();

        const filters = [];
        const values = [propertyId];
        let i = 2;

        if (status) {
            filters.push(`ro.order_status = $${i++}`);
            values.push(status);
        }

        if (paymentStatus) {
            filters.push(`ro.payment_status = $${i++}`);
            values.push(paymentStatus);
        }

        if (normalizedSearch) {
            filters.push(`(
                ro.id::text ILIKE $${i}
                OR CONCAT('OR', LPAD(ro.id::text, 3, '0')) ILIKE $${i}
                OR COALESCE(ro.guest_name, '') ILIKE $${i}
                OR COALESCE(r.room_no, '') ILIKE $${i}
                OR COALESCE(ro.table_no, '') ILIKE $${i}
                OR COALESCE(ro.order_status, '') ILIKE $${i}
                OR COALESCE(ro.payment_status, '') ILIKE $${i}
                OR TO_CHAR(ro.order_date, 'DD/MM/YYYY') ILIKE $${i}
            )`);
            values.push(`%${normalizedSearch}%`);
            i += 1;
        }

        const whereClause = `
        ro.property_id = $1
        ${filters.length ? "AND " + filters.join(" AND ") : ""}
    `;

        const { rows } = await this.#DB.query(
            `
            SELECT
                ro.*,
                r.room_no,
                dp.name AS delivery_partner_name
            FROM public.restaurant_orders ro
            LEFT JOIN public.ref_rooms r
                ON r.id = ro.room_id
            LEFT JOIN public.delivery_partners dp
                ON dp.id = ro.delivery_partner_id
            WHERE ${whereClause}
            ORDER BY ro.order_date DESC
            ${exportRows ? "" : `LIMIT $${i} OFFSET $${i + 1}`}
            `,
            exportRows ? values : [...values, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
        SELECT COUNT(*)::int AS total
        FROM public.restaurant_orders ro
        LEFT JOIN public.ref_rooms r
            ON r.id = ro.room_id
        WHERE ${whereClause}
        `,
            values
        );

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit),
            },
        };
    }

    /**
   * Get restaurant orders by booking ID
   * @param {bigint} bookingId
   */
    async getOrdersByBookingId(bookingId) {
        if (!bookingId) {
            throw new Error("bookingId is required");
        }

        const query = `
        SELECT
            ro.id,
            ro.property_id,
            ro.table_no,
            ro.room_id,
            ro.booking_id,
            ro.order_date,
            ro.total_amount,
            ro.order_status,
            ro.payment_status,
            ro.waiter_staff_id,
            ro.expected_delivery_time,
            ro.order_type,

            -- denormalized guest data
            ro.guest_name,
            ro.guest_mobile,

            -- room
            r.room_no AS room_no,

            dp.name AS delivery_partner_name

        FROM public.restaurant_orders ro
        LEFT JOIN public.ref_rooms r 
            ON r.id = ro.room_id
        LEFT JOIN public.delivery_partners dp
            ON dp.id = ro.delivery_partner_id

        WHERE ro.booking_id = $1
        ORDER BY ro.order_date DESC
    `;

        const { rows } = await this.#DB.query(query, [bookingId]);

        return rows;
    }


    /* ===========================
       CREATE ORDER + ITEMS (TX)
    =========================== */
    async createOrderWithItems({
        order,
        items,
        userId,
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            // 1. Create order
            const { rows: orderRows } = await client.query(
                `
                INSERT INTO restaurant_orders (
                    property_id,
                    table_no,
                    room_id,
                    booking_id,

                    -- denormalized guest data
                    guest_name,
                    guest_mobile,

                    total_amount,
                    order_status,
                    payment_status,
                    waiter_staff_id,
                    expected_delivery_time,
                    created_by,
                    delivery_partner_id,
                    order_type
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                RETURNING *
                `,
                [
                    order.property_id,
                    order.table_no,
                    order.room_id || null,
                    order.booking_id,
                    order.guest_name,
                    order.guest_mobile,
                    order.total_amount,
                    order.order_status || "New",
                    order.payment_status || "Pending",
                    order.waiter_staff_id,
                    order.expected_delivery_time,
                    userId,
                    order.delivery_partner_id || null,
                    order.order_type
                ]
            );

            const createdOrder = orderRows[0];

            // 2. Insert items
            for (const item of items) {
                await client.query(
                    `
                    INSERT INTO restaurant_order_items (
                        order_id,
                        menu_item_id,
                        quantity,
                        unit_price,
                        item_total,
                        notes
                    )
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [
                        createdOrder.id,
                        item.menu_item_id,
                        item.quantity,
                        item.unit_price,
                        item.item_total,
                        item.notes || null,
                    ]
                );
            }

            await client.query("COMMIT");

            /* ---------- AUDIT ---------- */
            await AuditService.log({
                property_id: order.property_id,
                event_id: createdOrder.id,
                table_name: "restaurant_orders",
                event_type: "CREATE",
                task_name: "Create Restaurant Order",
                comments: "New restaurant order created",
                details: JSON.stringify({
                    order_id: createdOrder.id,
                    property_id: order.property_id,
                    total_amount: order.total_amount,
                    items_count: items.length,
                    order_status: createdOrder.order_status,
                    payment_status: createdOrder.payment_status,
                    table_no: order.table_no,
                    room_id: order.room_id,
                    booking_id: order.booking_id,
                    guest_name: order.guest_name,
                    guest_mobile: order.guest_mobile,
                    delivery_partner_id: order.delivery_partner_id,
                    order_type: order.order_type
                }),
                user_id: userId
            });

            return createdOrder;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }


    /* ===========================
       GET SINGLE ORDER + ITEMS
    =========================== */
    async getOrderWithItems(orderId) {
        const { rows: orders } = await this.#DB.query(
            `
            SELECT
                ro.*,
                dp.name AS delivery_partner_name
            FROM restaurant_orders ro
            LEFT JOIN delivery_partners dp
                ON dp.id = ro.delivery_partner_id
            WHERE ro.id = $1
            `,
            [orderId]
        );

        if (!orders.length) return null;

        const { rows: items } = await this.#DB.query(
            `
            SELECT 
                roi.*, 
                mm.item_name
            FROM restaurant_order_items roi
            JOIN menu_master mm 
                ON mm.id = roi.menu_item_id
            WHERE roi.order_id = $1
            `,
            [orderId]
        );

        return {
            ...orders[0],
            items,
        };
    }

    /* ===========================
       UPDATE ORDER STATUS
    =========================== */
    async updateOrderStatus(id, status, userId) {
        const { rows } = await this.#DB.query(
            `
            UPDATE restaurant_orders
            SET
                order_status = $1,
                updated_by = $2,
                updated_on = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [status, userId, id]
        );

        const order = rows[0];

        if (order) {
            await AuditService.log({
                property_id: order.property_id,
                event_id: id,
                table_name: "restaurant_orders",
                event_type: "STATUS_UPDATE",
                task_name: "Update Order Status",
                comments: "Restaurant order status updated",
                details: JSON.stringify({
                    order_id: id,
                    new_status: status
                }),
                user_id: userId
            });
        }

        return order;
    }

    /* ===========================
       UPDATE PAYMENT STATUS
    =========================== */
    async updatePaymentStatus(id, status, userId) {
        const { rows } = await this.#DB.query(
            `
            UPDATE restaurant_orders
            SET
                payment_status = $1,
                updated_by = $2,
                updated_on = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [status, userId, id]
        );

        const order = rows[0];

        if (order) {
            await AuditService.log({
                property_id: order.property_id,
                event_id: id,
                table_name: "restaurant_orders",
                event_type: "PAYMENT_UPDATE",
                task_name: "Update Payment Status",
                comments: "Restaurant payment status updated",
                details: JSON.stringify({
                    order_id: id,
                    new_payment_status: status
                }),
                user_id: userId
            });
        }

        return order;
    }

    /* ===========================
       DELETE ORDER
    =========================== */
    async deleteOrder(id) {
        const { rowCount } = await this.#DB.query(
            `DELETE FROM restaurant_orders WHERE id = $1`,
            [id]
        );

        return rowCount > 0;
    }
}

export default Object.freeze(new RestaurantOrderService());
