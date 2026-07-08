import express from 'express'
import RestaurantTableController from '../controllers/RestaurantTable.controller.js';
import { supabaseAuth } from '../middlewares/supabaseAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { roles } from '../../utils/roles.js';

const router = express.Router()

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), RestaurantTableController.getByPropertyId.bind(RestaurantTableController));
router.get("/property/:propertyId/light", supabaseAuth, requireRole(roles.ALL), RestaurantTableController.getTableNoByPropertyId.bind(RestaurantTableController));

router.post("/", supabaseAuth, requireRole(roles.ALL), RestaurantTableController.create.bind(RestaurantTableController));
router.put("/:id", supabaseAuth, requireRole(roles.ALL), RestaurantTableController.updateById.bind(RestaurantTableController));

router.post("/bulk", supabaseAuth, requireRole(roles.ALL), RestaurantTableController.createBulk.bind(RestaurantTableController));
router.put("/bulk", supabaseAuth, requireRole(roles.ALL), RestaurantTableController.updateBulk.bind(RestaurantTableController));

export default router