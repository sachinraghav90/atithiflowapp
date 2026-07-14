import { Router } from "express";
import InvoiceController from "../controllers/invoice-controller.js";
import { supabaseAuth } from "../middlewares/supabase-auth.js";

const router = Router();

router.post("/booking/:bookingId/generate", supabaseAuth, InvoiceController.generate.bind(InvoiceController));
router.get("/booking/:bookingId/download", supabaseAuth, InvoiceController.download.bind(InvoiceController));
router.get("/booking/:bookingId", supabaseAuth, InvoiceController.getByBooking.bind(InvoiceController));

export default router;

