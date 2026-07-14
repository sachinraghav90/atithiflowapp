import express from 'express'
import { supabaseAuth } from '../middlewares/supabase-auth.js'
import AuditController from '../controllers/audit-controller.js'

const router = express.Router()

router.get("/", supabaseAuth, AuditController.getByEventAndTable.bind(AuditController))

router.get("/table/:tableName", supabaseAuth, AuditController.getByTable.bind(AuditController))

export default router
