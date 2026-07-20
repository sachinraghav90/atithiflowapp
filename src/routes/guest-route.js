import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'
import GuestsController from '../controllers/guests-controller.js'

const router = express.Router()

router.get("/by-phone", supabaseAuth, GuestsController.getGuestByPhone.bind(GuestsController));
router.get("/:guestId/id-proof", GuestsController.viewGuestIdProof.bind(GuestsController));

router.get("/:bookingId/primary", supabaseAuth, GuestsController.getPrimaryGuestByBookingId.bind(GuestsController));

export default router
