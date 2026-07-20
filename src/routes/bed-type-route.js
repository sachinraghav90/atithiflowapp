import express from 'express'
import BedTypeController from '../controllers/bed-type-controller.js'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'

const router = express.Router()

router.route("/")
    .get(BedTypeController.getAll.bind(BedTypeController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), BedTypeController.create.bind(BedTypeController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.SUPER_ADMIN), BedTypeController.updateById.bind(BedTypeController))

export default router
