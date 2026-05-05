import LaundryService from "../services/Laundry.service.js";
import { sendErrorResponse } from "../utils/httpError.js";

class LaundryController {
    async getByProperty(req, res, next) {
        try {
            const { propertyId } = req.params;
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 10);
            const search = req.query.search ?? "";
            const status = req.query.status ?? "";

            const data = await LaundryService.getByPropertyId({ propertyId, page, limit, search, status });
            res.json({ success: true, data });
        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to fetch laundry pricing right now.",
                logLabel: "LaundryController.getByProperty error",
            });
        }
    }

    async create(req, res, next) {
        try {
            const {
                propertyId,
                itemName,
                description,
                itemRate
            } = req.body;

            const userId = req.user.user_id;

            const data = await LaundryService.createLaundry({
                propertyId,
                description,
                itemRate,
                userId,
                itemName
            });

            res.status(201).json({ success: true, data });
        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to create laundry pricing right now.",
                logLabel: "LaundryController.create error",
            });
        }
    }

    async bulkCreate(req, res) {
        try {

            const {
                property_id,
                items
            } = req.body;

            const userId = req.user?.user_id;

            if (!property_id) {
                return res.status(400).json({
                    message: "property_id is required"
                });
            }

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    message: "items array is required"
                });
            }

            const result = await LaundryService.bulkCreateLaundry({
                propertyId: property_id,
                items,
                userId
            });

            return res.status(201).json({
                message: "Bulk laundry creation completed",
                inserted_count: result.length,
                data: result
            });

        } catch (error) {
            return sendErrorResponse(res, error, {
                fallbackMessage: "Unable to save laundry pricing right now.",
                logLabel: "LaundryController.bulkCreate error",
            });
        }
    }

    async bulkUpdate(req, res, next) {
        try {
            const { updates } = req.body;
            const userId = req.user.user_id;

            const data = await LaundryService.bulkUpdate({
                updates,
                userId
            });

            res.json({ success: true, data });
        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to update laundry pricing right now.",
                logLabel: "LaundryController.bulkUpdate error",
            });
        }
    }
}

export default Object.freeze(new LaundryController());
