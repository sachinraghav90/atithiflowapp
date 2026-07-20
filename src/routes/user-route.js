import express from "express";
import user from "../controllers/user-controller.js";
import { supabaseAuth } from "../middlewares/supabase-auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { roles } from "../../utils/roles.js";

const router = express.Router()

router.route("/")
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER), user.createUser.bind(user))

router.route("/user-by-property")
    .get(supabaseAuth, requireRole(roles.OWNER, roles.SUPER_ADMIN), user.getUsersByPropertyAndRoles.bind(user))

router.get("/property/:propertyId", supabaseAuth, requireRole(roles.ALL), user.getUsersByPropertyAndRole.bind(user))

router.route("/me")
    .get(supabaseAuth, user.getMe.bind(user))

router.patch("/me/change-password", supabaseAuth, user.updatePassword.bind(user))


router.route("/by-role/:id")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER), user.getUsersByRole.bind(user))


export default router;
