import { getDb } from "../../utils/getDb.js";
import cache from "../cache/lruCache.js";

class Role {

    #DB;
    #CACHE_KEY_PREFIX;

    constructor() {
        this.#DB = getDb()
        this.#CACHE_KEY_PREFIX = "USER_ROLES:"
    }

    /* ===================================================== */
    /* CREATE USER ROLE (NEW SOURCE = property_users)        */
    /* ===================================================== */

    async createUserRole({ client = null, userId, roleId, propertyId }) {

        const db = client ?? this.#DB

        await db.query(
            `
            INSERT INTO public.property_users (
                property_id,
                user_id,
                role_id
            )
            VALUES ($1,$2,$3)
            ON CONFLICT DO NOTHING
            `,
            [propertyId, userId, roleId]
        );

        // invalidate cache
        cache.delete(`${this.#CACHE_KEY_PREFIX}${userId}`)

        return true
    }


    /* ===================================================== */
    /* CREATE ROLE                                           */
    /* ===================================================== */

    async createRole({ roleName }) {

        const { rows } = await this.#DB.query(
            `
            INSERT INTO public.roles (name)
            VALUES ($1)
            ON CONFLICT (name) DO NOTHING
            RETURNING id
            `,
            [roleName]
        );

        if (rows.length > 0) return rows[0].id

        const result = await this.#DB.query(
            `SELECT id FROM public.roles WHERE name = $1`,
            [roleName]
        );

        return result.rows[0].id;
    }


    /* ===================================================== */
    /* GET USER ROLES (PROPERTY AGNOSTIC)                    */
    /* ===================================================== */

    async getUserRoles({ userId }) {

        const { rows } = await this.#DB.query(
            `
            SELECT DISTINCT r.id, r.name
            FROM public.property_users pu
            JOIN public.roles r ON r.id = pu.role_id
            WHERE pu.user_id = $1
            `,
            [userId]
        );

        return rows;
    }


    /* ===================================================== */
    /* GET ROLE NAMES (WITH CACHE)                           */
    /* ===================================================== */

    async getUserRoleNamesByUserId({ userId }) {

        const cacheKey = `${this.#CACHE_KEY_PREFIX}${userId}`

        const cached = cache.get(cacheKey)
        if (cached) return cached

        const { rows } = await this.#DB.query(
            `
            SELECT COALESCE(
                array_agg(DISTINCT r.name ORDER BY r.name),
                '{}'
            ) AS roles
            FROM public.property_users pu
            JOIN public.roles r ON r.id = pu.role_id
            WHERE pu.user_id = $1
            `,
            [userId]
        );

        const roles = rows[0].roles

        cache.set(cacheKey, roles)

        return roles
    }


    /* ===================================================== */
    /* GET ALL ROLES                                         */
    /* ===================================================== */

    async getAllRoles() {

        const { rows } = await this.#DB.query(
            `
            SELECT id, name
            FROM public.roles
            ORDER BY name
            `
        );

        return rows;
    }


    /* ===================================================== */
    /* UPDATE ROLE                                           */
    /* ===================================================== */

    async update({ id, roleName }) {

        const { rows } = await this.#DB.query(
            `
            UPDATE public.roles
            SET name = $1, updated_on = now()
            WHERE id = $2
            RETURNING name
            `,
            [roleName, id]
        );

        return rows[0] ?? null;
    }


    /* ===================================================== */
    /* DELETE ROLE                                           */
    /* ===================================================== */

    async delete({ id }) {

        await this.#DB.query(
            `DELETE FROM public.roles WHERE id = $1`,
            [id]
        );

        return true;
    }
}

const role = new Role();
Object.freeze(role);

export default role;
