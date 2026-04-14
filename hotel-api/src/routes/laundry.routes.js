import express from "express";
import LaundryController from "../controllers/Laundry.controller.js";
import LaundryOrderController from "../controllers/LaundryOrder.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";

const router = express.Router();

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), LaundryController.getByProperty.bind(LaundryController));
// router.post("/", supabaseAuth, requireRole(roles.ALL), LaundryController.create.bind(LaundryController));
router.post("/", supabaseAuth, requireRole(roles.ALL), LaundryController.bulkCreate.bind(LaundryController));
router.put("/", supabaseAuth, requireRole(roles.ALL), LaundryController.bulkUpdate.bind(LaundryController));

// router.post("/orders", supabaseAuth, requireRole(roles.ALL), LaundryOrderController.create.bind(LaundryOrderController));
// router.get("/orders/property/:propertyId", supabaseAuth, requireRole(roles.ALL), LaundryOrderController.getByProperty.bind(LaundryOrderController));
// router.get("/orders/booking/:bookingId", supabaseAuth, requireRole(roles.ALL), LaundryOrderController.getByBooking.bind(LaundryOrderController));
// router.put("/orders/:id", supabaseAuth, requireRole(roles.ALL), LaundryOrderController.update.bind(LaundryOrderController));

router.post("/orders", supabaseAuth, LaundryOrderController.create);

router.get(
    "/orders/property/:property_id",
    supabaseAuth,
    LaundryOrderController.getByProperty
);

router.get(
    "/orders/booking/:booking_id",
    supabaseAuth,
    LaundryOrderController.getByBooking
);

router.put("/orders/:id", supabaseAuth, LaundryOrderController.update);

export default router;
