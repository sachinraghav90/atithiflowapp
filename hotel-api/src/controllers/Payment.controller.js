import PaymentService from "../services/Payment.service.js";

class PaymentsController {

    async getByProperty(req, res, next) {
        try {
            const { propertyId } = req.params;
            const { page = 1, limit = 10, bookingId = "", method = "", status = "" } = req.query;

            const result = await PaymentService.getByPropertyId(
                propertyId,
                Number(page),
                Number(limit),
                {
                    bookingId: String(bookingId),
                    method: String(method),
                    status: String(status),
                }
            );

            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async getByBooking(req, res, next) {
        try {
            const { bookingId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const result = await PaymentService.getByBookingId(
                bookingId,
                Number(page),
                Number(limit)
            );

            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const { id } = req.params;

            const payment = await PaymentService.getById(id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            res.json(payment);
        } catch (err) {
            next(err);
        }
    }


    async create(req, res, next) {
        try {
            const userId = req.user.user_id
            req.body.userId = userId
            const payment = await PaymentService.create(req.body);
            res.status(201).json(payment);
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            req.body.updated_by = req.user.user_id;
            const payment = await PaymentService.update(id, req.body);
            res.json(payment);
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new PaymentsController());
