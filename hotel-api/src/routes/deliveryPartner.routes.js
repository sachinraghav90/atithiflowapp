import express from "express";
import DeliveryPartnerController from "../controllers/DeliveryPartner.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";

const router = express.Router();

router.get("/", supabaseAuth, DeliveryPartnerController.getDeliveryPartners.bind(DeliveryPartnerController));

router.get("/light", supabaseAuth, DeliveryPartnerController.getDeliveryPartnersLight.bind(DeliveryPartnerController));

router.post("/", supabaseAuth, DeliveryPartnerController.createDeliveryPartner.bind(DeliveryPartnerController));

router.patch("/:id", supabaseAuth, DeliveryPartnerController.updateDeliveryPartner.bind(DeliveryPartnerController));

router.delete("/:id", supabaseAuth, DeliveryPartnerController.deleteDeliveryPartner.bind(DeliveryPartnerController));

export default router;
