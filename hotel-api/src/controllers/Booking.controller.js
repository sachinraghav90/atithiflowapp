import BookingService from "../services/Booking.service.js"

class Booking {
    #isGuestImageSchemaMissing(error) {
        const msg = String(error?.message || "").toLowerCase();
        return msg.includes('column "guest_image" does not exist') || msg.includes("guest_image does not exist");
    }
    #validateBookingId(id) {
        const bookingId = Number(id);
        if (!bookingId || Number.isNaN(bookingId)) return null;
        return bookingId;
    }
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
            const { status, comments, actual_arrival, actual_departure } = req.body
            const userId = req.user.user_id

            const result = await BookingService.updateBookingStatus({
                bookingId,
                status,
                comments,
                actual_arrival,
                actual_departure,
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

            if (err?.code === "STATUS_TIME_REQUIRED" || err?.code === "INVALID_STATUS_TIME") {
                return res.status(400).json({
                    code: err.code,
                    message: err.message,
                    booking_id: err.booking_id
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

    async uploadGuestImage(req, res) {
        try {
            const bookingId = this.#validateBookingId(req.params.id);
            if (!bookingId) return res.status(400).json({ message: "Invalid booking id" });
            if (!req.file) return res.status(400).json({ message: "Image file is required" });
            if (!["image/jpeg", "image/png"].includes(req.file.mimetype)) {
                return res.status(400).json({ message: "Only JPEG or PNG images are allowed" });
            }
            if (req.file.size > 2 * 1024 * 1024) {
                return res.status(400).json({ message: "Image size must be 2MB or less" });
            }
            const result = await BookingService.uploadGuestImage({
                bookingId,
                userId: req.user.user_id,
                imageBuffer: req.file.buffer,
                imageMime: req.file.mimetype,
            });
            return res.status(200).json(result);
        } catch (error) {
            if (this.#isGuestImageSchemaMissing(error)) {
                return res.status(404).json({ message: "Guest image feature is not available yet. Please run latest migrations." });
            }
            return res.status(400).json({ message: error.message || "Failed to upload guest image" });
        }
    }

    async getGuestImage(req, res) {
        try {
            const bookingId = this.#validateBookingId(req.params.id);
            if (!bookingId) return res.status(400).json({ message: "Invalid booking id" });
            const result = await BookingService.getGuestImage({ bookingId, userId: req.user.user_id });
            if (!result) return res.status(404).json({ message: "Guest image not found" });
            res.setHeader("Content-Type", result.mime);
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.send(result.buffer);
        } catch (error) {
            if (this.#isGuestImageSchemaMissing(error)) {
                return res.status(404).json({ message: "Guest image feature is not available yet. Please run latest migrations." });
            }
            return res.status(400).json({ message: error.message || "Failed to fetch guest image" });
        }
    }

    async deleteGuestImage(req, res) {
        try {
            const bookingId = this.#validateBookingId(req.params.id);
            if (!bookingId) return res.status(400).json({ message: "Invalid booking id" });
            const result = await BookingService.deleteGuestImage({ bookingId, userId: req.user.user_id });
            return res.status(200).json(result);
        } catch (error) {
            if (this.#isGuestImageSchemaMissing(error)) {
                return res.status(404).json({ message: "Guest image feature is not available yet. Please run latest migrations." });
            }
            return res.status(400).json({ message: error.message || "Failed to delete guest image" });
        }
    }
}

export default Object.freeze(new Booking())
