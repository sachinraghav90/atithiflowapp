import { roles } from "../../utils/roles.js";
import role from "../services/Role.service.js";

export function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        const userId = req.user.user_id
        const userRoles = await role.getUserRoleNamesByUserId({ userId })
        if (!userRoles || !Array.isArray(userRoles)) {
            return res.status(403).json({ error: "Roles not loaded" });
        }

        req.roles = userRoles

        const hasAccess = allowedRoles.includes(roles.ALL) || allowedRoles.some(role =>
            userRoles.includes(role)
        );

        if (!hasAccess) {
            return res.status(403).json({
                error: "You are not authorized to access this entity",
            });
        }

        next();
    };
}
