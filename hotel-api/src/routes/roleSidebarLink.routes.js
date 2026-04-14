import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import roleSidebarLink from '../controllers/RoleSidebarLink.controller.js'

const router = express.Router()

router.route("/")
    .post(supabaseAuth, requireRole(roles.ALL), roleSidebarLink.upsertPermission.bind(roleSidebarLink))
    .get(supabaseAuth, roleSidebarLink.getPermissionsByUserId.bind(roleSidebarLink))

router.route("/:id")
    .get(supabaseAuth, requireRole(roles.ALL), roleSidebarLink.getPermissionsByRole.bind(roleSidebarLink))
    .delete(supabaseAuth, requireRole(roles.ALL), roleSidebarLink.deletePermission.bind(roleSidebarLink))

export default router