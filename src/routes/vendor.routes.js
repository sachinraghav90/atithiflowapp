import express from "express";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";
import VendorController from "../controllers/Vendor.controller.js";

const router = express.Router();

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), VendorController.getByPropertyId.bind(VendorController));

router.get("/all/property/:propertyId", supabaseAuth, requireRole(roles.ALL), VendorController.getAllByPropertyId.bind(VendorController));

router.post("/", supabaseAuth, requireRole(roles.ALL), VendorController.create.bind(VendorController));

router.put("/:id", supabaseAuth, requireRole(roles.ALL), VendorController.update.bind(VendorController));

export default router;
