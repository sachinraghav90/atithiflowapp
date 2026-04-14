import GuestsService from "../services/Guests.service.js"

class GuestsController {

    async addGuestsByBooking(req, res) {
        try {
            const bookingId = req.params.id
            const createdBy = req.user.user_id

            const guests = JSON.parse(req.body.guests)

            const files = req.files || []

            guests.forEach((guest, index) => {
                if (files[index]) {
                    guest.id_proof_buffer = files[index].buffer
                    guest.id_proof_mime = files[index].mimetype
                }
            })

            const result = await GuestsService.addGuestsToBooking({
                bookingId,
                guests,
                createdBy
            })

            return res.status(201).json(result)

        } catch (err) {
            console.log("🚀 ~ GuestsController ~ addGuestsByBooking ~ err:", err)
            return res.status(400).json({
                message: err.message || "Failed to add guests"
            })
        }
    }


    async getGuestsByBooking(req, res) {
        try {
            const bookingId = req.params.id

            const result = await GuestsService.getGuestsByBookingId(bookingId)

            return res.status(200).json(result)

        } catch (err) {
            console.error("getGuestsByBooking:", err)
            return res.status(400).json({
                message: err.message || "Failed to fetch guests"
            })
        }
    }

    async getPrimaryGuestByBookingId(req, res) {
        try {
            const bookingId = req.params.bookingId

            const result = await GuestsService.getPrimaryGuestByBookingId(bookingId)

            return res.status(200).json(result)

        } catch (err) {
            console.error("getPrimaryGuestByBookingId:", err)
            return res.status(400).json({
                message: err.message || "Failed to fetch primary guest"
            })
        }
    }

    async updateGuests(req, res) {
        try {
            const userId = req.user.user_id
            const bookingId = Number(req.params.id)

            if (!req.body.guests) {
                return res.status(400).json({ message: "Guests data is required" })
            }

            const guests = JSON.parse(req.body.guests)

            const idProofMap = req.body.id_proof_map
                ? JSON.parse(req.body.id_proof_map)
                : {}

            const files = req.files || []

            const result = await GuestsService.updateGuestsBulk({
                bookingId,
                guests,
                updatedBy: userId,
                files,
                idProofMap,
            })

            return res.status(200).json(result)

        } catch (err) {
            console.error("updateGuests:", err)

            return res.status(400).json({
                message: err.message || "Failed to update guests"
            })
        }
    }

    async viewGuestIdProof(req, res) {
        try {
            const guestId = Number(req.params.guestId)

            if (!guestId) {
                return res.status(400).json({ message: "Invalid guest id" })
            }

            const result = await GuestsService.getGuestIdProofById(guestId)

            if (!result) {
                return res.status(404).json({
                    message: "ID proof not found for this guest",
                })
            }

            res.setHeader("Content-Type", result.mime)
            res.setHeader("Cache-Control", "private, max-age=3600")

            return res.send(result.buffer)

        } catch (err) {
            console.error("viewGuestIdProof:", err)

            return res.status(500).json({
                message: "Failed to fetch ID proof",
            })
        }
    }

    // async upsertGuestsByBooking(req, res) {
    //     try {
    //         const userId = req.user.user_id
    //         const bookingId = Number(req.params.id)

    //         if (!bookingId) {
    //             return res.status(400).json({
    //                 message: "Invalid booking id"
    //             })
    //         }

    //         /* 1️⃣ Guests payload */
    //         if (!req.body.guests) {
    //             return res.status(400).json({
    //                 message: "Guests data is required"
    //             })
    //         }

    //         let guests
    //         try {
    //             guests = JSON.parse(req.body.guests)
    //         } catch {
    //             return res.status(400).json({
    //                 message: "Invalid guests JSON"
    //             })
    //         }

    //         if (!Array.isArray(guests) || guests.length === 0) {
    //             return res.status(400).json({
    //                 message: "Guests must be a non-empty array"
    //             })
    //         }

    //         let idProofMap = {}
    //         if (req.body.id_proof_map) {
    //             try {
    //                 idProofMap = JSON.parse(req.body.id_proof_map)
    //             } catch {
    //                 return res.status(400).json({
    //                     message: "Invalid id_proof_map JSON"
    //                 })
    //             }
    //         }

    //         const files = req.files || []

    //         const result = await GuestsService.upsertGuestsByBooking({
    //             bookingId,
    //             guests,
    //             createdBy: userId,
    //             updatedBy: userId,
    //             files,
    //             idProofMap
    //         })

    //         return res.status(200).json(result)

    //     } catch (err) {
    //         console.error("upsertGuestsByBooking:", err)

    //         return res.status(400).json({
    //             message: err.message || "Failed to save guests"
    //         })
    //     }
    // }

    async upsertGuestsByBooking(req, res) {
        try {
            const userId = req.user.user_id
            const bookingId = Number(req.params.id)

            if (!bookingId) {
                return res.status(400).json({ message: "Invalid booking id" })
            }

            if (!req.body.guests) {
                return res.status(400).json({ message: "Guests data is required" })
            }

            let guests
            try {
                guests = JSON.parse(req.body.guests)
            } catch {
                return res.status(400).json({ message: "Invalid guests JSON" })
            }

            if (!Array.isArray(guests)) {
                return res.status(400).json({ message: "Guests must be an array" })
            }

            /* 🧹 REMOVED GUEST IDS */
            let removedGuestIds = []
            if (req.body.removed_guest_ids) {
                try {
                    removedGuestIds = JSON.parse(req.body.removed_guest_ids)
                } catch {
                    return res.status(400).json({
                        message: "Invalid removed_guest_ids JSON"
                    })
                }
            }

            /* 🪪 ID proof mapping */
            let idProofMap = {}
            if (req.body.id_proof_map) {
                idProofMap = JSON.parse(req.body.id_proof_map)
            }

            const files = req.files || []

            /* 🔄 Booking adult update */
            const updateAdult =
                req.body.update_adult === "true" || req.body.update_adult === true

            const adult =
                req.body.adult !== undefined
                    ? Number(req.body.adult)
                    : undefined

            const result = await GuestsService.upsertGuestsByBooking({
                bookingId,
                guests,
                removedGuestIds,
                createdBy: userId,
                updatedBy: userId,
                files,
                idProofMap,
                updateAdult,
                adult
            })

            return res.status(200).json(result)

        } catch (err) {
            console.error("upsertGuestsByBooking:", err)
            return res.status(400).json({
                message: err.message || "Failed to save guests"
            })
        }
    }

}

export default Object.freeze(new GuestsController())