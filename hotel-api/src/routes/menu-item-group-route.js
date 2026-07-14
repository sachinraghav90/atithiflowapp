import express from 'express'
import MenuItemGroupController from '../controllers/menu-item-group-controller.js';
import { supabaseAuth } from '../middlewares/supabase-auth.js';

const router = express.Router()

router.get("/:propertyId", supabaseAuth, MenuItemGroupController.getByPropertyId.bind(MenuItemGroupController));

router.get("/light/:propertyId", supabaseAuth, MenuItemGroupController.getLight.bind(MenuItemGroupController));

router.post("/", supabaseAuth, MenuItemGroupController.create.bind(MenuItemGroupController));

router.put("/:id", supabaseAuth, MenuItemGroupController.update.bind(MenuItemGroupController));

router.delete("/:id", supabaseAuth, MenuItemGroupController.delete.bind(MenuItemGroupController));

export default router;
