import { getDb } from "../../utils/getDb.js";

class Staff {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    #addressJoin() {
        return `
        LEFT JOIN public.addresses a
            ON a.entity_type = 'STAFF'
           AND a.entity_id = s.id
           AND a.address_type = 'HOME'
           AND a.is_primary = true
        `;
    }

    /* ------------------------------------------------------------------ */
    /* Get All                                                            */
    /* ------------------------------------------------------------------ */

    async getAll({ page = 1, limit = 10, search, department, designation, status }) {
        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let idx = 1;

        if (search) {
            where.push(`(
                s.first_name ILIKE $${idx}
                OR s.last_name ILIKE $${idx}
                OR s.email ILIKE $${idx}
            )`);
            values.push(`%${search}%`);
            idx++;
        }

        if (department) {
            where.push(`s.department = $${idx++}`);
            values.push(department);
        }

        if (designation) {
            where.push(`s.designation = $${idx++}`);
            values.push(designation);
        }

        if (status) {
            where.push(`s.status = $${idx++}`);
            values.push(status);
        }

        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(
                `
                SELECT
                    s.id,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    a.address,
                    s.gender,
                    s.marital_status,
                    s.employment_type,
                    s.email,
                    s.phone1,
                    s.phone2,
                    s.emergency_contact,
                    s.blood_group,
                    s.designation,
                    s.department,
                    s.hire_date,
                    s.leave_days,
                    s.dob,
                    s.shift_pattern,
                    s.status,
                    s.user_id,
                    s.created_on,
                    s.updated_on
                FROM public.staff s
                ${this.#addressJoin()}
                ${whereClause}
                ORDER BY s.id DESC
                LIMIT $${idx} OFFSET $${idx + 1}
                `,
                [...values, limit, offset]
            ),
            this.#DB.query(
                `
                SELECT COUNT(*)::int AS total
                FROM public.staff s
                ${this.#addressJoin()}
                ${whereClause}
                `,
                values
            )
        ]);

        return {
            data: dataRes.rows.map(r => ({
                ...r,
                address: r.address_line_1 || null
            })),
            pagination: {
                page,
                limit,
                total: countRes.rows[0].total,
                totalPages: Math.ceil(countRes.rows[0].total / limit)
            }
        };
    }

    /* ------------------------------------------------------------------ */
    /* Get By ID                                                          */
    /* ------------------------------------------------------------------ */

    async getById(id) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                s.id,
                s.salutation,
                s.first_name,
                s.middle_name,
                s.last_name,
                a.address_line_1 AS address,
                s.gender,
                s.marital_status,
                s.employment_type,
                s.email,
                s.phone1,
                s.phone2,
                s.emergency_contact,
                s.emergency_contact_2,
                s.emergency_contact_relation,
                s.emergency_contact_relation_2,
                s.emergency_contact_name,
                s.emergency_contact_name_2,
                s.id_proof_type,
                s.id_number,
                s.blood_group,
                s.designation,
                s.department,
                s.hire_date,
                s.leave_days,
                s.dob,
                s.shift_pattern,
                s.status,
                s.user_id,
                s.created_by,
                s.created_on,
                s.updated_by,
                s.updated_on,
                s.nationality,
                s.country,
                u.property_id,

                /* ---------- VISA FIELDS (FLAT) ---------- */
                CASE 
                    WHEN s.nationality = 'foreigner' THEN vd.visa_number
                    ELSE NULL
                END AS visa_number,

                CASE 
                    WHEN s.nationality = 'foreigner' THEN vd.issued_date
                    ELSE NULL
                END AS visa_issue_date,

                CASE 
                    WHEN s.nationality = 'foreigner' THEN vd.expiry_date
                    ELSE NULL
                END AS visa_expiry_date,

                COALESCE(
                    jsonb_agg(
                        DISTINCT jsonb_build_object(
                            'id', r.id,
                            'name', r.name
                        )
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'::jsonb
                ) AS roles

            FROM public.staff s
            LEFT JOIN public.users u 
                ON u.id = s.user_id

            LEFT JOIN public.property_users pu
                ON pu.user_id = u.id

            LEFT JOIN public.roles r
                ON r.id = pu.role_id

            ${this.#addressJoin()}

            /* visa join */
            LEFT JOIN public.visa_details vd
                ON vd.staff_id = s.id

            WHERE s.id = $1

            GROUP BY
                s.id,
                u.property_id,
                a.address_line_1,
                vd.visa_number,
                vd.issued_date,
                vd.expiry_date
            `,
            [id]
        );

        return rows[0] ?? null;
    }

    /* ------------------------------------------------------------------ */
    /* Create                                                            */
    /* ------------------------------------------------------------------ */

    async create({ payload, files, userId }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const {
                address,
                ...staffPayload
            } = payload;

            const image = files?.image;
            console.log("🚀 ~ Staff ~ create ~ image:", image)
            const idProof = files?.id_proof;
            console.log("🚀 ~ Staff ~ create ~ idProof:", idProof)

            const { rows } = await client.query(
                `
                INSERT INTO public.staff (
                    salutation,
                    first_name,
                    middle_name,
                    last_name,
                    gender,
                    marital_status,
                    employment_type,
                    email,
                    phone1,
                    phone2,
                    emergency_contact,
                    id_proof_type,
                    id_number,
                    blood_group,
                    designation,
                    department,
                    hire_date,
                    leave_days,
                    dob,
                    shift_pattern,
                    status,
                    image,
                    image_mime,
                    id_proof,
                    id_proof_mime,
                    created_by,
                    user_id,
                    emergency_contact_relation,
                    emergency_contact_2,
                    emergency_contact_relation_2,
                    emergency_contact_name,
                    emergency_contact_name_2,
                    nationality,
                    country
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                    $11,$12,$13,$14,$15,$16,$17,$18,
                    $19,$20,$21,$22,$23,$24,$25,$26,
                    $27,$28,$29,$30,$31,$32,$33,$34
                )
                RETURNING id
                `,
                [
                    staffPayload.salutation,
                    staffPayload.first_name,
                    staffPayload.middle_name,
                    staffPayload.last_name,
                    staffPayload.gender,
                    staffPayload.marital_status,
                    staffPayload.employment_type,
                    staffPayload.email,
                    staffPayload.phone1,
                    staffPayload.phone2,
                    staffPayload.emergency_contact,
                    staffPayload.id_proof_type,
                    staffPayload.id_number,
                    staffPayload.blood_group,
                    staffPayload.designation,
                    staffPayload.department,
                    staffPayload.hire_date,
                    staffPayload.leave_days ?? 0,
                    staffPayload.dob,
                    staffPayload.shift_pattern,
                    staffPayload.status ?? "active",
                    image?.[0]?.buffer ?? null,
                    image?.[0]?.mimetype ?? null,
                    idProof?.[0]?.buffer ?? null,
                    idProof?.[0]?.mimetype ?? null,
                    userId,
                    staffPayload.user_id,
                    staffPayload.emergency_contact_relation,
                    staffPayload.emergency_contact_2,
                    staffPayload.emergency_contact_relation_2,
                    staffPayload.emergency_contact_name,
                    staffPayload.emergency_contact_name_2,
                    staffPayload.nationality,
                    staffPayload.country,
                ]
            );

            const staffId = rows[0].id;

            if (address) {
                await client.query(
                    `
                    INSERT INTO public.addresses (
                        entity_type, entity_id, address_type,
                        address_line_1, is_primary, created_by
                    )
                    VALUES ('STAFF', $1, 'HOME', $2, true, $3)
                    `,
                    [staffId, address, userId]
                );
            }

            await client.query("COMMIT");
            return rows[0];

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Update (Staff + Address)                                           */
    /* ------------------------------------------------------------------ */

    async update(id, payload, files, updated_by, client) {
        const STAFF_FIELDS = [
            "salutation", "first_name", "middle_name", "last_name", "gender",
            "marital_status", "employment_type", "email",
            "phone1", "phone2", "emergency_contact",
            "id_proof_type", "id_number", "blood_group",
            "designation", "department", "hire_date",
            "leave_days", "dob", "shift_pattern", "status",
            "user_id", "emergency_contact_relation",
            "emergency_contact_2", "emergency_contact_relation_2",
            "emergency_contact_name", "emergency_contact_name_2", "nationality", "country"
        ];

        const fields = [];
        const values = [];
        let idx = 1;

        for (const key of STAFF_FIELDS) {
            if (payload[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(payload[key]);
            }
        }

        if (files?.image) {
            fields.push(`image = $${idx++}`);
            values.push(files.image[0].buffer);
            fields.push(`image_mime = $${idx++}`);
            values.push(files.image[0].mimetype);
        }

        if (files?.id_proof) {
            fields.push(`id_proof = $${idx++}`);
            values.push(files.id_proof[0].buffer);
            fields.push(`id_proof_mime = $${idx++}`);
            values.push(files.id_proof[0].mimetype);
        }

        fields.push(`updated_by = $${idx++}`);
        values.push(updated_by);
        fields.push(`updated_on = now()`);

        if (fields.length) {
            await client.query(
                `
                UPDATE public.staff
                SET ${fields.join(", ")}
                WHERE id = $${idx}
                `,
                [...values, id]
            );
        }

        /* Address upsert */
        if (payload.address !== undefined) {
            await client.query(
                `
                INSERT INTO public.addresses (
                    entity_type, entity_id, address_type,
                    address_line_1, is_primary, created_by
                )
                VALUES ('STAFF', $1, 'HOME', $2, true, $3)
                ON CONFLICT (entity_type, entity_id, address_type)
                WHERE is_primary = true
                DO UPDATE SET
                    address_line_1 = EXCLUDED.address_line_1,
                    updated_by = $3,
                    updated_on = now()
                `,
                [id, payload.address, updated_by]
            );
        }
    }

    async getImage(id) {
        const { rows } = await this.#DB.query(
            `SELECT image, image_mime FROM public.staff WHERE id = $1`,
            [id]
        );
        console.log("🚀 ~ Staff ~ getImage ~ rows:", rows)
        return rows[0];
    }

    async getIdProof(id) {
        const { rows } = await this.#DB.query(
            `SELECT id_proof, id_proof_mime FROM public.staff WHERE id = $1`,
            [id]
        );
        return rows[0];
    }

    async getStaffByPropertyId({
        property_id,
        page = 1,
        limit = 10,
        search,
        department,
        status,
        userRoles
    }) {

        const offset = Math.max(0, (page - 1) * limit);

        const privilegedRoles = ["SUPER_ADMIN", "OWNER"];
        const isPrivileged = userRoles.some(role =>
            privilegedRoles.includes(role)
        );

        const where = [
            `pu.property_id = $1`
        ];

        const values = [property_id];
        let idx = 2;

        if (!isPrivileged) {

            // non privileged users cannot see ADMIN/OWNER
            where.push(`
            LOWER(r.name) NOT IN ('admin','owner')
        `);

        }

        if (search) {
            where.push(`
            (
                s.first_name ILIKE $${idx}
                OR s.last_name ILIKE $${idx}
                OR s.email ILIKE $${idx}
            )
        `);
            values.push(`%${search}%`);
            idx++;
        }

        if (department) {
            where.push(`s.department = $${idx++}`);
            values.push(department);
        }

        if (status) {
            where.push(`s.status = $${idx++}`);
            values.push(status);
        }

        const whereClause = `WHERE ${where.join(" AND ")}`;

        const [dataRes, countRes] = await Promise.all([

            this.#DB.query(
                `
                SELECT DISTINCT
                    s.id,
                    s.salutation,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.email,
                    s.phone1,
                    s.phone2,
                    s.designation,
                    s.department,
                    s.status,
                    s.employment_type,
                    s.shift_pattern,
                    s.hire_date,
                    s.leave_days,
                    u.id AS user_id,
                    pu.property_id

                FROM public.staff s

                JOIN public.users u
                    ON u.id = s.user_id

                JOIN public.property_users pu
                    ON pu.user_id = u.id

                JOIN public.roles r
                    ON r.id = pu.role_id

                ${whereClause}

                ORDER BY s.id DESC
                LIMIT $${idx} OFFSET $${idx + 1}
                `,
                [...values, limit, offset]
            ),

            this.#DB.query(
                `
                SELECT COUNT(DISTINCT s.id)::int AS total

                FROM public.staff s

                JOIN public.users u
                    ON u.id = s.user_id

                JOIN public.property_users pu
                    ON pu.user_id = u.id

                JOIN public.roles r
                    ON r.id = pu.role_id

                ${whereClause}
                `,
                values
            ),

        ]);

        return {
            data: dataRes.rows,
            pagination: {
                page: Math.max(1, page),
                limit,
                total: countRes.rows[0].total,
                totalPages: Math.ceil(countRes.rows[0].total / limit),
            },
        };
    }

}

export default Object.freeze(new Staff());
