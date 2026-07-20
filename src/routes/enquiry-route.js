import express from 'express'
import { roles } from "../../utils/roles.js";
import EnquiryController from "../controllers/enquiry-controller.js";
import { requireRole } from "../middlewares/require-role.js";
import { supabaseAuth } from '../middlewares/supabase-auth.js';

const router = express.Router();

router.get("/", supabaseAuth, requireRole(roles.ALL), EnquiryController.getByPropertyId.bind(EnquiryController));
router.post("/", supabaseAuth, requireRole(roles.ALL), EnquiryController.create.bind(EnquiryController));
router.get("/kpis", supabaseAuth, requireRole(roles.ALL), EnquiryController.getKpis.bind(EnquiryController));
router.put("/:id", supabaseAuth, requireRole(roles.ALL), EnquiryController.update.bind(EnquiryController));

export default router
