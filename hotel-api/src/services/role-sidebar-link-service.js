import { getDb } from "../../utils/getDb.js";

class RoleSidebarLinkService {
  #DB;

  constructor() {
    this.#DB = getDb();
  }

  async upsertPermission({
    role_id,
    sidebar_link_id,
    can_read = false,
    can_create = false,
    can_update = false,
    can_delete = false
  }) {
    const { rows } = await this.#DB.query(
      `
        INSERT INTO public.role_sidebar_links (
          role_id,
          sidebar_link_id,
          can_read,
          can_create,
          can_update,
          can_delete
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (role_id, sidebar_link_id)
        DO UPDATE SET
          can_read = EXCLUDED.can_read,
          can_create = EXCLUDED.can_create,
          can_update = EXCLUDED.can_update,
          can_delete = EXCLUDED.can_delete
        RETURNING *
      `,
      [
        role_id,
        sidebar_link_id,
        can_read,
        can_create,
        can_update,
        can_delete
      ]
    );

    return rows[0];
  }

  async getPermissionsByRole({ role_id }) {
    const { rows } = await this.#DB.query(
      `
        SELECT
          sl.id as sidebar_link_id,
          sl.link_name,
          sl.endpoint,
          rsl.can_read,
          rsl.can_create,
          rsl.can_update,
          rsl.can_delete
        FROM public.role_sidebar_links rsl
        JOIN public.sidebar_links sl
          ON sl.id = rsl.sidebar_link_id
        WHERE rsl.role_id = $1
        ORDER BY sl.sort_order
      `,
      [role_id]
    );

    return rows;
  }

  async getSidebarByUserId({ userId }) {

    const { rows } = await this.#DB.query(
      `
        SELECT
            sl.id AS sidebar_link_id,
            sl.link_name,
            sl.endpoint,
            sl.parent_id,
            sl.sort_order,

            BOOL_OR(rsl.can_read)   AS can_read,
            BOOL_OR(rsl.can_create) AS can_create,
            BOOL_OR(rsl.can_update) AS can_update,
            BOOL_OR(rsl.can_delete) AS can_delete

        FROM public.property_users pu

        JOIN public.role_sidebar_links rsl
            ON rsl.role_id = pu.role_id

        JOIN public.sidebar_links sl
            ON sl.id = rsl.sidebar_link_id

        WHERE pu.user_id = $1
        AND sl.is_active = true

        GROUP BY
            sl.id,
            sl.link_name,
            sl.endpoint,
            sl.parent_id,
            sl.sort_order

        HAVING
            BOOL_OR(rsl.can_read)
            OR BOOL_OR(rsl.can_create)
            OR BOOL_OR(rsl.can_update)
            OR BOOL_OR(rsl.can_delete)

        ORDER BY sl.sort_order
        `,
      [userId]
    );

    return rows;
  }

  async deletePermission({ role_id, sidebar_link_id }) {
    await this.#DB.query(
      `
        DELETE FROM public.role_sidebar_links
        WHERE role_id = $1 AND sidebar_link_id = $2
      `,
      [role_id, sidebar_link_id]
    );
    return true;
  }
}

export default Object.freeze(new RoleSidebarLinkService());
