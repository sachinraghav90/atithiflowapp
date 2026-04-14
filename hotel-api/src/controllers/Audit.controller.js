import AuditService from "../services/Audit.service.js";
import { sendErrorResponse } from "../utils/httpError.js";

class AuditController {
    async getByEventAndTable(req, res) {
        try {
            const { eventId, tableName, page } = req.query;
            if (!eventId || !tableName) {
                return res.status(400).json({ message: "eventId & tableName are required" });
            }

            const logs = await AuditService.getByEventAndTable({ eventId, tableName, page });
            return res.json(logs);
        } catch (error) {
            return sendErrorResponse(res, error, {
                fallbackMessage: "Unable to fetch history right now.",
                logLabel: "AuditController.getByEventAndTable error",
            });
        }
    }

    async getByTable(req, res) {
        try {
            const { tableName } = req.params;
            const { limit, page, propertyId } = req.query;

            if (!tableName) {
                return res.status(400).json({ message: "tableName is required" });
            }

            const logs = await AuditService.getByTableName({ tableName, limit, page, propertyId });
            return res.json(logs);
        } catch (error) {
            return sendErrorResponse(res, error, {
                fallbackMessage: "Unable to fetch history right now.",
                logLabel: "AuditController.getByTable error",
            });
        }
    }
}

export default Object.freeze(new AuditController());
