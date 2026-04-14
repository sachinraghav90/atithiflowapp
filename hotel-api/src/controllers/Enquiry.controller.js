import EnquiryService from "../services/Enquiry.service.js";

class EnquiryController {
    /**
     * GET /enquiries
     * Query params:
     *  propertyId (required)
     *  status
     *  page
     *  pageSize
     *  fromDate
     *  toDate
     */
    async getByPropertyId(req, res, next) {
        try {
            const {
                propertyId,
                status,
                page = 1,
                pageSize = 10,
                fromDate,
                toDate,
            } = req.query;

            if (!propertyId) {
                return res.status(400).json({
                    message: "propertyId is required",
                });
            }

            const result = await EnquiryService.getEnquiriesByPropertyId({
                propertyId: Number(propertyId),
                status,
                page: Number(page),
                pageSize: Number(pageSize),
                fromDate,
                toDate,
            });

            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /enquiries
     */
    async create(req, res, next) {
        try {
            const userId = req.user.user_id;
            const payload = req.body;

            if (!payload.property_id || !payload.guest_name) {
                return res.status(400).json({
                    message: "property_id and guest_name are required",
                });
            }

            const enquiry = await EnquiryService.createEnquiry(
                payload,
                userId
            );

            return res.status(201).json({
                message: "Enquiry created successfully",
                data: enquiry,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /enquiries/:id
     */
    async update(req, res, next) {
        try {
            const enquiryId = Number(req.params.id);
            const userId = req.user.user_id;
            const payload = req.body;

            if (!enquiryId) {
                return res.status(400).json({
                    message: "Invalid enquiry id",
                });
            }

            const updatedEnquiry = await EnquiryService.updateEnquiry(
                enquiryId,
                payload,
                userId
            );

            return res.status(200).json({
                message: "Enquiry updated successfully",
                data: updatedEnquiry,
            });
        } catch (error) {
            next(error);
        }
    }
}


export default Object.freeze(new EnquiryController())