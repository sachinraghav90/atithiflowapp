import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import BookingController from '../controllers/Booking.controller.js'
import GuestsController from '../controllers/Guests.controller.js'
import { upload } from '../middlewares/upload.js'
import VehicleController from '../controllers/Vehicle.controller.js'

const router = express.Router()

router.route("/")
    .get(supabaseAuth, requireRole(roles.ALL), BookingController.getBookings.bind(BookingController))
    .post(supabaseAuth, requireRole(roles.ALL), BookingController.createBooking.bind(BookingController))

router.route("/export")
    .get(supabaseAuth, requireRole(roles.ALL), BookingController.exportBookings.bind(BookingController))

router.route("/:id")
    .get(supabaseAuth, requireRole(roles.ALL), BookingController.getBookingById.bind(BookingController))

router.route("/:id/today-in-house-bookings")
    .get(supabaseAuth, requireRole(roles.ALL), BookingController.getTodayInHouseBookingIdsByProperty.bind(BookingController))

router.route("/:id/today-in-house-rooms")
    .get(supabaseAuth, requireRole(roles.ALL), BookingController.getTodayInHouseRoomsByProperty.bind(BookingController))

router.route("/:id/cancel")
    .patch(supabaseAuth, requireRole(roles.ALL), BookingController.cancelBooking.bind(BookingController))

router.route("/:id/status")
    .patch(supabaseAuth, requireRole(roles.ALL), BookingController.updateBookingStatus.bind(BookingController))

router.route("/:id/guests")
    .get(supabaseAuth, requireRole(roles.ALL), GuestsController.getGuestsByBooking.bind(GuestsController))
    .post(supabaseAuth, requireRole(roles.ALL), upload.array("id_proofs"), GuestsController.upsertGuestsByBooking.bind(GuestsController))
    .put(supabaseAuth, requireRole(roles.ALL), upload.array("id_proofs"), GuestsController.updateGuests.bind(GuestsController))

router.route("/:id/vehicles")
    .post(supabaseAuth, requireRole(roles.ALL), VehicleController.upsertVehicles.bind(VehicleController))
    .get(supabaseAuth, requireRole(roles.ALL), VehicleController.getByBooking.bind(VehicleController))

export default router