import propertyFloorService from "../services/PropertyFloor.service.js"
import RoomService from "../services/Room.Service.js"

class PropertyFloor {
    async getById(req, res) {
        try {
            const property_id = req.params.id
            const data = await propertyFloorService.getByPropertyId({ property_id })
            return res.json({ message: "Success", floors: data })
        } catch (error) {
            console.log("🚀 ~ PropertyFloor ~ getById ~ error:", error)
            return res.status(500).json({ message: "Error getting property's floor" })
        }
    }

    async bulkUpsert(req, res) {
        try {
            const user_id = req.user.user_id
            const property_id = req.params.id
            const { floors, prefix } = req.body

            await propertyFloorService.bulkUpsertFloors({ property_id, user_id, floors })
            await RoomService.bulkCreateRooms({ propertyId: property_id, floors, prefix, createdBy: user_id })
            return res.status(201).json({ message: "Successfully inserted floors data" })
        } catch (error) {
            console.log("🚀 ~ PropertyFloor ~ bulkUpsert ~ error:", error)
            res.status(500).json({ message: "Error inserting floors" })
        }
    }
}

export default Object.freeze(new PropertyFloor)