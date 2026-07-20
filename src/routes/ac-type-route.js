import express from 'express'
import AcTypeController from '../controllers/ac-type-controller.js'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'

const router = express.Router()

router.route("/")
    .get(AcTypeController.getAll.bind(AcTypeController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), AcTypeController.create.bind(AcTypeController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.SUPER_ADMIN), AcTypeController.updateById.bind(AcTypeController))

export default router
