import { roles } from "../../utils/roles.js";
import propertyService from "../services/Property.service.js";
import role from "../services/Role.service.js";
import supabase from "../services/Supabase.service.js";
import userService from "../services/user.service.js";

class User {
    async createUser(req, res) {

        const { email, password, role_ids, property_id, is_active } = req.body;

        try {
            const requestUserId = req.user.user_id
            const { data, error } = await supabase.createUser({ email, password })

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            const authUserId = data.user.id;

            const user = await userService.createUser({ authUserId, email, propertyId: property_id, created_by: requestUserId, is_active })
            const userId = user.id

            for (const roleId of role_ids) {
                await role.createUserRole({ userId, roleId })
            }

            res.status(201).json({
                message: "User created successfully",
                user_id: userId
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to create user" });
        }
    }

    async getMe(req, res) {
        try {
            const userId = req.user.user_id
            const user = await userService.getMe(userId)
            return res.json({ message: "Success", user })
        } catch (error) {
            console.log("🚀 ~ User ~ getMe ~ error:", error)
            return res.status(500).json({ message: "Something went wrong" })
        }
    }

    async getUsersByRole(req, res) {
        try {
            const id = req.params.id
            const users = await userService.getUsersByRole(id)
            return res.json({ message: "Success", users })
        } catch (error) {
            console.log("🚀 ~ User ~ getUsersByRoleId ~ error:", error)
            return res.status(500).json({ message: "Error fetching users" })
        }
    }

    async getUsersByPropertyAndRoles(req, res) {
        try {
            const userId = req.user.user_id;
            const { propertyId, roles: rolesForFilter = [] } = req.body;

            if (!propertyId || isNaN(+propertyId)) {
                return res.status(400).json({ error: "Invalid property id" });
            }

            const roleSet = new Set(req.roles);

            if (roleSet.has(roles.SUPER_ADMIN)) {
                const users = await userService.getUsersByPropertyAndRoles({
                    propertyId,
                    isOwner: true,
                    roles: rolesForFilter,
                });

                return res.json({ message: "Success", users });
            }

            if (roleSet.has(roles.OWNER)) {
                const ownsProperty = await propertyService.isOwnerOfProperty(
                    propertyId,
                    userId
                );

                if (!ownsProperty) {
                    return res.status(403).json({
                        error: "You are not authorized to access this entity",
                    });
                }

                const users = await userService.getUsersByPropertyAndRoles({
                    propertyId,
                    isOwner: true,
                    roles: rolesForFilter,
                });

                return res.json({ message: "Success", users });
            }

            if (roleSet.has(roles.ADMIN)) {
                const canAccess = await propertyService.isAdminOfProperty(
                    propertyId,
                    userId
                );

                if (!canAccess) {
                    return res.status(403).json({
                        error: "You are not authorized to access this entity",
                    });
                }

                const users = await userService.getUsersByPropertyAndRoles({
                    propertyId,
                    isOwner: false,
                    roles: rolesForFilter,
                });

                return res.json({ message: "Success", users });
            }

            return res.status(403).json({
                error: "You are not authorized to access this entity",
            });

        } catch (error) {
            console.error(
                "🚀 UserController.getUsersByPropertyAndRoles error:",
                error
            );
            return res.status(500).json({
                message: "Error fetching users",
            });
            return res.status(500).json({
                message: "Error fetching users",
            });
        }
    }

    async getUsersByPropertyAndRole(req, res) {
        try {
            const propertyId = req.params.propertyId
            const role = req.query.role
            if (!role) {
                return res.json({ message: "SUCCESS", users: [] })
            }
            const users = await userService.getUsersByPropertyAndRole({ property_id: propertyId, role })
            return res.json({ message: "SUCCESS", users })
        } catch (error) {
            console.log("🚀 ~ User ~ getUsersByPropertyAndRole ~ error:", error)
            return res.status(500).json({ message: "Error fetching users", });
        }
    }

}

const user = new User();
Object.freeze(user);

export default user;