import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import GuestsController from '../controllers/Guests.controller.js'

const router = express.Router()

router.get("/:guestId/id-proof", GuestsController.viewGuestIdProof.bind(GuestsController));

router.get("/:bookingId/primary", supabaseAuth, GuestsController.getPrimaryGuestByBookingId.bind(GuestsController));

export default router