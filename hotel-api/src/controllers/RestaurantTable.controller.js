import RestaurantTableService from "../services/RestaurantTable.service.js";

class RestaurantTableController {

    /* ===========================
       GET TABLES BY PROPERTY (PAGINATED)
    ============================ */
    async getByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            if (!propertyId) {
                return res.status(400).json({
                    success: false,
                    message: "propertyId is required"
                });
            }

            const result = await RestaurantTableService.getByPropertyId({
                propertyId: Number(propertyId),
                page: Number(page),
                limit: Number(limit)
            });

            res.json({
                ...result
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       GET TABLE NOS BY PROPERTY (LIGHT API)
    ============================ */
    async getTableNoByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;

            if (!propertyId) {
                return res.status(400).json({
                    success: false,
                    message: "propertyId is required"
                });
            }

            const data = await RestaurantTableService.getTableNoByPropertyId(
                Number(propertyId)
            );

            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       CREATE SINGLE TABLE
    ============================ */
    async create(req, res, next) {
        try {
            const userId = req.user.user_id

            const {
                property_id,
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active
            } = req.body;

            if (!property_id || !table_no) {
                return res.status(400).json({
                    success: false,
                    message: "property_id and table_no are required"
                });
            }

            const created = await RestaurantTableService.create({
                property_id,
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active,
                created_by: userId
            });

            res.status(201).json({
                success: true,
                data: created
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       UPDATE TABLE BY ID
    ============================ */
    async updateById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.user_id

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "id is required"
                });
            }

            const {
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active
            } = req.body;

            const updated = await RestaurantTableService.updateById(Number(id), {
                table_no,
                capacity,
                location,
                status,
                min_order_amount,
                is_active,
                updated_by: userId
            });

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found"
                });
            }

            res.json({
                success: true,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       BULK CREATE
    ============================ */
    async createBulk(req, res, next) {
        try {
            const userId = req.user.user_id

            const { property_id, tables } = req.body;

            if (!property_id || !Array.isArray(tables)) {
                return res.status(400).json({
                    success: false,
                    message: "property_id and tables[] are required"
                });
            }

            const created = await RestaurantTableService.createBulk({
                property_id,
                tables,
                created_by: userId
            });

            res.status(201).json({
                success: true,
                count: created.length,
                data: created
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       BULK UPDATE
    ============================ */
    async updateBulk(req, res, next) {
        try {
            const userId = req.user.user_id

            const { updates } = req.body;

            if (!Array.isArray(updates)) {
                return res.status(400).json({
                    success: false,
                    message: "updates[] array is required"
                });
            }

            const updated = await RestaurantTableService.updateBulk({
                updates,
                updated_by: userId
            });

            res.json({
                success: true,
                count: updated.length,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new RestaurantTableController());
