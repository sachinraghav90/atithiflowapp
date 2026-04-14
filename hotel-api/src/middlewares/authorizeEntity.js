import { getDb } from "../../utils/getDb.js";

const db = getDb();

/**
 * Generic entity authorization middleware
 *
 * @param {Object} options
 * @param {string} options.entityTable - table name (e.g. 'properties')
 * @param {string} options.entityIdParam - req param name (e.g. 'id')
 * @param {string[]} options.allowedRoles - roles that can access
 * @param {string} options.ownerColumn - column that links user to entity
 * @param {'read'|'write'} options.action
 */
export function authorizeEntity({
  entityTable,
  entityIdParam = "id",
  allowedRoles = [],
  ownerColumn,
  action = "read"
}) {
  return async function (req, res, next) {
    try {
      const userId = req.user?.user_id;
      const roles = req.user?.roles || [];
      const entityId = req.params[entityIdParam];

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!entityId) {
        return res.status(400).json({ error: "Missing entity id" });
      }

      if (roles.includes("SUPER_ADMIN")) {
        return next();
      }

      if (allowedRoles.length && !roles.some(r => allowedRoles.includes(r))) {
        return res.status(403).json({ error: "Forbidden (role)" });
      }

      const { rows } = await db.query(
        `
          SELECT 1
          FROM ${entityTable}
          WHERE id = $1
          AND ${ownerColumn} = $2
        `,
        [entityId, userId]
      );

      if (!rows.length) {
        return res.status(403).json({
          error: `Forbidden (${action} access denied)`
        });
      }

      next();
    } catch (err) {
      console.error("authorizeEntity error:", err);
      return res.status(500).json({ error: "Authorization failed" });
    }
  };
}
