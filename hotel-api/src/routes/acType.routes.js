import express from 'express'
import AcTypeController from '../controllers/AcType.controller.js'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'

const router = express.Router()

router.route("/")
    .get(AcTypeController.getAll.bind(AcTypeController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), AcTypeController.create.bind(AcTypeController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.SUPER_ADMIN), AcTypeController.updateById.bind(AcTypeController))

export default router