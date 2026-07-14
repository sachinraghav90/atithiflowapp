import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'
import RoomTypeRateController from '../controllers/room-type-rate-controller.js'

const router = express.Router()

router.route("/:propertyId")
    .get(RoomTypeRateController.getByProperty.bind(RoomTypeRateController))

router.route("/")
    .put(supabaseAuth, requireRole(roles.ALL), RoomTypeRateController.updatePricesBulk.bind(RoomTypeRateController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), RoomTypeRateController.generateRoomTypeRatesForAllProperties.bind(RoomTypeRateController))
    
export default router
