import MenuItemGroupService from "../services/MenuItemGroup.service.js";

class MenuItemGroupController {

    /* ==============================
       GET BY PROPERTY (PAGINATED)
    =============================== */
    async getByPropertyId(req, res) {
        try {

            const propertyId = Number(req.params.propertyId);

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required"
                });
            }

            const result = await MenuItemGroupService.getByPropertyId({
                propertyId,
                page,
                limit
            });

            return res.json(result);

        } catch (err) {
            console.error("getByPropertyId error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /* ==============================
       LIGHT LIST (DROPDOWN)
    =============================== */
    async getLight(req, res) {
        try {

            const propertyId = Number(req.params.propertyId);

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required"
                });
            }

            const data = await MenuItemGroupService.getLightByPropertyId(propertyId);

            return res.json(data);

        } catch (err) {
            console.error("getLight error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /* ==============================
       CREATE
    =============================== */
    async create(req, res) {
        try {

            const userId = req.user?.user_id;

            const {
                property_id,
                name
            } = req.body;

            if (!property_id || !name) {
                return res.status(400).json({
                    message: "property_id and name required"
                });
            }

            const created = await MenuItemGroupService.create({
                property_id,
                name,
                created_by: userId
            });

            return res.status(201).json(created);

        } catch (err) {

            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Menu item group already exists"
                });
            }

            console.error("create error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /* ==============================
       UPDATE
    =============================== */
    async update(req, res) {
        try {

            const id = Number(req.params.id);
            const userId = req.user?.user_id;

            if (!id) {
                return res.status(400).json({
                    message: "id required"
                });
            }

            const updated = await MenuItemGroupService.updateById(
                id,
                {
                    ...req.body,
                    updated_by: userId
                }
            );

            if (!updated) {
                return res.status(404).json({
                    message: "Menu item group not found"
                });
            }

            return res.json(updated);

        } catch (err) {

            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Menu item group already exists"
                });
            }

            console.error("update error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    /* ==============================
       DELETE
    =============================== */
    async delete(req, res) {
        try {

            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({
                    message: "id required"
                });
            }

            const deleted = await MenuItemGroupService.deleteById(id);

            if (!deleted) {
                return res.status(404).json({
                    message: "Menu item group not found"
                });
            }

            return res.json({
                message: "Deleted successfully"
            });

        } catch (err) {
            console.error("delete error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

}

export default Object.freeze(new MenuItemGroupController());
