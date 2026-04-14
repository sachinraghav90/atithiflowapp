import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class PackageService {

    #DB

    constructor() {
        this.#DB = getDb();
    }

    async createPackage({
        propertyId,
        packageName,
        description,
        basePrice = 0,
        createdBy,
        isActive = true
    }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.packages (
                property_id,
                package_name,
                description,
                base_price,
                is_active,
                created_on,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, now(), $6)
            RETURNING *
            `,
            [propertyId, packageName, description, basePrice, isActive, createdBy]
        );

        await AuditService.log({
            property_id: propertyId,
            event_id: rows[0].id,
            table_name: "packages",
            event_type: "CREATE",
            task_name: "Create Package",
            comments: "Package created",
            details: JSON.stringify({
                package_id: rows[0].id,
                package_name: packageName,
                base_price: basePrice,
                is_active: isActive
            }),
            user_id: createdBy
        });

        return rows[0];
    }

    async generatePackagesForProperty(propertyId, userId) {
        const { rows } = await this.#DB.query(`
        SELECT COUNT(*) AS count
        FROM ref_packages
    `);

        if (Number(rows[0].count) === 0) {
            return {
                insertedCount: 0,
                message: "No reference plans found"
            };
        }

        const { rowCount } = await this.#DB.query(
            `
        INSERT INTO public.packages (
            property_id,
            package_name,
            description,
            base_price,
            is_active,
            system_generated,
            created_by
        )
        SELECT
            $1 AS property_id,
            rp.package_name,
            rp.description,
            0 AS base_price,
            true AS is_active,
            true AS system_generated,
            $2 AS created_by
        FROM public.ref_packages rp
        ON CONFLICT (property_id, LOWER(package_name))
        DO NOTHING
        `,
            [propertyId, userId]
        );

        return {
            insertedCount: rowCount
        };
    }

    async generatePackagesForAllProperties(userId) {
        const { rows } = await this.#DB.query(`
        SELECT COUNT(*) AS count
        FROM ref_packages
    `);

        if (Number(rows[0].count) === 0) {
            return {
                insertedCount: 0,
                message: "No reference plans found"
            };
        }

        const { rowCount } = await this.#DB.query(
            `
        INSERT INTO public.packages (
            property_id,
            package_name,
            description,
            base_price,
            is_active,
            system_generated,
            created_by
        )
        SELECT
            p.id AS property_id,
            rp.package_name,
            rp.description,
            0 AS base_price,
            true AS is_active,
            true AS system_generated,
            $1 AS created_by
        FROM public.properties p
        CROSS JOIN public.ref_packages rp
        ON CONFLICT (property_id, LOWER(package_name))
        DO NOTHING
        `,
            [userId]
        );

        return {
            insertedCount: rowCount
        };
    }


    async getPackagesByProperty(propertyId, page = 1, limit = 10) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const [{ rows: countRows }, { rows }] = await Promise.all([
            this.#DB.query(
                `
                SELECT COUNT(*)::int AS total
                FROM public.packages
                WHERE property_id = $1
                `,
                [propertyId]
            ),
            this.#DB.query(
            `
            SELECT
                id,
                package_name,
                description,
                system_generated,
                base_price,
                is_active
            FROM public.packages
            WHERE property_id = $1
            --AND is_active = true
            ORDER BY package_name
            LIMIT $2 OFFSET $3
            `,
            [propertyId, safeLimit, offset]
        )]);

        const total = countRows[0]?.total ?? 0;

        return {
            message: "Success",
            packages: rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.max(1, Math.ceil(total / safeLimit)),
            },
        };
    }

    async getPackageById(id) {
        const { rows } = await this.#DB.query(
            `
            SELECT *
            FROM public.packages
            WHERE id = $1
            `,
            [id]
        );

        return rows[0];
    }

    async getPackagesByUser(userId) {
        console.log("🚀 ~ PackageService ~ getPackagesByUser ~ userId:", userId)
        const { rows } = await this.#DB.query(
            `
            SELECT
            p.id,
            p.package_name
            FROM public.packages p
            INNER JOIN public.users u
            ON u.property_id = p.property_id
            WHERE u.id = $1
            ORDER BY p.package_name
            `,
            [userId]
        )

        return rows
    }

    async updatePackage({
        id,
        packageName,
        description,
        basePrice,
        isActive,
        updatedBy,
    }) {
        if (!id) {
            throw new Error("Package id is required");
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (packageName !== undefined) {
            fields.push(`package_name = $${++idx}`);
            values.push(packageName);
        }

        if (description !== undefined) {
            fields.push(`description = $${++idx}`);
            values.push(description);
        }

        if (basePrice !== undefined) {
            fields.push(`base_price = $${++idx}`);
            values.push(basePrice);
        }

        if (isActive !== undefined) {
            fields.push(`is_active = $${++idx}`);
            values.push(isActive);
        }

        if (updatedBy) {
            fields.push(`updated_by = $${++idx}`);
            values.push(updatedBy);
        }

        if (fields.length === 0) {
            throw new Error("No fields provided to update");
        }

        const query = `
                        UPDATE public.packages
                        SET
                            ${fields.join(", ")},
                            updated_on = now()
                        WHERE id = $1
                        RETURNING *
                        `;

        const { rows } = await this.#DB.query(query, [id, ...values]);

        if (!rows.length) {
            throw new Error("Package not found");
        }

        await AuditService.log({
            property_id: rows[0].property_id,
            event_id: rows[0].id,
            table_name: "packages",
            event_type: "UPDATE",
            task_name: "Update Package",
            comments: "Package updated",
            details: JSON.stringify({
                package_id: rows[0].id,
                package_name: rows[0].package_name,
                base_price: rows[0].base_price,
                is_active: rows[0].is_active
            }),
            user_id: updatedBy
        });

        return rows[0];
    }

    async updatePackagesBulk({ propertyId, packages, userId }) {
        if (!Array.isArray(packages) || packages.length === 0) {
            return [];
        }

        const ids = [];
        const basePrices = [];
        const isActives = [];

        for (const p of packages) {
            if (!p.id) continue;

            ids.push(Number(p.id));
            basePrices.push(
                p.base_price !== undefined ? Number(p.base_price) : null
            );
            isActives.push(
                p.is_active !== undefined ? Boolean(p.is_active) : null
            );
        }

        if (!ids.length) return [];

        const { rows } = await this.#DB.query(
            `
            UPDATE public.packages p
            SET
                base_price = COALESCE(v.base_price, p.base_price),
                is_active  = COALESCE(v.is_active, p.is_active),
                updated_by = $2,
                updated_on = NOW()
            FROM (
                SELECT
                    unnest($1::bigint[])   AS id,
                    unnest($3::numeric[]) AS base_price,
                    unnest($4::boolean[]) AS is_active
            ) v
            WHERE p.id = v.id
            AND p.property_id = $5
            RETURNING
                p.id,
                p.property_id,
                p.package_name,
                p.base_price,
                p.is_active,
                p.updated_on
            `,
            [
                ids,        // $1
                userId,     // $2
                basePrices, // $3
                isActives,  // $4
                propertyId  // $5
            ]
        );

        return rows;
    }

    async deactivatePackage(id, userId) {
        const { rows, rowCount } = await this.#DB.query(
            `
        UPDATE public.packages
        SET
            is_active = false,
            updated_on = now(),
            updated_by = $2
        WHERE id = $1
        RETURNING id, property_id, package_name;
        `,
            [id, userId]
        );

        if (rowCount > 0) {
            await AuditService.log({
                property_id: rows[0].property_id,
                event_id: rows[0].id,
                table_name: "packages",
                event_type: "DEACTIVATE",
                task_name: "Deactivate Package",
                comments: "Package deactivated",
                details: JSON.stringify({
                    package_id: rows[0].id,
                    package_name: rows[0].package_name
                }),
                user_id: userId
            });

            return rows[0];
        }

        return null;
    }

}

export default Object.freeze(new PackageService);
