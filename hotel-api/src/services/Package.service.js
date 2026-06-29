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
        const client = await this.#DB.connect();
        try {
            await client.query("BEGIN");

            // -----------------------------
            // Allocate sequence
            // -----------------------------
            const seqResult = await client.query(`
                INSERT INTO public.property_counters (property_id, counter_name, next_value)
                VALUES ($1, 'PACKAGE', 1)
                ON CONFLICT (property_id, counter_name)
                DO UPDATE SET 
                    next_value = public.property_counters.next_value + 1,
                    updated_on = now()
                RETURNING next_value
            `, [propertyId]);
            
            const nextSeq = seqResult.rows[0].next_value;

            const { rows } = await client.query(
            `
            INSERT INTO public.packages (
                property_id,
                package_sequence,
                package_name,
                description,
                base_price,
                is_active,
                created_on,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
            RETURNING *
            `,
            [propertyId, nextSeq, packageName, description, basePrice, isActive, createdBy]
        );

        await AuditService.log({
            property_id: propertyId,
            event_id: rows[0].id,
            table_name: "packages",
            event_type: "Create",
            task_name: "Create Package",
            comments: "Package created",
            details: JSON.stringify({
                after: {
                    "Plan Name": packageName,
                    "Description": description || "No description",
                    "Base Price": `₹${Number(basePrice).toFixed(2)}`,
                    "Status": isActive ? "Active" : "Inactive"
                }
            }),
            user_id: createdBy
        });

        await client.query("COMMIT");
        return rows[0];
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
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

        if (rowCount > 0) {
            await this.#DB.query(`
                WITH max_seqs AS (
                    SELECT property_id, COALESCE(MAX(package_sequence), 0) as max_seq
                    FROM public.packages
                    WHERE property_id = $1
                    GROUP BY property_id
                ),
                numbered_packages AS (
                    SELECT id, property_id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
                    FROM public.packages
                    WHERE package_sequence IS NULL AND property_id = $1
                )
                UPDATE public.packages p
                SET package_sequence = COALESCE((SELECT max_seq FROM max_seqs), 0) + np.seq
                FROM numbered_packages np
                WHERE p.id = np.id;

                INSERT INTO public.property_counters (property_id, counter_name, next_value)
                SELECT property_id, 'PACKAGE', COALESCE(MAX(package_sequence), 0) + 1
                FROM public.packages
                WHERE property_id = $1
                GROUP BY property_id
                ON CONFLICT (property_id, counter_name) 
                DO UPDATE SET next_value = EXCLUDED.next_value, updated_on = CURRENT_TIMESTAMP;
            `, [propertyId]);
        }

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

        if (rowCount > 0) {
            await this.#DB.query(`
                WITH max_seqs AS (
                    SELECT property_id, COALESCE(MAX(package_sequence), 0) as max_seq
                    FROM public.packages
                    GROUP BY property_id
                ),
                numbered_packages AS (
                    SELECT id, property_id, ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY id ASC) as seq
                    FROM public.packages
                    WHERE package_sequence IS NULL
                )
                UPDATE public.packages p
                SET package_sequence = COALESCE(ms.max_seq, 0) + np.seq
                FROM numbered_packages np
                LEFT JOIN max_seqs ms ON ms.property_id = np.property_id
                WHERE p.id = np.id;

                INSERT INTO public.property_counters (property_id, counter_name, next_value)
                SELECT property_id, 'PACKAGE', COALESCE(MAX(package_sequence), 0) + 1
                FROM public.packages
                GROUP BY property_id
                ON CONFLICT (property_id, counter_name) 
                DO UPDATE SET next_value = EXCLUDED.next_value, updated_on = CURRENT_TIMESTAMP;
            `);
        }

        return {
            insertedCount: rowCount
        };
    }


    async getPackagesByProperty(propertyId, page = 1, limit = 10, search = "", status = "", type = "") {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        let whereClause = "WHERE property_id = $1";
        const values = [propertyId];
        let i = 2;

        if (status) {
            whereClause += ` AND is_active = $${i++}`;
            values.push(status === "true");
        }

        if (type) {
            whereClause += ` AND system_generated = $${i++}`;
            values.push(type === "system");
        }

        if (search) {
            const normalizedSearch = search.trim();
            const formattedIdMatch = normalizedSearch.match(/^PK0*(\d+)$/i);
            const isNumericIdSearch = /^\d+$/.test(normalizedSearch);

            if (formattedIdMatch || isNumericIdSearch) {
                const rawId = formattedIdMatch ? formattedIdMatch[1] : normalizedSearch;
                const packageId = Number(rawId);

                whereClause += ` AND (
                    id = $${i}
                    OR package_name ILIKE $${i + 1}
                    OR description ILIKE $${i + 1}
                )`;
                values.push(packageId, `%${normalizedSearch}%`);
                i += 2;
            } else {
                whereClause += ` AND (
                    package_name ILIKE $${i}
                    OR description ILIKE $${i}
                )`;
                values.push(`%${normalizedSearch}%`);
                i++;
            }
        }

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.packages
            ${whereClause}
        `;

        const dataQuery = `
            SELECT
                id,
                package_name,
                description,
                system_generated,
                base_price,
                is_active
            FROM public.packages
            ${whereClause}
            ORDER BY package_name
            LIMIT $${i++} OFFSET $${i++}
        `;

        const [{ rows: countRows }, { rows }] = await Promise.all([
            this.#DB.query(countQuery, values),
            this.#DB.query(dataQuery, [...values, safeLimit, offset])
        ]);

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

        const oldPkg = await this.getPackageById(id);
        if (!oldPkg) {
            throw new Error("Package not found");
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

        const before = {};
        const after = {};
        let hasChanges = false;

        if (packageName !== undefined && oldPkg.package_name !== packageName) {
            before["Plan Name"] = oldPkg.package_name;
            after["Plan Name"] = packageName;
            hasChanges = true;
        }
        if (description !== undefined && oldPkg.description !== description) {
            before["Description"] = oldPkg.description || "No description";
            after["Description"] = description || "No description";
            hasChanges = true;
        }
        if (basePrice !== undefined && Number(oldPkg.base_price) !== Number(basePrice)) {
            before["Base Price"] = `₹${Number(oldPkg.base_price).toFixed(2)}`;
            after["Base Price"] = `₹${Number(basePrice).toFixed(2)}`;
            hasChanges = true;
        }
        if (isActive !== undefined && Boolean(oldPkg.is_active) !== Boolean(isActive)) {
            before["Status"] = oldPkg.is_active ? "Active" : "Inactive";
            after["Status"] = isActive ? "Active" : "Inactive";
            hasChanges = true;
        }

        if (hasChanges) {
            await AuditService.log({
                property_id: rows[0].property_id,
                event_id: rows[0].id,
                table_name: "packages",
                event_type: "Update",
                task_name: "Update Package",
                comments: "Package updated",
                details: JSON.stringify({ before, after }),
                user_id: updatedBy
            });
        }

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

        const { rows: oldRows } = await this.#DB.query(
            `SELECT id, base_price, is_active FROM public.packages WHERE id = ANY($1::bigint[])`,
            [ids]
        );
        const oldRowsMap = new Map(oldRows.map(r => [Number(r.id), r]));

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

        for (const row of rows) {
            const oldRow = oldRowsMap.get(Number(row.id));
            if (!oldRow) continue;

            const requestedRate = packages.find(p => Number(p.id) === Number(row.id));

            const before = {};
            const after = {};
            let hasChanges = false;

            if (requestedRate && requestedRate.base_price !== undefined && Number(oldRow.base_price) !== Number(row.base_price)) {
                before["Base Price"] = `₹${Number(oldRow.base_price).toFixed(2)}`;
                after["Base Price"] = `₹${Number(row.base_price).toFixed(2)}`;
                hasChanges = true;
            }
            if (requestedRate && requestedRate.is_active !== undefined && Boolean(oldRow.is_active) !== Boolean(row.is_active)) {
                before["Status"] = oldRow.is_active ? "Active" : "Inactive";
                after["Status"] = row.is_active ? "Active" : "Inactive";
                hasChanges = true;
            }

            if (hasChanges) {
                await AuditService.log({
                    property_id: propertyId,
                    event_id: row.id,
                    table_name: "packages",
                    event_type: "Update",
                    task_name: "Update Package",
                    comments: "Package updated",
                    details: JSON.stringify({ before, after }),
                    user_id: userId
                });
            }
        }

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
