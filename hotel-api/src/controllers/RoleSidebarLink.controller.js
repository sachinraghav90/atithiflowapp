import role from "../services/Role.service.js"
import RoleSidebarLinkService from "../services/RoleSidebarLink.service.js"

class RoleSidebarLink {
    async upsertPermission(req, res) {
        try {
            await RoleSidebarLinkService.upsertPermission(req.body)
            return res.status(201).json({ message: "Success" })
        } catch (error) {
            console.log("🚀 ~ RoleSidebarLink ~ upsertPermission ~ error:", error)
            return res.status(500).json({ message: "Failed upsetting permission" })
        }
    }

    async getPermissionsByRole(req, res) {
        const role_id = req.params.id
        try {
            const permission = await RoleSidebarLinkService.getPermissionsByRole({ role_id })
            return res.json({ message: "Success", permission })
        } catch (error) {
            console.log("🚀 ~ RoleSidebarLink ~ getPermissionByRole ~ error:", error)
            return res.status(500).json({ message: "Error in fetching role" })
        }
    }

    async getPermissionsByUserId(req, res) {
        try {
            const userId = req.user.user_id
            const sidebarLinks = await RoleSidebarLinkService.getSidebarByUserId({ userId })
            return res.json({ message: "success", sidebarLinks })
        } catch (error) {
            console.log("🚀 ~ RoleSidebarLink ~ getPermissionsById ~ error:", error)
            return res.status(500).json({ message: "Error getting permissions" })
        }
    }

    async deletePermission(req, res) {
        const role_id = req.params.id
        const sidebar_link_id = req.body.id
        try {
            await RoleSidebarLinkService.deletePermission({ role_id, sidebar_link_id })
            return res.json({ message: "Success" })
        } catch (error) {
            console.log("🚀 ~ RoleSidebarLink ~ deletePermission ~ error:", error)
            return res.status(500).json({ message: "Error deleting permission" })
        }
    }
}

const roleSidebarLink = new RoleSidebarLink()
Object.freeze(roleSidebarLink)

export default roleSidebarLink