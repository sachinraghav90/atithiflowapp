import VendorService from "../services/Vendor.service.js";

class VendorController {
    async getByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;
            const search = String(req.query.search ?? "");
            const page = Math.max(Number.parseInt(req.query.page ?? "1", 10) || 1, 1);
            const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? "10", 10) || 10, 1), 100);

            const data = await VendorService.getByPropertyId(propertyId, page, limit, search);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async getAllByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;
            const data = await VendorService.getAllByPropertyId(propertyId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const userId = req.user.user_id;
            const data = await VendorService.create(req.body, userId);
            res.status(201).json(data);
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.user_id;
            const data = await VendorService.update(id, req.body, userId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new VendorController());
