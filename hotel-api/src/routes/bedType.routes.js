import express from 'express'
import BedTypeController from '../controllers/BedType.controller.js'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'

const router = express.Router()

router.route("/")
    .get(BedTypeController.getAll.bind(BedTypeController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), BedTypeController.create.bind(BedTypeController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.SUPER_ADMIN), BedTypeController.updateById.bind(BedTypeController))

export default router