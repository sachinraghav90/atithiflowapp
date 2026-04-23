import express from 'express'
import KitchenInventoryController from '../controllers/KitchenInventory.controller.js';
import { supabaseAuth } from '../middlewares/supabaseAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { roles } from '../../utils/roles.js';

const router = express.Router()

// router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), KitchenInventoryController.getByPropertyId.bind(KitchenInventoryController));      // paginated
// router.get("/property/:propertyId/light", supabaseAuth, requireRole(roles.ALL), KitchenInventoryController.getLightByPropertyId.bind(KitchenInventoryController));

// router.post("/", supabaseAuth, requireRole(roles.ALL), KitchenInventoryController.create.bind(KitchenInventoryController));
// router.put("/:id", supabaseAuth, requireRole(roles.ALL), KitchenInventoryController.updateById.bind(KitchenInventoryController));

// router.post("/bulk", supabaseAuth, requireRole(roles.ALL), KitchenInventoryController.createBulk.bind(KitchenInventoryController));
// router.put("/bulk", supabaseAuth, requireRole(roles.ALL), KitchenInventoryController.updateBulk.bind(KitchenInventoryController));

router.get("/", supabaseAuth, KitchenInventoryController.getByPropertyId.bind(KitchenInventoryController));

router.post("/", supabaseAuth, KitchenInventoryController.create.bind(KitchenInventoryController));

router.post("/bulk", supabaseAuth, KitchenInventoryController.bulkAdjustStock.bind(KitchenInventoryController));

router.post("/adjust-stock", supabaseAuth, KitchenInventoryController.adjustStock.bind(KitchenInventoryController));

router.put("/:id", supabaseAuth, KitchenInventoryController.update.bind(KitchenInventoryController));


export default router
