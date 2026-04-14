import express from 'express'
import { roles } from "../../utils/roles.js";
import EnquiryController from "../controllers/Enquiry.controller.js";
import { requireRole } from "../middlewares/requireRole.js";
import { supabaseAuth } from '../middlewares/supabaseAuth.js';

const router = express.Router();

router.get("/", supabaseAuth, requireRole(roles.ALL), EnquiryController.getByPropertyId.bind(EnquiryController));
router.post("/", supabaseAuth, requireRole(roles.ALL), EnquiryController.create.bind(EnquiryController));
router.put("/:id", supabaseAuth, requireRole(roles.ALL), EnquiryController.update.bind(EnquiryController));

export default router