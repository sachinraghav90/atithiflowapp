import express from "express";
import MenuMasterController from "../controllers/MenuMaster.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), MenuMasterController.getByProperty.bind(MenuMasterController));
router.get("/property/:propertyId/light", supabaseAuth, requireRole(roles.ALL), MenuMasterController.getIdNameStatusByProperty.bind(MenuMasterController));
router.get("/:id/image", MenuMasterController.getImageById.bind(MenuMasterController));
router.get("/by-group/:groupId", supabaseAuth, MenuMasterController.getByGroupId.bind(MenuMasterController));

router.post("/", supabaseAuth, requireRole(roles.ALL), upload.single("image"), MenuMasterController.create.bind(MenuMasterController));
router.post("/bulk", supabaseAuth, requireRole(roles.ALL), upload.any(), MenuMasterController.bulkCreate.bind(MenuMasterController));
router.put("/:id", supabaseAuth, requireRole(roles.ALL), upload.single("image"), MenuMasterController.updateById.bind(MenuMasterController));
router.patch("/", supabaseAuth, requireRole(roles.ALL), MenuMasterController.bulkUpdate.bind(MenuMasterController));
router.delete("/:id", supabaseAuth, requireRole(roles.ALL), MenuMasterController.deleteById.bind(MenuMasterController));

export default router;
