import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'
import sidebarLinkController from '../controllers/sidebar-link-controller.js'

const router = express.Router()
router.route("/")
    .post(supabaseAuth, requireRole(roles.ALL), sidebarLinkController.createLink.bind(sidebarLinkController))
    .get(supabaseAuth, requireRole(roles.ALL, roles.OWNER, roles.ADMIN), sidebarLinkController.getAllLinks.bind(sidebarLinkController))

router.route("/:id")
    .get(supabaseAuth, requireRole(roles.ALL), sidebarLinkController.getLinkById.bind(sidebarLinkController))
    .patch(supabaseAuth, requireRole(roles.ALL), sidebarLinkController.updateLink.bind(sidebarLinkController))
    .delete(supabaseAuth, requireRole(roles.ALL), sidebarLinkController.deleteLink.bind(sidebarLinkController))

export default router;
