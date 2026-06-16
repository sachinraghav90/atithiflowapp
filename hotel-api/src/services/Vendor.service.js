import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class VendorService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async getByPropertyId(propertyId, page = 1, limit = 10, search = "", type = "", status = "") {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        let searchCondition = "";
        let params = [propertyId];
        let paramIndex = 2; // next placeholder index

        if (type) {
            searchCondition += ` AND vendor_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (status) {
            const normalizedStatus = String(status).trim().toLowerCase();

            if (normalizedStatus === "active" || normalizedStatus === "true") {
                searchCondition += ` AND is_active = $${paramIndex}`;
                params.push(true);
                paramIndex++;
            }

            if (normalizedStatus === "inactive" || normalizedStatus === "false") {
                searchCondition += ` AND is_active = $${paramIndex}`;
                params.push(false);
                paramIndex++;
            }
        }

        if (search?.trim()) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^VE0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const vendorId = Number(rawId);

                searchCondition += `
                    AND (
                        id = $${paramIndex}
                        OR name ILIKE $${paramIndex + 1}
                        OR pan_no ILIKE $${paramIndex + 1}
                        OR gst_no ILIKE $${paramIndex + 1}
                    )
                `;
                params.push(vendorId, `%${normalizedSearch}%`);
                paramIndex += 2;
            } else {
                searchCondition += `
                    AND (
                        name ILIKE $${paramIndex}
                        OR pan_no ILIKE $${paramIndex}
                        OR gst_no ILIKE $${paramIndex}
                    )
                `;
                params.push(`%${normalizedSearch}%`);
                paramIndex++;
            }
        }

        // Add pagination params
        const dataParams = [...params, safeLimit, offset];

        const dataQuery = `
        SELECT
            v.id,
            v.property_id,
            v.name,
            v.pan_no,
            v.gst_no,
            v.address,
            v.contact_no,
            v.email_id,
            v.vendor_type,
            v.is_active,
            v.created_on,
            v.updated_on,
            v.bank_name,
            v.account_holder_name,
            v.account_number,
            v.ifsc_code,
            v.qr_code,
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', ba.id,
                            'account_holder_name', ba.account_holder_name,
                            'account_number', ba.account_number,
                            'ifsc_code', ba.ifsc_code,
                            'bank_name', ba.bank_name,
                            'qr_code', ba.qr_code
                        )
                    )
                    FROM public.vendor_bank_accounts ba
                    WHERE ba.vendor_id = v.id
                ), '[]'::json
            ) AS bank_accounts
        FROM public.ref_vendors v
        WHERE v.property_id = $1
        ${searchCondition.replace(/(\w+)(?=\s*(?:ILIKE|=))/g, 'v.$1')}
        ORDER BY v.id DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
        SELECT COUNT(*) AS total
        FROM public.ref_vendors v
        WHERE v.property_id = $1
        ${searchCondition.replace(/(\w+)(?=\s*(?:ILIKE|=))/g, 'v.$1')}
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
            bank_name,
            account_holder_name,
            account_number,
            ifsc_code,
            qr_code,
            bank_accounts
        } = payload;

        const client = await this.#DB.connect();
        try {
            await client.query("BEGIN");

            const { rows } = await client.query(
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
                bank_name,
                account_holder_name,
                account_number,
                ifsc_code,
                qr_code,
                created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
                bank_name,
                account_holder_name,
                account_number,
                ifsc_code,
                qr_code,
                userId,
            ]
        );

        const vendorId = rows[0].id;

        if (Array.isArray(bank_accounts) && bank_accounts.length > 0) {
            for (const ba of bank_accounts) {
                if (ba.account_holder_name && ba.account_number && ba.ifsc_code && ba.bank_name) {
                    await client.query(
                        `INSERT INTO public.vendor_bank_accounts 
                        (vendor_id, account_holder_name, account_number, ifsc_code, bank_name, qr_code, created_by)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            vendorId,
                            String(ba.account_holder_name).trim(),
                            String(ba.account_number).trim(),
                            String(ba.ifsc_code).trim(),
                            String(ba.bank_name).trim(),
                            ba.qr_code || null,
                            userId
                        ]
                    );
                }
            }
        }

        await client.query("COMMIT");

        await AuditService.log({
            property_id,
            event_id: rows[0].id,
            table_name: "ref_vendors",
            event_type: "CREATE",
            task_name: "Create Vendor",
            comments: "Vendor created",
            details: JSON.stringify({
                vendor_id: rows[0].id,
                name,
                pan_no,
                gst_no,
                address,
                contact_no,
                email_id,
                vendor_type,
                bank_name,
                account_holder_name,
                account_number,
                ifsc_code,
                qr_code,
                is_active: true
            }),
            user_id: userId
        });

        return rows[0];
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
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
            bank_name,
            account_holder_name,
            account_number,
            ifsc_code,
            qr_code,
            is_active,
            bank_accounts
        } = payload;

        const client = await this.#DB.connect();
        try {
            await client.query("BEGIN");

        const currentResult = await client.query(`SELECT * FROM public.ref_vendors WHERE id = $1`, [vendorId]);
        if (currentResult.rowCount === 0) {
            throw new Error("Vendor not found");
        }
        const currentVendor = currentResult.rows[0];

        const currentBankAccountsResult = await client.query(`SELECT * FROM public.vendor_bank_accounts WHERE vendor_id = $1 ORDER BY id ASC`, [vendorId]);
        const currentBankAccounts = currentBankAccountsResult.rows;

        const { rows } = await client.query(
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
                bank_name = $8,
                account_holder_name = $9,
                account_number = $10,
                ifsc_code = $11,
                qr_code = $12,
                is_active = $13,
                updated_by = $14,
                updated_on = now()
            WHERE id = $15
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
                bank_name,
                account_holder_name,
                account_number,
                ifsc_code,
                qr_code,
                is_active ?? true,
                userId,
                vendorId,
            ]
        );

        if (Array.isArray(bank_accounts)) {
            await client.query(`DELETE FROM public.vendor_bank_accounts WHERE vendor_id = $1`, [vendorId]);
            for (const ba of bank_accounts) {
                if (ba.account_holder_name && ba.account_number && ba.ifsc_code && ba.bank_name) {
                    await client.query(
                        `INSERT INTO public.vendor_bank_accounts 
                        (vendor_id, account_holder_name, account_number, ifsc_code, bank_name, qr_code, created_by)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            vendorId,
                            String(ba.account_holder_name).trim(),
                            String(ba.account_number).trim(),
                            String(ba.ifsc_code).trim(),
                            String(ba.bank_name).trim(),
                            ba.qr_code || null,
                            userId
                        ]
                    );
                }
            }
        }

        await client.query("COMMIT");

        const before = {};
        const after = {};
        let hasChanges = false;
        const checkFields = ['name', 'pan_no', 'gst_no', 'address', 'contact_no', 'email_id', 'vendor_type', 'is_active'];

        for (const field of checkFields) {
            if (String(currentVendor[field]) !== String(rows[0][field])) {
                before[field] = currentVendor[field];
                after[field] = rows[0][field];
                hasChanges = true;
            }
        }

        const safeIncomingBanks = Array.isArray(bank_accounts) ? bank_accounts : [];
        let bankChanges = false;
        const maxBanks = Math.max(currentBankAccounts.length, safeIncomingBanks.length);

        for (let i = 0; i < maxBanks; i++) {
            const bBefore = currentBankAccounts[i] || {};
            const bAfter = safeIncomingBanks[i] || {};
            
            if (
                String(bBefore.bank_name || "") !== String(bAfter.bank_name || "") ||
                String(bBefore.account_holder_name || "") !== String(bAfter.account_holder_name || "") ||
                String(bBefore.account_number || "") !== String(bAfter.account_number || "") ||
                String(bBefore.ifsc_code || "") !== String(bAfter.ifsc_code || "")
            ) {
                bankChanges = true;
                break;
            }
        }

        if (bankChanges) {
            before.bank_accounts = currentBankAccounts.map(b => ({
                bank_name: b.bank_name,
                account_holder_name: b.account_holder_name,
                account_number: b.account_number,
                ifsc_code: b.ifsc_code
            }));
            after.bank_accounts = safeIncomingBanks.map(b => ({
                bank_name: b.bank_name,
                account_holder_name: b.account_holder_name,
                account_number: b.account_number,
                ifsc_code: b.ifsc_code
            }));
            hasChanges = true;
        }

        if (hasChanges) {
            await AuditService.log({
                property_id: currentVendor.property_id,
                event_id: vendorId,
                table_name: "ref_vendors",
                event_type: "UPDATE",
                task_name: "Update Vendor",
                comments: "Vendor details updated",
                details: JSON.stringify({ before, after }),
                user_id: userId
            });
        }

        return rows[0];
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
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
