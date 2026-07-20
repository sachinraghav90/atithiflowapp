import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'
import PropertyFloorController from '../controllers/property-floor-controller.js'

const router = express.Router()

router.route("/:id")
    .get(supabaseAuth, requireRole(roles.ALL), PropertyFloorController.getById.bind(PropertyFloorController))
    .post(supabaseAuth, requireRole(roles.ALL), PropertyFloorController.bulkUpsert.bind(PropertyFloorController))

export default router
