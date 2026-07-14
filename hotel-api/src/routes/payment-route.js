import express from 'express'
import PaymentController from '../controllers/payment-controller.js';
import { supabaseAuth } from '../middlewares/supabase-auth.js';
import { requireRole } from '../middlewares/require-role.js';
import { roles } from '../../utils/roles.js';

const router = express.Router()

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), PaymentController.getByProperty.bind(PaymentController));
router.get("/booking/:bookingId", supabaseAuth, requireRole(roles.ALL), PaymentController.getByBooking.bind(PaymentController));
router.post("/", supabaseAuth, requireRole(roles.ALL), PaymentController.create.bind(PaymentController));
router.put("/:id", supabaseAuth, requireRole(roles.ALL), PaymentController.update.bind(PaymentController));
router.get("/:id", supabaseAuth, requireRole(roles.ALL), PaymentController.getById.bind(PaymentController));

export default router
