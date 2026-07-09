import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import RefPackagesController from '../controllers/RefPackages.controller.js'

const router = express.Router()

router.route("/")
    .get(supabaseAuth, requireRole(roles.ALL), RefPackagesController.getAll.bind(RefPackagesController))
    .post(supabaseAuth, requireRole(roles.ALL), RefPackagesController.create.bind(RefPackagesController))

router.route("/:id")
    .put(supabaseAuth, requireRole(roles.ALL), RefPackagesController.updateById.bind(RefPackagesController))
    .delete(supabaseAuth, requireRole(roles.ALL), RefPackagesController.deleteById.bind(RefPackagesController))

export default router