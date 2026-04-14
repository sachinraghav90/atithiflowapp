import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class PaymentsService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* Get payments by property_id (LIST MODE - limited) */
    async getByPropertyId(propertyId, page = 1, limit = 10, filters = {}) {
        const MAX_LIMIT = 20;            // hard cap
        const safeLimit = Math.min(limit, MAX_LIMIT);
        const offset = (page - 1) * safeLimit;
        const { bookingId = "", method = "", status = "" } = filters;

        const conditions = [
            "property_id = $1",
            "is_active = true"
        ];
        const params = [propertyId];

        if (bookingId) {
            params.push(bookingId);
            conditions.push(`booking_id = $${params.length}`);
        }

        if (method) {
            params.push(method);
            conditions.push(`payment_method = $${params.length}`);
        }

        if (status) {
            params.push(status);
            conditions.push(`payment_status = $${params.length}`);
        }

        const whereClause = conditions.join("\n           and ");

        const countResult = await this.#DB.query(
            `select count(*)
         from public.payments
         where ${whereClause}`,
            params
        );

        const total = Number(countResult.rows[0].count);

        const dataParams = [...params, safeLimit, offset];
        const limitParam = `$${params.length + 1}`;
        const offsetParam = `$${params.length + 2}`;

        const { rows } = await this.#DB.query(
            `select
            id,
            booking_id,
            payment_date,
            paid_amount,
            payment_method,
            payment_status,
            transaction_id,
            comments,
            bank_name
         from public.payments
         where ${whereClause}
         order by payment_date desc
         limit ${limitParam} offset ${offsetParam}`,
            dataParams
        );

        return {
            data: rows,
            pagination: {
                page,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
                hasMore: offset + safeLimit < total
            }
        };
    }

    /* Get payments by booking_id (paginated) */
    async getByBookingId(bookingId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const countResult = await this.#DB.query(
            `select count(*)
         from public.payments
         where booking_id = $1
           and is_active = true`,
            [bookingId]
        );

        const total = Number(countResult.rows[0].count);

        const { rows } = await this.#DB.query(
            `
        select
            p.*,

            trim(
                concat_ws(
                    ' ',
                    s.first_name,
                    s.middle_name,
                    s.last_name
                )
            ) as created_by_name

        from public.payments p
        left join public.users u
            on u.id = p.created_by
        left join public.staff s
            on s.user_id = u.id

        where p.booking_id = $1
          and p.is_active = true
        order by p.payment_date desc
        limit $2 offset $3
        `,
            [bookingId, limit, offset]
        );

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

    /* Get payment by id with booking & property details */
    async getById(paymentId) {
        const { rows } = await this.#DB.query(
            `
        select
            p.id                  as payment_id,
            p.booking_id,
            p.property_id,
            p.payment_date,
            p.paid_amount,
            p.payment_method,
            p.payment_type,
            p.payment_status,
            p.is_active,
            p.created_on,
            p.updated_on,
            p.transaction_id,
            p.comments,
            p.bank_name,

            b.booking_date,
            b.booking_type,
            b.booking_status,
            b.estimated_arrival,
            b.estimated_departure,
            b.actual_arrival,
            b.actual_departure,
            b.final_amount,
            b.discount,
            b.adult,
            b.child,
            b.total_guest,

            pr.brand_name         as property_name

        from public.payments p
        join public.bookings b
            on b.id = p.booking_id
        join public.properties pr
            on pr.id = p.property_id
        where p.id = $1
          and p.is_active = true
        `,
            [paymentId]
        );

        return rows[0] || null;
    }


    /* Create single payment */
    async create(payload) {
        const {
            booking_id,
            property_id,
            payment_date,
            paid_amount,
            payment_method,
            payment_type,
            payment_status,
            transaction_id,
            bank_name,
            comments,
            userId
        } = payload;

        const { rows } = await this.#DB.query(
            `insert into public.payments (
                booking_id,
                property_id,
                payment_date,
                paid_amount,
                payment_method,
                payment_type,
                payment_status,
                created_by,
                transaction_id,
                bank_name,
                comments
            )
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            returning *`,
            [
                booking_id,
                property_id,
                payment_date,
                paid_amount,
                payment_method,
                payment_type,
                payment_status,
                userId,
                transaction_id,
                bank_name,
                comments
            ]
        );

        const payment = rows[0];

        await AuditService.log({
            property_id,
            event_id: payment.id,
            table_name: "payments",
            event_type: "CREATE",
            task_name: "Create Payment",
            comments: "Payment recorded",
            details: JSON.stringify({
                payment_id: payment.id,
                booking_id,
                amount: paid_amount,
                method: payment_method,
                type: payment_type,
                comments,
                bank_name
            }),
            user_id: userId
        });

        return payment;
    }

    /* Update payment */
    async update(id, payload) {
        const {
            payment_date,
            paid_amount,
            payment_method,
            payment_type,
            payment_status,
            transaction_id,
            bank_name,
            comments,
            updated_by
        } = payload;

        const { rows } = await this.#DB.query(
            `update public.payments
             set
                payment_date   = coalesce($2, payment_date),
                paid_amount    = coalesce($3, paid_amount),
                payment_method = coalesce($4, payment_method),
                payment_type   = coalesce($5, payment_type),
                payment_status = coalesce($6, payment_status),
                transaction_id = coalesce($7, transaction_id),
                bank_name      = coalesce($8, bank_name),
                comments       = coalesce($9, comments),
                updated_by     = $10,
                updated_on     = now()
             where id = $1
             returning *`,
            [
                id,
                payment_date,
                paid_amount,
                payment_method,
                payment_type,
                payment_status,
                transaction_id,
                bank_name,
                comments,
                updated_by
            ]
        );

        const payment = rows[0];

        await AuditService.log({
            property_id: payment.property_id,
            event_id: payment.id,
            table_name: "payments",
            event_type: "UPDATE",
            task_name: "Update Payment",
            comments: "Payment updated",
            details: JSON.stringify({
                payment_id: payment.id,
                booking_id: payment.booking_id,
                amount: payment.paid_amount,
                method: payment.payment_method,
                type: payment.payment_type,
                bank_name,
                comments
            }),
            user_id: updated_by
        });

        return payment;
    }
}

export default Object.freeze(new PaymentsService());
