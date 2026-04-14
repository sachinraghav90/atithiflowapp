import RestaurantOrderService from "../services/RestaurantOrder.service.js";

class RestaurantOrderController {

    async getByProperty(req, res) {
        try {
            const { page, limit, status } = req.query;

            const { propertyId } = req.params

            if (!propertyId) {
                return res.status(400).json({ message: "propertyId required" });
            }

            const result = await RestaurantOrderService.getByProperty({
                propertyId: Number(propertyId),
                page: Number(page) || 1,
                limit: Number(limit) || 10,
                status: status != "undefined" ? status : undefined,
            });

            res.json(result);
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ getByProperty ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    async getByBooking(req, res) {
        try {

            const { bookingId } = req.params

            if (!bookingId) {
                return res.status(400).json({ message: "bookingId required" });
            }

            const result = await RestaurantOrderService.getOrdersByBookingId(bookingId);

            res.json(result);
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ getByBooking ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    // POST /orders
    async create(req, res) {
        try {
            const userId = req.user.user_id;

            const { order, items } = req.body;

            const created =
                await RestaurantOrderService.createOrderWithItems({
                    order,
                    items,
                    userId,
                });

            res.status(201).json(created);
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ create ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    // GET /orders/:id
    async getById(req, res) {
        try {
            const order = await RestaurantOrderService.getOrderWithItems(
                Number(req.params.id)
            );

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            res.json(order);
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ getById ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    // PATCH /orders/:id/status
    async updateStatus(req, res) {
        try {
            const userId = req.user.user_id;
            const { status } = req.body;

            const updated =
                await RestaurantOrderService.updateOrderStatus(
                    Number(req.params.id),
                    status,
                    userId
                );

            res.json(updated);
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ updateStatus ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    // PATCH /orders/:id/payment
    async updatePayment(req, res) {
        try {
            const userId = req.user.user_id;
            const { status } = req.body;

            const updated =
                await RestaurantOrderService.updatePaymentStatus(
                    Number(req.params.id),
                    status,
                    userId
                );

            res.json(updated);
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ updatePayment ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    // DELETE /orders/:id
    async delete(req, res) {
        try {
            const deleted =
                await RestaurantOrderService.deleteOrder(
                    Number(req.params.id)
                );

            if (!deleted) {
                return res.status(404).json({ message: "Order not found" });
            }

            res.json({ message: "Order deleted" });
        } catch (e) {
            console.log("🚀 ~ RestaurantOrderController ~ delete ~ e:", e)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }
}

export default Object.freeze(new RestaurantOrderController());
