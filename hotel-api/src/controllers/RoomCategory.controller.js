import RoomCategoryService from "../services/RoomCategory.service.js";

class RoomCategoryController {
    async getAll(_, res) {
        try {
            const data = await RoomCategoryService.getAll();
            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ RoomCategoryController ~ getAll ~ err:", err)
            return res.status(500).json({ message: "Error fetching data" })
        }
    };

    async create(req, res) {
        try {
            const { name, description } = req.body;

            const data = await RoomCategoryService.create({
                name,
                description,
                userId: req.user.user_id
            });

            res.status(201).json(data);
        } catch (err) {
            console.log("🚀 ~ RoomCategoryController ~ create ~ err:", err)
            return res.status(500).json({ message: "Error creating data" })
        }
    };

    async updateById(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            const data = await RoomCategoryService.updateById(id, {
                name,
                description,
                userId: req.user.user_id
            });

            res.status(200).json(data);
        } catch (err) {
            console.log("🚀 ~ RoomCategoryController ~ updateById ~ err:", err)
            return res.status(500).json({ message: "Error updating data" })
        }
    };
}

export default Object.freeze(new RoomCategoryController())