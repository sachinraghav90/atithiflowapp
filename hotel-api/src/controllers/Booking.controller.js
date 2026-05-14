import BookingService from "../services/Booking.service.js"

class Booking {
    async getBookings(req, res) {
        try {
            const { propertyId, arrivalFrom, arrivalTo, departureFrom, departureTo, page = 1, limit = 10, scope, status, search } = req.query
            const bookings = await BookingService.getBookings({ arrivalFrom, arrivalTo, departureFrom, departureTo, propertyId, limit, page, status, scope, search });
            return res.json({ message: "Success", ...bookings })
        } catch (error) {
            console.error("Booking Controller Error [getBookings]:", error)
            return res.status(500).json({ message: "Error fetching bookings" })
        }
    }

    async getTodayInHouseBookingIdsByProperty(req, res) {
        try {
            const propertyId = req.params.id
            const bookings = await BookingService.getTodayInHouseBookingIdsByProperty(propertyId)
            return res.json(bookings)
        } catch (error) {
            console.error("Booking Controller Error [getTodayInHouseBookingIdsByProperty]:", error)
            return res.status(500).json({ message: "Error fetching bookings" })
        }
    }

    async getTodayInHouseRoomsByProperty(req, res) {
        try {
            const propertyId = req.params.id
            const bookings = await BookingService.getTodayInHouseRoomsByProperty(propertyId)
            return res.json(bookings)
        } catch (error) {
            console.error("Booking Controller Error [getTodayInHouseRoomsByProperty]:", error)
            return res.status(500).json({ message: "Error fetching bookings" })
        }
    }

    async getBookingById(req, res) {
        try {
            const { id } = req.params
            const booking = await BookingService.getBookingById(id)
            return res.json({ message: "Success", booking })
        } catch (error) {
            console.error("Booking Controller Error [getBookingById]:", error)
            return res.status(500).json({ message: "Error getting booking" })
        }
    }

    async createBooking(req, res) {
        try {
            const created_by = req.user.user_id
            const { property_id, package_id, booking_type, booking_status, booking_date, estimated_arrival, estimated_departure, adult, child, discount_type, rooms, discount, price_before_tax, discount_amount, price_after_discount, gst_amount, room_tax_amount, comments, pickup, drop } = req.body;
            const booking = await BookingService.createBooking({ adult, booking_date, rooms, booking_status, booking_type, child, created_by, discount, discount_type, estimated_arrival, estimated_departure, package_id, property_id, discount_amount, gst_amount, comments, price_after_discount, price_before_tax, room_tax_amount, pickup, drop })
            return res.status(201).json({ message: "Success", booking })
        } catch (error) {
            console.log("🚀 ~ Booking ~ createBooking ~ error:", error)
            return res.status(500).json({ message: "Error creating booking" })
        }
    }

    async cancelBooking(req, res) {
        try {
            const bookingId = req.params.id
            const { cancellation_fee, comments } = req.body
            const userId = req.user.user_id

            const result = await BookingService.cancelBooking({
                bookingId,
                cancellationFee: cancellation_fee ?? 0,
                comments,
                cancelledBy: userId
            })

            return res.json(result)

        } catch (err) {
            console.error("cancelBooking:", err.message)
            return res.status(400).json({
                message: err.message || "Failed to cancel booking"
            })
        }
    }

    async updateBookingStatus(req, res) {
        try {
            const bookingId = req.params.id
            const { status, comments } = req.body
            const userId = req.user.user_id

            const result = await BookingService.updateBookingStatus({
                bookingId,
                status,
                comments,
                updatedBy: userId
            })

            return res.status(200).json(result)

        } catch (err) {

            if (err?.code === "ROOM_NOT_AVAILABLE") {
                return res.status(409).json({
                    code: "ROOM_NOT_AVAILABLE",
                    message: err.message,
                    booking_id: err.booking_id,
                    conflicted_rooms: err.conflicted_rooms
                });
            }

            if (err?.code === "INVALID_CHECKOUT") {
                return res.status(400).json({
                    code: "INVALID_CHECKOUT",
                    message: err.message,
                    booking_id: err.booking_id,
                    current_status: err.current_status
                });
            }

            return res.status(500).json({
                message: "Failed to update booking status"
            });
        }
    }

    async exportBookings(req, res) {
        const { propertyId, arrivalFrom, arrivalTo, departureFrom, departureTo, scope, status, search } = req.query

        const bookings = await BookingService.exportBookings({
            propertyId,
            arrivalFrom,
            arrivalTo,
            departureFrom,
            departureTo,
            scope,
            status,
            search
        })

        res.json(bookings)
    }
}

export default Object.freeze(new Booking())