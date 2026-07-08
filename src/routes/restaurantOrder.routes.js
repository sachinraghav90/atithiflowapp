import express from "express";
import RestaurantOrderController from "../controllers/RestaurantOrder.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";

const router = express.Router();

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.getByProperty.bind(RestaurantOrderController));
router.get("/booking/:bookingId", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.getByBooking.bind(RestaurantOrderController));
router.post("/", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.create.bind(RestaurantOrderController));
router.get("/:id", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.getById.bind(RestaurantOrderController));
router.patch("/:id/status", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.updateStatus.bind(RestaurantOrderController));
router.patch("/:id/payment", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.updatePayment.bind(RestaurantOrderController));
router.delete("/:id", supabaseAuth, requireRole(roles.ALL), RestaurantOrderController.delete.bind(RestaurantOrderController));

export default router;
