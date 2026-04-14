import role from "../services/Role.service.js";

class Role {
    async createRole(req, res) {
        try {
            const { roleName } = req.body;
            const roleId = await role.createRole({ roleName })
            return res.status(201).json({
                message: "Role created successfully",
                roleId
            })
        } catch (error) {
            console.log("🚀 ~ Role ~ createRole ~ error:", error)
            res.status(500).json({ error: "Failed to create user" });
        }
    }

    async getAllRoles(_, res) {
        try {
            const roles = await role.getAllRoles()
            return res.json({
                message: "Data fetched successfully",
                roles: roles
            })
        } catch (error) {
            console.log("🚀 ~ Role ~ getAllRoles ~ error:", error)
            res.status(500).json({ error: "Failed to fetch roles" })
        }
    }

    async updateRole(req, res) {
        try {
            const id = req.params.id
            const { roleName } = req.body
            await role.update({ id, roleName })
            return res.json({ message: "Role updated successfully" })
        } catch (error) {
            console.log("🚀 ~ Role ~ updateRole ~ error:", error)
            res.status(500).json({ error: "Failed to update role" })
        }
    }

    async deleteRole(req, res) {
        try {
            const id = req.params.id
            await role.delete({ id })
            return res.json({ message: "Role deleted successfully" })
        } catch (error) {
            console.log("🚀 ~ Role ~ deleteRole ~ error:", error)
            return res.status(500).json({ message: "Failed to delete role" })
        }
    }

    async createUserRole(req, res) {
        try {
            const { userId, roleId } = req.body
            await role.createUserRole({ userId, roleId })
            return res.status(201).json({ message: "User role created successfully" })
        } catch (error) {
            console.log("🚀 ~ Role ~ createUserRole ~ error:", error)
            return res.status(500).json({ message: "Failed to create user role" })
        }
    }
}

const roleController = new Role()
Object.freeze(roleController)

export default roleController