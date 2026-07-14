import { getDb } from "../../utils/getDb.js"
import SidebarLinkService from "../services/sidebar-link-service.js"

class SidebarLink {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async createLink(req, res) {
        try {
            const payload = req.body
            const userId = req.user.user_id
            const { id } = await SidebarLinkService.create({ payload, userId })
            return res.status(201).json({ message: "Link created successfully", id })
        } catch (error) {
            console.log("🚀 ~ SidebarLink ~ createLink ~ error:", error)
            return res.status(500).json({ message: "Failed creating link" })
        }
    }

    async getAllLinks(_, res) {
        try {
            const roles = await SidebarLinkService.getAll()
            return res.json({ message: "Success", roles })
        } catch (error) {
            console.log("🚀 ~ SidebarLink ~ getAllLinks ~ error:", error)
            return res.status(500).json({ message: "Error fetching roles" })
        }
    }

    async getLinkById(req, res) {
        try {
            const id = req.params.id
            const role = await SidebarLinkService.getById({ id })
            return res.json({ message: "Success", role })
        } catch (error) {
            console.log("🚀 ~ SidebarLink ~ getRoleById ~ error:", error)
            return res.status(500).json({ message: "Error fetching role" })
        }
    }

    async updateLink(req, res) {
        try {
            const id = req.params.id
            const payload = req.body
            const userId = req.user.user_id
            await SidebarLinkService.update({ id, payload, userId })
            return res.json({ message: "success" })
        } catch (error) {
            console.log("🚀 ~ SidebarLink ~ updateLink ~ error:", error)
            return res.status(500).json({ message: "Error updating sidebar links" })
        }
    }

    async deleteLink(req, res) {
        try {
            const id = req.params.id
            await SidebarLinkService.delete({ id })
            return res.json({ message: "Success" })
        } catch (error) {
            console.log("🚀 ~ SidebarLink ~ deleteLink ~ error:", error)
            return res.status(500).json({ message: "Error deleting link" })
        }
    }
}

const sidebarLink = new SidebarLink()
Object.freeze(sidebarLink)
export default sidebarLink
