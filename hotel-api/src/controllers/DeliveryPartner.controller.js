import DeliveryPartnerService from "../services/DeliveryPartner.service.js";

class DeliveryPartnerController {

    /* ===========================
       GET PAGINATED
    =========================== */
    async getDeliveryPartners(req, res) {

        try {

            const propertyId = Number(req.query.propertyId);

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId required"
                });
            }

            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 10);

            const result = await DeliveryPartnerService.getByProperty({
                propertyId,
                page,
                limit
            });

            res.json(result);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Failed to fetch delivery partners"
            });
        }
    }


    /* ===========================
       LIGHT LIST (dropdown)
    =========================== */
    async getDeliveryPartnersLight(req, res) {

        try {

            const propertyId = Number(req.query.propertyId);

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId required"
                });
            }

            const result =
                await DeliveryPartnerService.getLightByProperty(propertyId);

            res.json(result);

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Failed to fetch delivery partners"
            });
        }
    }


    /* ===========================
       CREATE
    =========================== */
    async createDeliveryPartner(req, res) {

        try {

            const userId = req.user?.user_id;

            const result = await DeliveryPartnerService.create({
                property_id: req.body.property_id,
                name: req.body.name,
                created_by: userId
            });

            res.status(201).json(result);

        } catch (err) {

            console.error(err);

            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Delivery partner already exists"
                });
            }

            res.status(500).json({
                message: "Failed to create delivery partner"
            });
        }
    }


    /* ===========================
       UPDATE
    =========================== */
    async updateDeliveryPartner(req, res) {

        try {

            const id = Number(req.params.id);

            const result = await DeliveryPartnerService.updateById(
                id,
                {
                    name: req.body.name,
                    updated_by: req.user?.user_id,
                    is_active: req.body.is_active
                }
            );

            res.json(result);

        } catch (err) {

            console.error(err);

            if (err.code === "23505") {
                return res.status(409).json({
                    message: "Delivery partner already exists"
                });
            }

            res.status(500).json({
                message: "Failed to update delivery partner"
            });
        }
    }


    /* ===========================
       DELETE
    =========================== */
    async deleteDeliveryPartner(req, res) {

        try {

            const id = Number(req.params.id);

            const result =
                await DeliveryPartnerService.deleteById(
                    id,
                    req.user?.user_id
                );

            res.json({ success: result });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message: "Failed to delete delivery partner"
            });
        }
    }

}

export default Object.freeze(new DeliveryPartnerController());
