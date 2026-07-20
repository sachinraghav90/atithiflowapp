import express from "express";
import { supabaseAuth } from "../middlewares/supabase-auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { roles } from "../../utils/roles.js";
import VendorController from "../controllers/vendor-controller.js";

const router = express.Router();

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), VendorController.getByPropertyId.bind(VendorController));

router.get("/all/property/:propertyId", supabaseAuth, requireRole(roles.ALL), VendorController.getAllByPropertyId.bind(VendorController));

router.post("/", supabaseAuth, requireRole(roles.ALL), VendorController.create.bind(VendorController));

router.put("/:id", supabaseAuth, requireRole(roles.ALL), VendorController.update.bind(VendorController));

export default router;

