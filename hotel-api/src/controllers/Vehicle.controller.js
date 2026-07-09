import VehicleService from "../services/Vehicle.service.js";

class VehiclesController {

    async upsertVehicles(req, res) {
        try {
            const userId = req.user.user_id;
            const bookingId = Number(req.params.id);
            const { vehicles } = req.body;

            if (!Array.isArray(vehicles)) {
                return res.status(400).json({ message: "vehicles array is required" });
            }

            const result = await VehicleService.upsertVehiclesByBooking({
                bookingId,
                vehicles,
                userId
            });

            return res.status(200).json(result);

        } catch (err) {
            return res.status(400).json({
                message: err.message || "Failed to save vehicles"
            });
        }
    }

    async getByBooking(req, res) {
        try {
            const bookingId = Number(req.params.id);
            const vehicles = await VehicleService.getVehiclesByBooking(bookingId);

            res.json({ vehicles });

        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }

}

export default new VehiclesController();
