import InventoryService from "../services/Inventory.service.js";

class InventoryController {

    /* =====================================================
       GET inventory by property
    ===================================================== */

    async getInventory(req, res) {

        try {

            const propertyId = req.query.propertyId;
            const inventoryTypeId = req.query.inventoryTypeId;
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 10);

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required"
                });
            }

            const data = await InventoryService.getInventoryByPropertyId({
                propertyId,
                inventoryTypeId,
                page,
                limit
            });

            return res.json(data);

        } catch (error) {

            console.error("getInventory error:", error);

            return res.status(500).json({
                message: "Failed to fetch inventory"
            });
        }
    }

    /* =====================================================
       CREATE inventory
    ===================================================== */

    async createInventory(req, res) {

        try {

            const userId = req.user?.user_id;
            const payload = req.body;

            if (!payload.property_id ||
                !payload.inventory_type_id ||
                !payload.use_type ||
                !payload.name
            ) {
                return res.status(400).json({
                    message: "Missing required fields"
                });
            }

            const result = await InventoryService.createInventory(
                payload,
                userId
            );

            return res.status(201).json(result);

        } catch (error) {

            console.error("createInventory error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "Inventory already exists"
                });
            }

            return res.status(500).json({
                message: "Failed to create inventory"
            });
        }
    }

    /* =====================================================
        BULK CREATE inventory
    ===================================================== */

    async bulkCreate(req, res) {

        try {

            const userId = req.user?.user_id;
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    message: "Items array is required"
                });
            }

            const data = await InventoryService.bulkCreateInventory(
                { items },
                userId
            );

            return res.status(201).json({
                message: "Inventory created successfully",
                data
            });

        } catch (err) {

            console.error(
                "InventoryController ~ bulkCreate ~ error:",
                err
            );

            if (err.code === "23505") {
                return res.status(409).json({
                    message: "One or more inventory items already exist in this category"
                });
            }

            return res.status(500).json({
                message: err.message || "Internal server error"
            });
        }
    }

    /* =====================================================
        CHECK DUPLICATES INVENTORY
    ===================================================== */

    async checkDuplicates(req, res) {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({
                    message: "Items array is required"
                });
            }

            const duplicates = await InventoryService.checkDuplicates(items);

            return res.status(200).json({
                duplicates
            });

        } catch (err) {
            console.error("InventoryController ~ checkDuplicates ~ error:", err);

            return res.status(500).json({
                message: err.message || "Internal server error"
            });
        }
    }

    /* =====================================================
       UPDATE inventory
    ===================================================== */

    async updateInventory(req, res) {

        try {

            const userId = req.user?.user_id;
            const id = req.params.id;
            const payload = req.body;

            const result = await InventoryService.updateInventory(
                id,
                payload,
                userId
            );

            return res.json(result);

        } catch (error) {

            console.error("updateInventory error:", error);

            if (error.code === "23505" || error.code === "INVENTORY_DUPLICATE" || error.statusCode === 409) {
                return res.status(409).json({
                    message: "Inventory item already exists in this category"
                });
            }

            return res.status(500).json({
                message: "Failed to update inventory"
            });
        }
    }

    /* =====================================================
       DELETE inventory
    ===================================================== */

    async deleteInventory(req, res) {

        try {

            const id = req.params.id;

            const result = await InventoryService.deleteInventory(id);

            return res.json(result);

        } catch (error) {

            console.error("deleteInventory error:", error);

            return res.status(500).json({
                message: "Failed to delete inventory"
            });
        }
    }

    /* =====================================================
    GET inventory by property + inventory type
    ===================================================== */

    async getInventoryByType(req, res) {

        try {

            const { propertyId, type } = req.params;

            if (!propertyId || !type) {
                return res.status(400).json({
                    message: "propertyId and type are required"
                });
            }

            const data = await InventoryService.getInventoryByType({
                propertyId,
                inventoryType: type
            });

            return res.json(data);

        } catch (error) {

            console.error("getInventoryByType error:", error);

            return res.status(500).json({
                message: "Failed to fetch inventory by type"
            });
        }
    }

    /* =====================================================
    GET inventory types
    ===================================================== */

    async getInventoryTypes(_, res) {

        try {

            const data = await InventoryService.getInventoryTypes();

            return res.json(data);

        } catch (error) {

            console.error("getInventoryTypes error:", error);

            return res.status(500).json({
                message: "Failed to fetch inventory types"
            });
        }
    }

}

export default Object.freeze(new InventoryController());
