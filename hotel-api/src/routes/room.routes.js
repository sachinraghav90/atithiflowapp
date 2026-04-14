import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import RoomController from '../controllers/Room.controller.js'

const router = express.Router()

router.route("/")
    .get(supabaseAuth, requireRole(roles.ALL), RoomController.getRoomsByProperty.bind(RoomController))
    .post(supabaseAuth, requireRole(roles.ALL), RoomController.bulkCreateRooms.bind(RoomController))
    .patch(supabaseAuth, requireRole(roles.ALL), RoomController.bulkUpdateRooms.bind(RoomController))

router.route("/single-room")
    .post(supabaseAuth, requireRole(roles.ALL), RoomController.addRoom.bind(RoomController))

router.route("/available")
    .get(supabaseAuth, requireRole(roles.ALL), RoomController.getAvailableRooms.bind(RoomController))

router.route("/check-availability")
    .get(supabaseAuth, requireRole(roles.ALL), RoomController.checkRoomAvailability.bind(RoomController))

router.get("/room-types", RoomController.getAllRoomTypes.bind(RoomController))

router.get("/meta/:propertyId", supabaseAuth, RoomController.getAllRoomsMeta.bind(RoomController))

router.get("/status/property/:propertyId", supabaseAuth, requireRole(roles.ALL), RoomController.getDailyRoomStatus.bind(RoomController))

router.get("/booking/:bookingId", supabaseAuth, requireRole(roles.ALL), RoomController.getRoomsByBooking.bind(RoomController))

router.patch("/booking/:bookingId/cancel", supabaseAuth, requireRole(roles.ALL), RoomController.cancelBookingRoom.bind(RoomController))

export default router