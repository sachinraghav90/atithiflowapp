import { getDb } from "../../utils/getDb.js";

class VendorService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async getByPropertyId(propertyId, page = 1, limit = 10, search = "") {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        let searchCondition = "";
        let params = [propertyId];
        let paramIndex = 2; // next placeholder index

        if (search?.trim()) {

            searchCondition = `
            AND (
                name ILIKE $${paramIndex}
                OR pan_no ILIKE $${paramIndex}
                OR gst_no ILIKE $${paramIndex}
            )
        `;

            params.push(`%${search.trim()}%`);
            paramIndex++;
        }

        // Add pagination params
        const dataParams = [...params, safeLimit, offset];

        const dataQuery = `
        SELECT
            id,
            property_id,
            name,
            pan_no,
            gst_no,
            address,
            contact_no,
            email_id,
            vendor_type,
            is_active,
            created_on,
            updated_on
        FROM public.ref_vendors
        WHERE property_id = $1
        ${searchCondition}
        ORDER BY name
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
        SELECT COUNT(*) AS total
        FROM public.ref_vendors
        WHERE property_id = $1
        ${searchCondition}
    `;

        const [{ rows: dataRows }, { rows: countRows }] = await Promise.all([
            this.#DB.query(dataQuery, dataParams),
            this.#DB.query(countQuery, params),
        ]);

        return {
            data: dataRows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: Number(countRows[0].total),
                totalPages: Math.max(1, Math.ceil(Number(countRows[0].total) / safeLimit)),
            },
        };
    }

    async create(payload, userId) {
        const {
            property_id,
            name,
            pan_no,
            gst_no,
            address,
            contact_no,
            email_id,
            vendor_type,
        } = payload;

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.ref_vendors (
                property_id,
                name,
                pan_no,
                gst_no,
                address,
                contact_no,
                email_id,
                vendor_type,
                created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
            RETURNING *
            `,
            [
                property_id,
                name,
                pan_no,
                gst_no,
                address,
                contact_no,
                email_id,
                vendor_type,
                userId,
            ]
        );

        return rows[0];
    }

    async update(vendorId, payload, userId) {
        const {
            name,
            pan_no,
            gst_no,
            address,
            contact_no,
            email_id,
            vendor_type,
            is_active,
        } = payload;

        const { rows } = await this.#DB.query(
            `
            UPDATE public.ref_vendors
            SET
                name = $1,
                pan_no = $2,
                gst_no = $3,
                address = $4,
                contact_no = $5,
                email_id = $6,
                vendor_type = $7,
                is_active = $8,
                updated_by = $9,
                updated_on = now()
            WHERE id = $10
            RETURNING *
            `,
            [
                name,
                pan_no,
                gst_no,
                address,
                contact_no,
                email_id,
                vendor_type,
                is_active ?? true,
                userId,
                vendorId,
            ]
        );

        return rows[0];
    }

    async getAllByPropertyId(propertyId) {
        const query = `
            select
                id,
                name,
                vendor_type,
                email_id
            from public.ref_vendors
            where property_id = $1
              and is_active = true
            order by name;
        `;

        const { rows } = await this.#DB.query(query, [propertyId]);
        return rows;
    }
}

export default Object.freeze(new VendorService());
