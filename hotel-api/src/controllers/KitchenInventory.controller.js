import KitchenInventoryService from "../services/KitchenInventory.service.js";

class KitchenInventoryController {

    /* =====================================================
       GET kitchen inventory by property
    ===================================================== */

    async getByPropertyId(req, res) {

        try {

            const { propertyId, page, limit } = req.query;

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required"
                });
            }

            const result = await KitchenInventoryService.getByPropertyId({
                propertyId,
                page: Number(page) || 1,
                limit: Number(limit) || 10
            });

            return res.json(result);

        } catch (error) {

            console.error("KitchenInventory GET error:", error);

            return res.status(500).json({
                message: "Failed to fetch kitchen inventory"
            });
        }
    }

    /* =====================================================
       CREATE kitchen inventory entry
    ===================================================== */

    async create(req, res) {

        try {

            const userId = req.user?.user_id;

            const {
                property_id,
                inventory_master_id,
                quantity,
                unit
            } = req.body;

            if (!property_id || !inventory_master_id) {
                return res.status(400).json({
                    message: "Missing required fields"
                });
            }

            const result = await KitchenInventoryService.create({
                property_id,
                inventory_master_id,
                quantity,
                unit,
                created_by: userId
            });

            return res.status(201).json(result);

        } catch (error) {

            console.error("KitchenInventory CREATE error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "Inventory already exists for this item"
                });
            }

            return res.status(500).json({
                message: "Failed to create kitchen inventory"
            });
        }
    }

    /* =====================================================
       UPDATE kitchen inventory
    ===================================================== */

    async update(req, res) {

        try {

            const id = req.params.id;
            const userId = req.user?.user_id;

            const { quantity, unit, comments } = req.body;

            const result = await KitchenInventoryService.updateById(
                id,
                {
                    quantity,
                    unit,
                    updated_by: userId,
                    comments
                }
            );

            return res.json(result);

        } catch (error) {

            console.error("KitchenInventory UPDATE error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "Inventory already exists for this item"
                });
            }

            return res.status(500).json({
                message: "Failed to update kitchen inventory"
            });
        }
    }

    /* =====================================================
       ADJUST kitchen inventory stock (add / subtract)
    ===================================================== */

    async adjustStock(req, res) {

        try {

            const userId = req.user?.user_id;

            const {
                property_id,
                inventory_master_id,
                quantity,
                unit
            } = req.body;

            /* ---------- VALIDATION ---------- */

            if (!property_id || !inventory_master_id) {
                return res.status(400).json({
                    message: "property_id and inventory_master_id are required"
                });
            }

            if (quantity === undefined || quantity === null) {
                return res.status(400).json({
                    message: "quantity is required"
                });
            }

            /* ---------- SERVICE CALL ---------- */

            const result = await KitchenInventoryService.adjustStock({
                property_id,
                inventory_master_id,
                quantity: Number(quantity),
                unit,
                user_id: userId
            });

            return res.json(result);

        } catch (error) {

            console.error("KitchenInventory ADJUST STOCK error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "Inventory already exists for this item"
                });
            }

            return res.status(500).json({
                message: "Failed to adjust kitchen inventory stock"
            });
        }
    }

    /* =====================================================
        BULK ADJUST STOCK
    ===================================================== */
    async bulkAdjustStock(req, res) {

        try {

            const { property_id, items } = req.body;

            const user_id = req.user?.user_id;

            if (!property_id) {
                return res.status(400).json({
                    message: "property_id is required"
                });
            }

            if (!Array.isArray(items) || !items.length) {
                return res.status(400).json({
                    message: "items array is required"
                });
            }

            const result = await KitchenInventoryService.bulkAdjustStock({
                property_id,
                items,
                user_id
            });

            return res.status(200).json({
                message: "Kitchen inventory bulk adjustment successful",
                data: result
            });

        } catch (err) {

            console.error("KitchenInventoryController ~ bulkAdjustStock ~ err:", err);

            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Inventory already exists for one or more items"
                });
            }

            return res.status(500).json({
                message: err.message || "Failed to bulk adjust stock"
            });
        }
    }

}

export default Object.freeze(new KitchenInventoryController());
