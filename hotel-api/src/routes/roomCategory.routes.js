import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import RoomCategoryController from '../controllers/RoomCategory.controller.js'

const router = express.Router()

router.route("/")
    .get(RoomCategoryController.getAll.bind(RoomCategoryController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), RoomCategoryController.create.bind(RoomCategoryController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.SUPER_ADMIN), RoomCategoryController.updateById.bind(RoomCategoryController))

export default router