import express from "express";
import { supabaseAuth } from "../middlewares/supabase-auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { roles } from "../../utils/roles.js";
import role from "../controllers/role-controller.js";

const router = express.Router()

router.route("/")
    .post(supabaseAuth, requireRole(roles.ALL), role.createRole.bind(role))
    .get(supabaseAuth, role.getAllRoles.bind(role))

router.route("/user-roles")
    .post(supabaseAuth, requireRole(roles.ALL, roles.OWNER), role.createUserRole.bind(role))

router.route("/:id")
    .patch(supabaseAuth, requireRole(roles.ALL), role.updateRole.bind(role))
    .delete(supabaseAuth, requireRole(roles.ALL), role.deleteRole.bind(role))

export default router
