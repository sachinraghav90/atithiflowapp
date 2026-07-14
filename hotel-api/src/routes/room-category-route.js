import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'
import RoomCategoryController from '../controllers/room-category-controller.js'

const router = express.Router()

router.route("/")
    .get(RoomCategoryController.getAll.bind(RoomCategoryController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), RoomCategoryController.create.bind(RoomCategoryController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.SUPER_ADMIN), RoomCategoryController.updateById.bind(RoomCategoryController))

export default router
