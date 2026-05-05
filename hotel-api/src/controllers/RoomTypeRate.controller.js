import RoomTypeRateService from "../services/RoomTypeRate.service.js";

class RoomTypeRateController {
    async getByProperty(req, res) {
        try {
            const { propertyId } = req.params;
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 10);
            const category = String(req.query.category ?? "");
            const bedType = String(req.query.bedType ?? "");
            const acType = String(req.query.acType ?? "");
            const search = String(req.query.search ?? "");

            const data = await RoomTypeRateService.getByProperty({
                propertyId,
                page,
                limit,
                category,
                bedType,
                acType,
                search,
            });
            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ RoomTypeRateController ~ getByProperty ~ err:", err)
            return res.status(500).json({ message: "Error fetching data" })
        }
    };

    async updatePricesBulk(req, res) {
        try {
            const { property_id, rates } = req.body;

            const data = await RoomTypeRateService.updatePricesBulk(
                property_id,
                rates,
                req.user.user_id
            );

            res.status(200).json({
                updated_count: data.length,
                rows: data
            });
        } catch (err) {
            console.log("🚀 ~ RoomTypeRateController ~ updatePricesBulk ~ err:", err)
            return res.status(500).json({ message: "Error updating data" })
        }
    };

    async generateRoomTypeRatesForAllProperties(req, res) {
        try {
            const userId = req.user.user_id
            const data = await RoomTypeRateService.generateRoomTypeRatesForAllProperties(userId)
            return res.json({ message: "Success", data })
        } catch (error) {
            console.log("🚀 ~ RoomTypeRateController ~ generateRoomTypeRatesForAllProperties ~ error:", error)
            return res.status(500).json({ message: "Error generating data" })
        }
    }

}

export default Object.freeze(new RoomTypeRateController())
