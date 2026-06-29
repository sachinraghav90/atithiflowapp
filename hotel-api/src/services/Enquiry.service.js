import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

const ENQUIRY_UPDATEABLE_COLUMNS = new Set([
    "property_id",
    "booking_id",
    "guest_name",
    "mobile",
    "email",
    "source",
    "enquiry_type",
    "status",
    "agent_name",
    "agent_type",
    "contact_method",
    "city",
    "nationality",
    "plan",
    "total_members",
    "senior_citizens",
    "child",
    "specially_abled",
    "offer_amount",
    "check_in",
    "check_out",
    "booked_by",
    "comment",
    "follow_up_date",
    "quote_amount",
    "is_reserved",
    "is_active",
    "has_alternate_stay",
    "alternate_check_in",
    "alternate_check_out",
    "alternate_room_details",
    "booking_shift_comment",
]);

function toSnakeCase(input) {
    return input
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/-/g, "_")
        .toLowerCase();
}

class EnquiryService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /**
     * GET Enquiry KPIs
     */
    async getEnquiryKpis({ propertyId, from, to, status }) {
        // We ensure to default to 1 month ago if not provided, just as a safety net
        const toDate = to ? new Date(to) : new Date();
        const fromDate = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 1));

        // Add 1 day to 'to' date to make it inclusive in SQL (< next day)
        const toNextDay = new Date(toDate);
        toNextDay.setDate(toNextDay.getDate() + 1);

        const fromStr = fromDate.toISOString();
        const toStr = toNextDay.toISOString();

        // 1. Primary KPIs
        let primarySql = `
            SELECT
                COUNT(e.id)::int AS total_enquiries,
                COUNT(e.id) FILTER (WHERE e.booking_id IS NOT NULL)::int AS converted,
                COUNT(e.id) FILTER (
                    WHERE e.booking_id IS NOT NULL 
                    AND UPPER(COALESCE(b.booking_status, '')) IN ('CANCELLED', 'CANCELED', 'NO_SHOW')
                )::int AS converted_but_canceled
            FROM public.enquiries e
            LEFT JOIN public.bookings b ON b.id = e.booking_id
            WHERE e.property_id = $1
            AND e.created_on >= $2
            AND e.created_on < $3
            AND e.is_active = true
        `;

        const values = [propertyId, fromStr, toStr];

        if (status && status !== "All") {
            primarySql += ` AND e.status = $4`;
            values.push(status);
        }

        const allStatusSql = `
            SELECT
                COALESCE(e.status, 'Unknown') AS status,
                COUNT(*)::int AS total
            FROM public.enquiries e
            WHERE e.property_id = $1
            AND e.created_on >= $2
            AND e.created_on < $3
            AND e.is_active = true
            GROUP BY COALESCE(e.status, 'Unknown')
            ORDER BY status;
        `;

        const [primaryResult, allStatusResult] = await Promise.all([
            this.#DB.query(primarySql, values),
            this.#DB.query(allStatusSql, [propertyId, fromStr, toStr])
        ]);

        const allStatusMap = {
            "Open": 0,
            "Follow Up": 0,
            "Reserved": 0,
            "Booked": 0,
            "Closed": 0,
            "Cancelled": 0
        };

        allStatusResult.rows.forEach(row => {
            allStatusMap[row.status] = row.total;
        });

        const primaryRow = primaryResult.rows[0] || {
            total_enquiries: 0,
            converted: 0,
            converted_but_canceled: 0
        };

        return {
            total_enquiries: primaryRow.total_enquiries,
            converted: primaryRow.converted,
            converted_but_canceled: primaryRow.converted_but_canceled,
            all_status: allStatusMap
        };
    }

    /**
     * GET Enquiries by Property ID (Paginated)
     */
    async getEnquiriesByPropertyId({
        propertyId,
        status,
        isActive = true,
        fromDate,
        toDate,
        page = 1,
        pageSize = 10,
        search = "",
    }) {
        const limit = Math.min(Number(pageSize) || 10, 100); // safety cap
        const currentPage = Math.max(Number(page) || 1, 1);
        const offset = (currentPage - 1) * limit;

        let whereClause = `
      WHERE property_id = $1
        AND is_active = $2
    `;

        const values = [propertyId, isActive];
        let i = values.length + 1;

        if (status) {
            whereClause += ` AND status = $${i++}`;
            values.push(status);
        }

        if (fromDate) {
            whereClause += ` AND created_on >= $${i++}`;
            values.push(fromDate);
        }

        if (toDate) {
            whereClause += ` AND created_on <= $${i++}`;
            values.push(toDate);
        }

        if (search) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^EN0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const enquiryId = Number(rawId);

                whereClause += ` AND (
                    e.id = $${i}
                    OR guest_name ILIKE $${i + 1}
                    OR mobile ILIKE $${i + 1}
                    OR email ILIKE $${i + 1}
                    OR city ILIKE $${i + 1}
                    OR agent_name ILIKE $${i + 1}
                )`;
                values.push(enquiryId, `%${normalizedSearch}%`);
                i += 2;
            } else {
                whereClause += ` AND (
                    guest_name ILIKE $${i}
                    OR mobile ILIKE $${i}
                    OR email ILIKE $${i}
                    OR city ILIKE $${i}
                    OR agent_name ILIKE $${i}
                    OR source ILIKE $${i}
                    OR enquiry_type ILIKE $${i}
                )`;
                values.push(`%${normalizedSearch}%`);
                i++;
            }
        }
    
        const dataQuery = `
          SELECT 
            e.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'room_type', erd.room_type,
                        'no_of_rooms', erd.no_of_rooms
                    )
                ) FILTER (WHERE erd.id IS NOT NULL),
                '[]'
            ) AS room_details
        FROM public.enquiries e
        LEFT JOIN public.enquiry_room_details erd
            ON erd.enquiry_id = e.id
        ${whereClause}
        GROUP BY e.id
        ORDER BY e.created_on DESC
        LIMIT $${i++}
        OFFSET $${i++};
        `;

        const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM public.enquiries e
      ${whereClause};
    `;

        const dataResult = await this.#DB.query(
            dataQuery,
            [...values, limit, offset]
        );

        const countResult = await this.#DB.query(countQuery, values);

        const total = countResult.rows[0]?.total || 0;

        const records = dataResult.rows.map(row => {
            const cleanRow = { ...row };
            delete cleanRow.alternate_room_details;
            return cleanRow;
        });

        return {
            data: records,
            pagination: {
                page: currentPage,
                pageSize: limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * CREATE Enquiry
     */
    async createEnquiry(payload, userId) {

        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            // -----------------------------
            // Allocate sequence
            // -----------------------------
            const seqResult = await client.query(`
                INSERT INTO public.property_counters (property_id, counter_name, next_value)
                VALUES ($1, 'ENQUIRY', 1)
                ON CONFLICT (property_id, counter_name)
                DO UPDATE SET 
                    next_value = public.property_counters.next_value + 1,
                    updated_on = now()
                RETURNING next_value
            `, [payload.property_id]);
            
            const nextSeq = seqResult.rows[0].next_value;

            // -----------------------------
            // 1️⃣ Create enquiry
            // -----------------------------

            const query = `
            INSERT INTO public.enquiries (
                property_id,
                enquiry_sequence,
                booking_id,
                guest_name,
                mobile,
                email,
                source,
                enquiry_type,
                status,
                agent_name,
                agent_type,
                contact_method,
                city,
                nationality,
                plan,
                total_members,
                senior_citizens,
                child,
                specially_abled,
                offer_amount,
                check_in,
                check_out,
                booked_by,
                comment,
                follow_up_date,
                quote_amount,
                is_reserved,
                created_by,
                has_alternate_stay,
                alternate_check_in,
                alternate_check_out,
                alternate_room_details
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,
                COALESCE($9,'open'),
                $10,$11,$12,$13,$14,$15,
                $16,$17,$18,$19,$20,
                $21,$22,$23,$24,$25,$26,$27,$28,
                $29,$30,$31,$32
            )
            RETURNING *;
        `;

            const values = [
                payload.property_id,
                nextSeq,
                payload.booking_id ?? null,
                payload.guest_name,
                payload.mobile ?? null,
                payload.email ?? null,
                payload.source ?? null,
                payload.enquiry_type ?? null,
                payload.status ?? "open",
                payload.agent_name ?? null,
                payload.agent_type ?? null,
                payload.contact_method ?? null,
                payload.city ?? null,
                payload.nationality ?? null,
                payload.plan ?? null,
                payload.total_members ?? null,
                payload.senior_citizens ?? null,
                payload.child ?? null,
                payload.specially_abled ?? null,
                payload.offer_amount ?? null,
                payload.check_in ?? null,
                payload.check_out ?? null,
                payload.booked_by ?? null,
                payload.comment ?? null,
                payload.follow_up_date ?? null,
                payload.quote_amount ?? null,
                payload.is_reserved ?? false,
                userId,
                payload.has_alternate_stay ?? false,
                payload.alternate_check_in ?? null,
                payload.alternate_check_out ?? null,
                payload.alternate_room_details ? JSON.stringify(payload.alternate_room_details) : null
            ];

            const result = await client.query(query, values);
            const enquiry = result.rows[0];

            // -----------------------------
            // 2️⃣ Insert room details
            // -----------------------------

            if (payload.room_details?.length) {

                const insertRoomQuery = `
                    INSERT INTO public.enquiry_room_details
                    (enquiry_id, room_type, no_of_rooms)
                    VALUES ($1,$2,$3)
                `;

                for (const room of payload.room_details) {

                    await client.query(insertRoomQuery, [
                        enquiry.id,
                        room.room_type,
                        room.no_of_rooms || 1
                    ]);
                }
            }


            await client.query("COMMIT");

            // -----------------------------
            // Audit log
            // -----------------------------

            await AuditService.log({
                property_id: enquiry.property_id,
                event_id: enquiry.id,
                table_name: "enquiries",
                event_type: "CREATE",
                task_name: "Create Enquiry",
                comments: "New enquiry created",
                details: JSON.stringify({
                    guest_name: enquiry.guest_name,
                    room_count: payload.room_details?.length || 0
                }),
                user_id: userId
            });

            return enquiry;

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * UPDATE Enquiry (Partial Update)
     */
    async updateEnquiry(enquiryId, payload, userId) {
        const normalizedPayload = {};

        for (const [rawKey, value] of Object.entries(payload)) {
            if (rawKey === "id" || rawKey === "room_details") {
                continue;
            }

            const normalizedKey = toSnakeCase(rawKey);

            if (!ENQUIRY_UPDATEABLE_COLUMNS.has(normalizedKey)) {
                continue;
            }

            if (!(normalizedKey in normalizedPayload)) {
                normalizedPayload[normalizedKey] = value;
            }
        }

        // Fetch current state
        const currentResult = await this.#DB.query(`SELECT * FROM public.enquiries WHERE id = $1`, [enquiryId]);
        if (currentResult.rowCount === 0) {
            throw new Error("Enquiry not found");
        }
        const currentEnquiry = currentResult.rows[0];

        // Diff
        const before = {};
        const after = {};
        let hasChanges = false;

        for (const [key, value] of Object.entries(normalizedPayload)) {
            const oldValue = currentEnquiry[key] ?? null;
            const newValue = value ?? null;
            let isDifferent = false;
            
            if (key === 'follow_up_date' || key === 'check_in' || key === 'check_out') {
                const d1 = oldValue ? new Date(oldValue).getTime() : null;
                const d2 = newValue ? new Date(newValue).getTime() : null;
                isDifferent = d1 !== d2;
            } else {
                isDifferent = String(oldValue) !== String(newValue);
            }

            if (isDifferent) {
                before[key] = oldValue;
                after[key] = newValue;
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            return currentEnquiry;
        }

        const fields = [];
        const values = [];
        let i = 1;

        for (const [key, value] of Object.entries(after)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
        }

        const auditBefore = { ...before };
        const auditAfter = { ...after };

        if (hasChanges) {
            auditBefore.contact_method = currentEnquiry.contact_method;
            auditAfter.contact_method = normalizedPayload.contact_method !== undefined ? normalizedPayload.contact_method : currentEnquiry.contact_method;
            
            auditBefore.mobile = currentEnquiry.mobile;
            auditAfter.mobile = normalizedPayload.mobile !== undefined ? normalizedPayload.mobile : currentEnquiry.mobile;
            
            auditBefore.email = currentEnquiry.email;
            auditAfter.email = normalizedPayload.email !== undefined ? normalizedPayload.email : currentEnquiry.email;
        }

        // audit fields
        after.updated_by = userId;
        fields.push(`updated_by = $${i++}`);
        values.push(userId);

        fields.push(`updated_on = now()`);

        const query = `
      UPDATE public.enquiries
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING *;
    `;

        values.push(enquiryId);

        const result = await this.#DB.query(query, values);
        const updated = result.rows[0];

        const isNewBooking = 'booking_id' in after && after.booking_id && !before.booking_id;

        await AuditService.log({
            property_id: updated.property_id,
            event_id: updated.id,
            table_name: "enquiries",
            event_type: isNewBooking ? "NEW_BOOKING" : "UPDATE",
            task_name: isNewBooking ? "New Booking Created" : "Update Enquiry",
            comments: isNewBooking ? "New booking created from enquiry" : "Enquiry updated",
            details: JSON.stringify({
                before: auditBefore,
                after: auditAfter
            }),
            user_id: userId
        });

        return updated;
    }

    /**
     * SOFT DELETE (Deactivate)
     */
    async deactivateEnquiry(enquiryId, userId) {
        const query = `
      UPDATE public.enquiries
      SET 
        is_active = false,
        updated_by = $2,
        updated_on = now()
      WHERE id = $1
      RETURNING *;
    `;

        const result = await this.#DB.query(query, [enquiryId, userId]);

        if (result.rowCount === 0) {
            throw new Error("Enquiry not found");
        }

        const deactivated = result.rows[0];

        await AuditService.log({
            property_id: deactivated.property_id,
            event_id: deactivated.id,
            table_name: "enquiries",
            event_type: "DEACTIVATE",
            task_name: "Deactivate Enquiry",
            comments: "Enquiry deactivated",
            details: JSON.stringify({
                previous_status: deactivated.status,
                is_active: false
            }),
            user_id: userId
        });

        return deactivated;
    }
}

export default Object.freeze(new EnquiryService());
