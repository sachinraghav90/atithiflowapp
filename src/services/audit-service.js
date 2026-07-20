import { getDb } from "../../utils/getDb.js";

class AuditService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async log({
        property_id,
        event_id,
        table_name,
        event_type,
        task_name = null,
        comments = null,
        details = null,
        user_id = null,
        client = null
    }) {
        if (!property_id || !event_id || !table_name || !event_type) {
            throw new Error("Missing required audit fields");
        }

        const db = client || this.#DB;

        await db.query(
            `
            INSERT INTO audits (
                property_id,
                event_id,
                table_name,
                event_type,
                task_name,
                comments,
                details,
                user_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
                property_id,
                event_id,
                table_name,
                event_type,
                task_name,
                comments,
                details,
                user_id
            ]
        );
    }

    /* ===========================
      GET AUDITS BY EVENT + TABLE
      =========================== */
    async getByEventAndTable({
        eventId,
        tableName,
        page = 1,
        limit = 20
    }) {
        if (!eventId || !tableName) {
            throw new Error("eventId and tableName are required");
        }

        const parsedPage = Number(page);
        const parsedLimit = Number(limit);

        const safePage = Number.isFinite(parsedPage) && parsedPage > 0
            ? parsedPage
            : 1;

        const safeLimit = Number.isFinite(parsedLimit)
            ? Math.min(Math.max(parsedLimit, 1), 100)
            : 10; // default limit

        const offset = (safePage - 1) * safeLimit;


        /* -------- DATA QUERY -------- */
        const dataQuery = `
            SELECT
                a.id,
                a.property_id,
                a.event_id,
                a.table_name,
                a.event_type,
                a.task_name,
                a.comments,
                a.details,
                a.user_id,
                u.email        AS user_email,
                s.first_name   AS user_first_name,
                s.last_name    AS user_last_name,
                a.created_on
            FROM public.audits a

            LEFT JOIN public.users u
                ON u.id = a.user_id
            LEFT JOIN public.staff s
                ON s.user_id = u.id

            WHERE a.event_id = $1
              AND a.table_name = $2

            ORDER BY a.created_on DESC
            LIMIT $3 OFFSET $4
        `;

        /* -------- COUNT QUERY -------- */
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.audits
            WHERE event_id = $1
              AND table_name = $2
        `;

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(dataQuery, [eventId, tableName, safeLimit, offset]),
            this.#DB.query(countQuery, [eventId, tableName])
        ]);

        const total = countRes.rows[0]?.total || 0;

        return {
            data: dataRes.rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }

    /* ===========================
       GET BY TABLE ONLY
       =========================== */
    async getByTableName({
        tableName,
        propertyId,
        page = 1,
        limit = 10,
        search = "",
        action = ""
    }) {

        if (!tableName) throw new Error("tableName is required");

        const safePage = Number.isFinite(Number(page))
            ? Math.max(Number(page), 1)
            : 1;

        const safeLimit = Number.isFinite(Number(limit))
            ? Math.min(Math.max(Number(limit), 1), 100)
            : 10;

        const offset = (safePage - 1) * safeLimit;

        /* ---------- BUILD FILTER ---------- */

        const filters = [`a.table_name = $1`];
        const values = [tableName];

        let paramIndex = 2;

        if (propertyId) {
            filters.push(`a.property_id = $${paramIndex++}`);
            values.push(propertyId);
        }

        if (action && action !== "All") {
            filters.push(`a.event_type ILIKE $${paramIndex++}`);
            values.push(action);
        }

        if (search) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^[A-Za-z]{2,4}0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                // Exclude a.details::text for formatted IDs to prevent base64 string collisions
                const detailsSearch = !formattedIdMatch ? `a.details::text ILIKE $${paramIndex} OR ` : '';
                filters.push(`(
                    a.comments ILIKE $${paramIndex} OR 
                    s.first_name ILIKE $${paramIndex} OR 
                    s.last_name ILIKE $${paramIndex} OR 
                    ${detailsSearch}
                    a.event_id::text ILIKE $${paramIndex} OR
                    a.event_id::text = $${paramIndex + 1}::text
                )`);
                values.push(`%${search}%`, String(rawId));
                paramIndex += 2;
            } else {
                filters.push(`(
                    a.comments ILIKE $${paramIndex} OR 
                    s.first_name ILIKE $${paramIndex} OR 
                    s.last_name ILIKE $${paramIndex} OR 
                    a.details::text ILIKE $${paramIndex} OR 
                    a.event_id::text ILIKE $${paramIndex}
                )`);
                values.push(`%${search}%`);
                paramIndex++;
            }
        }

        const whereClause = filters.join(" AND ");

        /* ---------- DATA QUERY ---------- */

        const dataQuery = `
        SELECT
            a.*,
            u.email        AS user_email,
            s.first_name   AS user_first_name,
            s.last_name    AS user_last_name
        FROM public.audits a

        LEFT JOIN public.users u
            ON u.id = a.user_id

        LEFT JOIN public.staff s
            ON s.user_id = u.id

        WHERE ${whereClause}
        ORDER BY a.created_on DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

        const countQuery = `
        SELECT COUNT(*)::int AS total
        FROM public.audits a
        WHERE ${whereClause}
    `;

        const dataValues = [...values, safeLimit, offset];

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(dataQuery, dataValues),
            this.#DB.query(countQuery, values)
        ]);

        /* ---------- PARSE DETAILS SAFELY ---------- */

        const parsedRows = dataRes.rows.map(row => {
            let parsedDetails = null;

            if (row.details) {
                try {
                    parsedDetails = JSON.parse(row.details);
                } catch {
                    parsedDetails = null;
                }
            }

            return {
                ...row,
                details: parsedDetails
            };
        });

        const total = countRes.rows[0]?.total || 0;

        return {
            data: parsedRows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }
}

export default Object.freeze(new AuditService());
