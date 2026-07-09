import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import PropertyFloorController from '../controllers/PropertyFloor.controller.js'

const router = express.Router()

router.route("/:id")
    .get(supabaseAuth, requireRole(roles.ALL), PropertyFloorController.getById.bind(PropertyFloorController))
    .post(supabaseAuth, requireRole(roles.ALL), PropertyFloorController.bulkUpsert.bind(PropertyFloorController))

export default router