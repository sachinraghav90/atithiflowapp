import { generatePropertyRoomTypeRates } from "../../utils/generatePropertyRoomTypeRates.js";
import { getDb } from "../../utils/getDb.js";
import { roles } from "../../utils/roles.js";
import AuditService from "./Audit.service.js";
import LaundrySetupServiceService from "./LaundrySetupService.service.js";

class Property {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    #addressJoins() {
        return `
        LEFT JOIN public.addresses pa
            ON pa.entity_type = 'PROPERTY'
           AND pa.entity_id = p.id
           AND pa.address_type = 'PROPERTY'
          -- AND pa.is_primary = true

        LEFT JOIN public.addresses oa
            ON oa.entity_type = 'PROPERTY'
           AND oa.entity_id = p.id
           AND oa.address_type = 'OFFICE'
          -- AND oa.is_primary = true
        `;
    }

    async getById({ id }) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                p.*,

                -- property address
                pa.address_line_1,
                pa.address_line_2,
                pa.city,
                pa.state,
                pa.postal_code,
                pa.country,

                -- office address
                oa.address_line_1 AS address_line_1_office,
                oa.address_line_2 AS address_line_2_office,
                oa.city AS city_office,
                oa.state AS state_office,
                oa.postal_code AS postal_code_office,
                oa.country AS country_office

            FROM public.properties p
            ${this.#addressJoins()}
            WHERE p.id = $1
            `,
            [id]
        );

        return rows[0] ?? null;
    }

    async getAll({
        page = 1,
        limit = 10,
        city,
        state,
        country,
        is_active,
        search,
        user_id,
        isSuperAdmin
    }) {
        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let idx = 1;

        /* ------------------------------------------------ */
        /* ACCESS CONTROL                                  */
        /* ------------------------------------------------ */

        let accessJoin = "";

        if (!isSuperAdmin) {

            accessJoin = `
            JOIN public.property_users pu
                ON pu.property_id = p.id
               AND pu.user_id = $${idx}
        `;

            values.push(user_id);
            idx++;

        }

        /* ------------------------------------------------ */
        /* FILTERS                                          */
        /* ------------------------------------------------ */

        if (city) {
            where.push(`pa.city ILIKE $${idx++}`);
            values.push(`%${city}%`);
        }

        if (state) {
            where.push(`pa.state ILIKE $${idx++}`);
            values.push(`%${state}%`);
        }

        if (country) {
            where.push(`pa.country = $${idx++}`);
            values.push(country);
        }

        if (typeof is_active === "boolean") {
            where.push(`p.is_active = $${idx++}`);
            values.push(is_active);
        }

        if (search) {
            where.push(`(
            p.brand_name ILIKE $${idx}
            OR pa.city ILIKE $${idx}
        )`);
            values.push(`%${search}%`);
            idx++;
        }

        const whereClause = where.length
            ? `WHERE ${where.join(" AND ")}`
            : "";

        /* ------------------------------------------------ */
        /* QUERY                                            */
        /* ------------------------------------------------ */

        const [dataRes, countRes] = await Promise.all([

            this.#DB.query(
                `
            SELECT DISTINCT
                p.id,
                p.brand_name,

                pa.address_line_1,
                pa.address_line_2,
                pa.city,
                pa.state,
                pa.postal_code,
                pa.country,

                p.checkin_time,
                p.checkout_time,
                p.is_active,
                --p.owner_user_id,
                p.created_by,
                p.created_on,
                p.updated_by,
                p.updated_on,
                p.room_tax_rate,
                p.gst,
                p.serial_number,
                p.total_floors,
                p.phone,
                p.phone2,
                p.email,
                p.total_rooms,
                p.year_opened,
                p.is_pet_friendly,
                p.smoking_policy,
                p.cancellation_policy,
                p.gst_no,
                p.location_link,
                p.logo_mime,
                p.restaurant_tables,

                oa.address_line_1 AS address_line_1_office,
                oa.address_line_2 AS address_line_2_office,
                oa.city AS city_office,
                oa.state AS state_office,
                oa.postal_code AS postal_code_office,
                oa.country AS country_office,

                p.phone_office,
                p.phone2_office,
                p.email_office,
                p.status

            FROM public.properties p
            ${accessJoin}
            ${this.#addressJoins()}
            ${whereClause}

            ORDER BY p.id DESC
            LIMIT $${idx} OFFSET $${idx + 1}
            `,
                [...values, limit, offset]
            ),

            this.#DB.query(
                `
            SELECT COUNT(DISTINCT p.id)::int AS total
            FROM public.properties p
            ${accessJoin}
            ${this.#addressJoins()}
            ${whereClause}
            `,
                values
            )
        ]);

        return {
            data: dataRes.rows,
            pagination: {
                page,
                limit,
                total: countRes.rows[0].total,
                totalPages: Math.ceil(countRes.rows[0].total / limit)
            }
        };
    }

    async create({ payload, userId, ownerUserId }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const {
                brand_name,
                checkin_time,
                checkout_time,
                is_active = true,
                room_tax_rate = 0,
                gst = 0,
                serial_number,
                total_floors,
                phone,
                phone2,
                email,
                total_rooms,
                year_opened,
                is_pet_friendly = false,
                smoking_policy,
                cancellation_policy,
                image,
                image_mime,
                gst_no,
                location_link,
                logo,
                logo_mime,
                phone_office,
                phone2_office,
                email_office,
                status,
                bank_accounts,

                // property address
                address_line_1,
                address_line_2,
                city,
                state,
                postal_code,
                country,

                // office address
                address_line_1_office,
                address_line_2_office,
                city_office,
                state_office,
                postal_code_office,
                country_office,

                restaurant_tables = 0,
            } = payload;

            const { rows } = await client.query(
                `
                INSERT INTO public.properties (
                    brand_name,
                    checkin_time,
                    checkout_time,
                    is_active,
                    created_by,
                    room_tax_rate,
                    gst,
                    serial_number,
                    total_floors,
                    phone,
                    phone2,
                    email,
                    total_rooms,
                    year_opened,
                    is_pet_friendly,
                    smoking_policy,
                    cancellation_policy,
                    image,
                    image_mime,
                    owner_user_id,
                    gst_no,
                    location_link,
                    logo,
                    logo_mime,
                    phone_office,
                    phone2_office,
                    email_office,
                    status,
                    restaurant_tables
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                    $11,$12,$13,$14,$15,$16,$17,$18,
                    $19,$20,$21,$22,$23,$24,$25,$26,
                    $27,$28,$29
                )
                RETURNING id
                `,
                [
                    brand_name,
                    checkin_time,
                    checkout_time,
                    is_active === true || is_active === "true",
                    userId,
                    Number(room_tax_rate),
                    Number(gst),
                    serial_number,
                    total_floors ? Number(total_floors) : null,
                    phone,
                    phone2,
                    email,
                    total_rooms ? Number(total_rooms) : null,
                    year_opened ? Number(year_opened) : null,
                    is_pet_friendly === true || is_pet_friendly === "true",
                    smoking_policy,
                    cancellation_policy,
                    image,
                    image_mime,
                    ownerUserId,
                    gst_no,
                    location_link,
                    logo,
                    logo_mime,
                    phone_office,
                    phone2_office,
                    email_office,
                    status,
                    Math.max(0, Number(restaurant_tables) || 0)
                ]
            );

            const propertyId = rows[0].id;

            // Property address
            await client.query(
                `
                INSERT INTO public.addresses (
                    entity_type, entity_id, address_type,
                    address_line_1, address_line_2,
                    city, state, postal_code, country,
                    is_primary, created_by
                )
                VALUES ('PROPERTY', $1, 'PROPERTY', $2,$3,$4,$5,$6,$7, true, $8)
                `,
                [
                    propertyId,
                    address_line_1,
                    address_line_2,
                    city,
                    state,
                    postal_code,
                    country,
                    userId
                ]
            );

            // Office address (optional)
            if (address_line_1_office) {
                await client.query(
                    `
                    INSERT INTO public.addresses (
                        entity_type, entity_id, address_type,
                        address_line_1, address_line_2,
                        city, state, postal_code, country,
                        is_primary, created_by
                    )
                    VALUES ('PROPERTY', $1, 'OFFICE', $2,$3,$4,$5,$6,$7, true, $8)
                    `,
                    [
                        propertyId,
                        address_line_1_office,
                        address_line_2_office,
                        city_office,
                        state_office,
                        postal_code_office,
                        country_office,
                        userId
                    ]
                );
            }

            /* -------------------------------------- */
            /* ATTACH OWNER ROLE TO PROPERTY         */
            /* -------------------------------------- */

            const result = await client.query(`
                        UPDATE public.property_users pu
                        SET property_id = $1
                        FROM public.roles r
                        WHERE pu.user_id = $2
                        AND pu.role_id = r.id
                        AND pu.property_id IS NULL
                        AND LOWER(r.name) <> 'super_admin'
                        RETURNING pu.id
                    `,
                [
                    propertyId,
                    ownerUserId
                ]);

            // If no NULL row found → create new membership
            if (result.rowCount === 0) {

                await client.query(`
                        INSERT INTO public.property_users (
                            property_id,
                            user_id,
                            role_id
                        )
                        SELECT
                            $1,
                            $2,
                            r.id
                        FROM public.roles r
                        WHERE LOWER(r.name) = 'owner'
                        ON CONFLICT DO NOTHING
                    `,
                    [
                        propertyId,
                        ownerUserId
                    ]);

            }


            await client.query("COMMIT");

            try {
                await generatePropertyRoomTypeRates(client, propertyId, userId);
                await LaundrySetupServiceService.initPropertyLaundry({ propertyId, userId })

                /* ---------- AUDIT ---------- */
                await AuditService.log({
                    property_id: propertyId,
                    event_id: propertyId,
                    table_name: "properties",
                    event_type: "CREATE",
                    task_name: "Create Property",
                    comments: "New property created",
                    details: JSON.stringify({
                        property_id: propertyId,
                        brand_name,
                        city,
                        state,
                        country,
                        owner_user_id: ownerUserId,
                        phone,
                        email,
                        status
                    }),
                    user_id: userId
                });
            } catch (error) {

            }

            return { id: propertyId };

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }
    async update({ id, payload, userId }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const PROPERTY_ADDRESS_FIELDS = [
                "address_line_1",
                "address_line_2",
                "city",
                "state",
                "postal_code",
                "country"
            ];

            const OFFICE_ADDRESS_FIELDS = [
                "address_line_1_office",
                "address_line_2_office",
                "city_office",
                "state_office",
                "postal_code_office",
                "country_office"
            ];

            const propertyFields = {};
            const propertyAddress = {};
            const officeAddress = {};

            for (const [key, value] of Object.entries(payload)) {
                if (PROPERTY_ADDRESS_FIELDS.includes(key)) {
                    propertyAddress[key] = value;
                } else if (OFFICE_ADDRESS_FIELDS.includes(key)) {
                    officeAddress[key.replace("_office", "")] = value;
                } else {
                    propertyFields[key] = value;
                }
            }

            if (Object.keys(propertyFields).length) {
                const fields = [];
                const values = [];
                let idx = 1;

                for (const [key, value] of Object.entries(propertyFields)) {
                    fields.push(`${key} = $${idx++}`);
                    values.push(value);
                }

                fields.push(`updated_by = $${idx++}`);
                fields.push(`updated_on = now()`);
                values.push(userId);

                await client.query(
                    `
                UPDATE public.properties
                SET ${fields.join(", ")}
                WHERE id = $${idx}
                `,
                    [...values, id]
                );
            }

            if (Object.keys(propertyAddress).length) {
                await client.query(
                    `
                INSERT INTO public.addresses (
                    entity_type, entity_id, address_type,
                    address_line_1, address_line_2,
                    city, state, postal_code, country,
                    is_primary, created_by
                )
                VALUES (
                    'PROPERTY', $1, 'PROPERTY',
                    $2,$3,$4,$5,$6,$7,
                    true, $8
                )
                ON CONFLICT (entity_type, entity_id, address_type)
                WHERE is_primary = true
                DO UPDATE SET
                    address_line_1 = EXCLUDED.address_line_1,
                    address_line_2 = EXCLUDED.address_line_2,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    postal_code = EXCLUDED.postal_code,
                    country = EXCLUDED.country,
                    updated_by = $8,
                    updated_on = now()
                `,
                    [
                        id,
                        propertyAddress.address_line_1,
                        propertyAddress.address_line_2,
                        propertyAddress.city,
                        propertyAddress.state,
                        propertyAddress.postal_code,
                        propertyAddress.country,
                        userId
                    ]
                );
            }

            if (Object.keys(officeAddress).length && officeAddress.address_line_1) {
                await client.query(
                    `
                INSERT INTO public.addresses (
                    entity_type, entity_id, address_type,
                    address_line_1, address_line_2,
                    city, state, postal_code, country,
                    is_primary, created_by
                )
                VALUES (
                    'PROPERTY', $1, 'OFFICE',
                    $2,$3,$4,$5,$6,$7,
                    true, $8
                )
                ON CONFLICT (entity_type, entity_id, address_type)
                WHERE is_primary = true
                DO UPDATE SET
                    address_line_1 = EXCLUDED.address_line_1,
                    address_line_2 = EXCLUDED.address_line_2,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    postal_code = EXCLUDED.postal_code,
                    country = EXCLUDED.country,
                    updated_by = $8,
                    updated_on = now()
                `,
                    [
                        id,
                        officeAddress.address_line_1,
                        officeAddress.address_line_2,
                        officeAddress.city,
                        officeAddress.state,
                        officeAddress.postal_code,
                        officeAddress.country,
                        userId
                    ]
                );
            }

            await client.query("COMMIT");

            try {
                /* ---------- AUDIT ---------- */
                await AuditService.log({
                    property_id: id,
                    event_id: id,
                    table_name: "properties",
                    event_type: "UPDATE",
                    task_name: "Update Property",
                    comments: "Property updated",
                    details: JSON.stringify({
                        property_id: id,
                        updated_fields: Object.keys(payload),
                        user_id: userId
                    }),
                    user_id: userId
                });

            } catch (error) {

            }
            return { id };

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async getImage({ id }) {
        const { rows } = await this.#DB.query(
            `SELECT image, image_mime FROM public.properties WHERE id = $1`,
            [id]
        );
        return rows[0];
    }

    async getLogo({ id }) {
        const { rows } = await this.#DB.query(
            `SELECT logo, logo_mime FROM public.properties WHERE id = $1`,
            [id]
        );
        return rows[0];
    }

    async isOwnerOfProperty(propertyId, userId) {

        const { rowCount } = await this.#DB.query(`
            SELECT 1
            FROM public.property_users pu
            JOIN public.roles r ON r.id = pu.role_id
            WHERE pu.property_id = $1
            AND pu.user_id = $2
            AND LOWER(r.name) = 'owner'
        `, [propertyId, userId]);

        return rowCount === 1;
    }

    async isAdminOfProperty(propertyId, userId) {

        const { rowCount } = await this.#DB.query(`
            SELECT 1
            FROM public.property_users pu
            JOIN public.roles r ON r.id = pu.role_id
            WHERE pu.property_id = $1
            AND pu.user_id = $2
            AND LOWER(r.name) = 'admin'
        `, [propertyId, userId]);

        return rowCount === 1;
    }

    async canAccessProperty(propertyId, userId, userRoles) {
        const roleSet = new Set(userRoles);

        if (roleSet.has(roles.SUPER_ADMIN)) return true;

        const { rowCount } = await this.#DB.query(`
            SELECT 1
            FROM public.property_users pu
            WHERE pu.property_id = $1
            AND pu.user_id = $2
            LIMIT 1
        `, [propertyId, userId]);

        return rowCount === 1;
    }

    async getAllProperties() {
        const { rows } = await this.#DB.query(`
    SELECT id, brand_name
    FROM public.properties
    ORDER BY brand_name
  `);
        return rows;
    }

    async getPropertiesByOwner(userId) {
        const { rows } = await this.#DB.query(`
            SELECT p.id, p.brand_name
            FROM public.properties p
            JOIN public.property_users pu
                ON pu.property_id = p.id
            JOIN public.roles r
                ON r.id = pu.role_id
            WHERE pu.user_id = $1
            AND LOWER(r.name) = 'owner'
            ORDER BY p.brand_name
        `, [userId]);

        return rows;
    }

    async getPropertyByAdmin(userId) {
        const { rows } = await this.#DB.query(`
            SELECT p.id, p.brand_name
            FROM public.properties p
            JOIN public.property_users pu
                ON pu.property_id = p.id
            JOIN public.roles r
                ON r.id = pu.role_id
            WHERE pu.user_id = $1
            AND LOWER(r.name) = 'admin'
            LIMIT 1
        `, [userId]);

        return rows;
    }

    async getUserProperties(userId) {

        const { rows } = await this.#DB.query(`
            SELECT DISTINCT
                p.id::text AS id,
                p.brand_name
            FROM public.properties p
            JOIN public.property_users pu
                ON pu.property_id = p.id
            WHERE pu.user_id = $1
            ORDER BY p.brand_name
        `, [userId]);

        return rows;
    }

    async getPropertyTaxConfig(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
            room_tax_rate,
            gst
            FROM public.properties
            WHERE id = $1
            AND is_active = true
            LIMIT 1
            `,
            [Number(propertyId)]
        )

        if (!rows.length) {
            throw new Error("Property not found or inactive")
        }

        return {
            room_tax_rate: Number(rows[0].room_tax_rate),
            gst: Number(rows[0].gst),

        }
    }

    async getPropertyAddressById(userId) {
        const { rows } = await this.#DB.query(
            `
            SELECT DISTINCT
                p.id::text AS id,
                p.brand_name,

                a.address_line_1,
                a.address_line_2,
                a.city,
                a.state,
                a.postal_code,
                a.country

            FROM public.property_users pu

            INNER JOIN public.properties p
                ON p.id = pu.property_id

            LEFT JOIN public.addresses a
                ON a.entity_type = 'PROPERTY'
            AND a.entity_id = p.id
            AND a.address_type = 'PROPERTY'
            AND a.is_primary = true

            WHERE pu.user_id = $1

            ORDER BY p.brand_name
            LIMIT 1
            `,
            [userId]
        );

        return rows[0] || null;
    }

    async getRestaurantTables(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT restaurant_tables
            FROM public.properties
            WHERE id = $1
            AND is_active = true
            LIMIT 1
            `,
            [Number(propertyId)]
        );

        return {
            restaurant_tables: Number(rows[0].restaurant_tables || 0)
        };
    }

}

const property = new Property();
Object.freeze(property);

export default property;
