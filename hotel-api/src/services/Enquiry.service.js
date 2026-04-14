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
      FROM public.enquiries
      ${whereClause};
    `;

        const dataResult = await this.#DB.query(
            dataQuery,
            [...values, limit, offset]
        );

        const countResult = await this.#DB.query(countQuery, values);

        const total = countResult.rows[0]?.total || 0;

        return {
            data: dataResult.rows,
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
            // 1️⃣ Create enquiry
            // -----------------------------

            const query = `
            INSERT INTO public.enquiries (
                property_id,
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
                created_by
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                COALESCE($8,'open'),
                $9,$10,$11,$12,$13,$14,
                $15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27
            )
            RETURNING *;
        `;

            const values = [
                payload.property_id,
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
                userId
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

        const fields = [];
        const values = [];
        let i = 1;

        for (const [key, value] of Object.entries(normalizedPayload)) {
            fields.push(`${key} = $${i++}`);
            values.push(value);
        }

        if (fields.length === 0) {
            throw new Error("No fields provided for update");
        }

        // audit fields
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

        if (result.rowCount === 0) {
            throw new Error("Enquiry not found");
        }

        const updated = result.rows[0];

        await AuditService.log({
            property_id: updated.property_id,
            event_id: updated.id,
            table_name: "enquiries",
            event_type: "UPDATE",
            task_name: "Update Enquiry",
            comments: "Enquiry updated",
            details: JSON.stringify({
                updated_fields: Object.keys(normalizedPayload),
                new_values: normalizedPayload
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
