import MenuMasterService from "../services/MenuMaster.service.js";

class MenuMasterController {

    /**
     * GET /menu?propertyId=1&page=1&limit=10
     */
    async getByProperty(req, res) {
        try {
            const { page, limit } = req.query;
            const { propertyId } = req.params

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required",
                });
            }

            const result = await MenuMasterService.getByProperty({
                propertyId: Number(propertyId),
                page: Number(page) || 1,
                limit: Number(limit) || 10,
            });

            return res.status(200).json(result);
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ getByProperty ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    /**
     * GET /menu/light?propertyId=1
     * Returns only id, item_name, is_active
     */
    async getIdNameStatusByProperty(req, res) {
        try {
            const { propertyId } = req.params;

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required",
                });
            }

            const rows =
                await MenuMasterService.getIdNameStatusByProperty(
                    Number(propertyId)
                );

            return res.status(200).json(rows);
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ getIdNameStatusByProperty ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    /**
     * GET /menu/:id/image
     */
    async getImageById(req, res) {
        try {
            const { id } = req.params;

            const imageData = await MenuMasterService.getImageById(
                Number(id)
            );

            if (!imageData || !imageData.image) {
                return res.status(404).json({
                    message: "Image not found",
                });
            }

            res.setHeader(
                "Content-Type",
                imageData.image_mime || "application/octet-stream"
            );

            return res.status(200).send(imageData.image);
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ getImageById ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    /**
     * POST /menu
     */
    async create(req, res) {
        try {
            const userId = req.user?.user_id;

            const image = req.file?.buffer || null;
            const imageMime = req.file?.mimetype || null;

            const menuItem = await MenuMasterService.create({
                ...req.body,
                image,
                imageMime,
                userId,
            });

            return res.status(201).json(menuItem);
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ create ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }


    /**
     * PUT /menu/:id
     */
    async updateById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.user_id;

            const image = req.file?.buffer;
            const imageMime = req.file?.mimetype;

            const updated = await MenuMasterService.updateById(
                Number(id),
                {
                    ...req.body,
                    image,
                    imageMime,
                    userId,
                }
            );

            if (!updated) {
                return res.status(404).json({
                    message: "Menu item not found",
                });
            }

            return res.status(200).json(updated);
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ updateById ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }


    /**
     * PATCH /menu/bulk
     * Body: [{ id, price, is_active, prep_time }]
     */
    async bulkUpdate(req, res) {
        try {
            const userId = req.user?.user_id;
            const items = req.body;

            if (!Array.isArray(items)) {
                return res.status(400).json({
                    message: "Array payload expected",
                });
            }

            const updatedItems =
                await MenuMasterService.bulkUpdate(
                    items,
                    userId
                );

            return res.status(200).json({
                data: updatedItems,
            });
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ bulkUpdate ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    /**
     * DELETE /menu/:id
     */
    async deleteById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.user_id

            const deleted =
                await MenuMasterService.deleteById(
                    Number(id),
                    userId
                );

            if (!deleted) {
                return res.status(404).json({
                    message: "Menu item not found",
                });
            }

            return res.status(200).json({
                message: "Menu item deleted successfully",
            });
        } catch (error) {
            console.log("🚀 ~ MenuMasterController ~ deleteById ~ error:", error)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    async getByGroupId(req, res) {

        try {

            const propertyId = Number(req.query.propertyId);
            const groupId = Number(req.params.groupId);

            if (!propertyId || !groupId) {
                return res.status(400).json({
                    message: "propertyId and groupId required"
                });
            }

            const data = await MenuMasterService.getByGroupId({
                propertyId,
                groupId,
                onlyActive: req.query.onlyActive === "true"
            });

            return res.json(data);

        } catch (err) {

            console.error(err);
            return res.status(500).json({
                message: "Internal server error"
            });
        }
    }

    /* =====================================
        BULK CREATE MENU ITEMS
    ===================================== */

    async bulkCreate(req, res, next) {

        try {

            const userId = req.user.id;
            
            // const items = JSON.parse(req.body.items || "[]");
            const propertyId = req.body.propertyId;
            const items = req.body.items || []

            const files = req.files || [];

            /* ---------- BUILD FILE MAP ---------- */

            // image_1 => file
            const fileMap = new Map();

            for (const file of files) {

                const key = file.fieldname.replace("image_", "");

                fileMap.set(key, file);

            }

            /* ---------- ATTACH IMAGES TO ITEMS ---------- */

            const itemsWithImages = items.map(item => {

                const file = fileMap.get(item.tempId);

                return {
                    ...item,
                    image: file ? file.buffer : null,
                    imageMime: file ? file.mimetype : null
                };

            });

            const result = await MenuMasterService.bulkCreate({
                propertyId,
                userId,
                items: itemsWithImages
            });

            res.json({
                success: true,
                data: result
            });

        } catch (err) {

            next(err);

        }
    }

}

export default Object.freeze(new MenuMasterController());
