import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import PropertyBankAccountController from '../controllers/PropertyBankAccount.controller.js'

const router = express.Router()

router.route("/property/:propertyId")
    .get(supabaseAuth, requireRole(roles.ALL), PropertyBankAccountController.getBankAccounts.bind(PropertyBankAccountController))
    .post(supabaseAuth, requireRole(roles.ALL), PropertyBankAccountController.upsertAccounts.bind(PropertyBankAccountController))

export default router