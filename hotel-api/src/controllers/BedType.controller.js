import BedTypeService from "../services/BedType.service.js";

 class BedTypeController {
    async getAll(_, res) {
        try {
            const data = await BedTypeService.getAll();
            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ BedTypeController ~ getAll ~ err:", err)
            return res.status(500).json({ message: "Error fetching data" })
        }
    };

    async create(req, res) {
        try {
            const { name } = req.body;

            const data = await BedTypeService.create({
                name,
                userId: req.user.user_id
            });

            res.status(201).json(data);
        } catch (err) {
            console.log("🚀 ~ BedTypeController ~ create ~ err:", err)
            return res.status(500).json({ message: "Error creating data" })
        }
    };

    async updateById(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const data = await BedTypeService.updateById(id, {
                name,
                userId: req.user.user_id
            });

            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ BedTypeController ~ updateById ~ err:", err)
            return res.status(500).json({ message: "Error updating data" })
        }
    };
}

export default Object.freeze(new BedTypeController())