import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import RoomTypeRateController from '../controllers/RoomTypeRate.controller.js'

const router = express.Router()

router.route("/:propertyId")
    .get(RoomTypeRateController.getByProperty.bind(RoomTypeRateController))

router.route("/")
    .put(supabaseAuth, requireRole(roles.ALL), RoomTypeRateController.updatePricesBulk.bind(RoomTypeRateController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), RoomTypeRateController.generateRoomTypeRatesForAllProperties.bind(RoomTypeRateController))
    
export default router