import express from 'express'
import InventoryController from '../controllers/Inventory.controller.js';
import { supabaseAuth } from '../middlewares/supabaseAuth.js';

const router = express.Router()

router.get("/", supabaseAuth, InventoryController.getInventory.bind(InventoryController));
router.get("/types", supabaseAuth, InventoryController.getInventoryTypes.bind(InventoryController));
router.post("/", supabaseAuth, InventoryController.createInventory.bind(InventoryController));
router.post("/bulk", supabaseAuth, InventoryController.bulkCreate.bind(InventoryController));
router.post("/check-duplicates", supabaseAuth, InventoryController.checkDuplicates.bind(InventoryController));
router.put("/:id", supabaseAuth, InventoryController.updateInventory.bind(InventoryController));
router.delete("/:id", supabaseAuth, InventoryController.deleteInventory.bind(InventoryController));
router.get("/:type/property/:propertyId", supabaseAuth, InventoryController.getInventoryByType.bind(InventoryController));


export default router