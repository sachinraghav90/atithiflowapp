import AcTypeService from "../services/AcType.service.js";

class AcTypeController {
    async getAll(_, res) {
        try {
            const data = await AcTypeService.getAll();
            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ AcTypeController ~ getAll ~ err:", err)
            return res.status(500).json({ message: "Error fetching data" })
        }
    };

    async create(req, res) {
        try {
            const { name } = req.body;

            const data = await AcTypeService.create({
                name,
                userId: req.user.user_id
            });

            res.status(201).json(data);
        } catch (err) {
            console.log("🚀 ~ AcTypeController ~ create ~ err:", err)
            return res.status(500).json({ message: "Error creating data" })
        }
    };

    async updateById(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const data = await AcTypeService.updateById(id, {
                name,
                userId: req.user.user_id
            });

            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ AcTypeController ~ updateById ~ err:", err)
            return res.status(500).json({ message: "Error updating data" })
        }
    };
}

export default Object.freeze(new AcTypeController())