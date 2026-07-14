import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import { requireRole } from '../middlewares/require-role.js'
import { roles } from '../../utils/roles.js'
import PropertyBankAccountController from '../controllers/property-bank-account-controller.js'

const router = express.Router()

router.route("/property/:propertyId")
    .get(supabaseAuth, requireRole(roles.ALL), PropertyBankAccountController.getBankAccounts.bind(PropertyBankAccountController))
    .post(supabaseAuth, requireRole(roles.ALL), PropertyBankAccountController.upsertAccounts.bind(PropertyBankAccountController))

export default router
