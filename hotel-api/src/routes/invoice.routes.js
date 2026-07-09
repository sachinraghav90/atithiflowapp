import { Router } from "express";
import InvoiceController from "../controllers/Invoice.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";

const router = Router();

router.post("/booking/:bookingId/generate", supabaseAuth, InvoiceController.generate.bind(InvoiceController));
router.get("/booking/:bookingId/download", supabaseAuth, InvoiceController.download.bind(InvoiceController));
router.get("/booking/:bookingId", supabaseAuth, InvoiceController.getByBooking.bind(InvoiceController));

export default router;
