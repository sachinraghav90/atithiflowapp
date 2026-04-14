import express from "express"
import { supabaseAuth } from "../middlewares/supabaseAuth.js"
import property from "../controllers/Property.controller.js"
import { requireRole } from "../middlewares/requireRole.js"
import { roles } from "../../utils/roles.js"
import { upload } from "../middlewares/upload.js"

const router = express.Router()

router.get("/by-owner", supabaseAuth, property.getByOwnerUserId.bind(property))

router.get("/get-my-properties", supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER, roles.ALL), property.getMyProperties.bind(property))

router.get("/address", supabaseAuth, requireRole(roles.ALL), property.getPropertyAddress.bind(property))
router.get("/:id/tax", supabaseAuth, requireRole(roles.ALL), property.getPropertyTax.bind(property))

//super-admin only
router.route("/by-owner/:id")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN), property.getByOwnerUserId.bind(property))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), upload.fields([
        { name: "image", maxCount: 1 },
        { name: "logo", maxCount: 1 },
    ]), property.create.bind(property))

router.route("/")
    .get(supabaseAuth, requireRole(roles.ALL), property.getAll.bind(property))
    .post(supabaseAuth, requireRole(roles.OWNER, roles.SUPER_ADMIN), upload.fields([
        { name: "image", maxCount: 1 },
        { name: "logo", maxCount: 1 },
    ]), property.create.bind(property))

router.route("/:id")
    .get(supabaseAuth, property.getById.bind(property))
    .patch(supabaseAuth, requireRole(roles.OWNER, roles.SUPER_ADMIN), upload.fields([
        { name: "image", maxCount: 1 },
        { name: "logo", maxCount: 1 },
    ]), property.update.bind(property))

router.route("/:id/image",)
    .get(property.getImage.bind(property))

router.route("/:id/logo",)
    .get(property.getLogo.bind(property))

router.route("/:id/restaurant-tables",)
    .get(supabaseAuth, property.getRestaurantTables.bind(property))

export default router