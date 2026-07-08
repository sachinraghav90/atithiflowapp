import express from "express";
import StaffController from "../controllers/Staff.controller.js";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { upload } from "../middlewares/upload.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";

const router = express.Router();

router.get("/by-property/:id", supabaseAuth, requireRole(roles.ALL), StaffController.getAllByPropertyId.bind(StaffController));

router.get("/:id/image", StaffController.getImage.bind(StaffController)
);

router.get("/:id/id-proof", StaffController.getIdProof.bind(StaffController));

router.route("/")
    .get(supabaseAuth, StaffController.getAll.bind(StaffController))
    .post(supabaseAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "id_proof", maxCount: 1 },]), StaffController.create.bind(StaffController))
    .patch(supabaseAuth, StaffController.updatePassword.bind(StaffController))

router.route("/:id")
    .get(supabaseAuth, StaffController.getById.bind(StaffController))
    .patch(supabaseAuth, upload.fields([{ name: "image", maxCount: 1 }, { name: "id_proof", maxCount: 1 },]), StaffController.update.bind(StaffController));

export default router;
