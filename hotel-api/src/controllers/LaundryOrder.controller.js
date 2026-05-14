import LaundryOrderService from "../services/LaundryOrder.service.js";
import { sendErrorResponse } from "../utils/httpError.js";

class LaundryOrderController {

    /* =========================================================
       CREATE ORDER (MULTIPLE ITEMS)
    ========================================================= */

    async create(req, res) {

        try {

            const {
                bookingId,
                booking_id,
                propertyId,
                property_id,
                vendorId,
                vendor_id,
                pickupDate,
                pickup_date,
                deliveryDate,
                delivery_date,
                vendorStatus,
                vendor_status,
                items,
                comments,
                guestName,
                guest_name,
                guestMobile,
                guest_mobile,
                totalAmount,
                total_amount
            } = req.body;

            const userId = req.user?.user_id;

            const result = await LaundryOrderService.createOrder({
                bookingId: booking_id ?? bookingId,
                propertyId: property_id ?? propertyId,
                vendorId: vendor_id ?? vendorId,
                pickupDate: pickup_date ?? pickupDate,
                deliveryDate: delivery_date ?? deliveryDate,
                vendorStatus: vendor_status ?? vendorStatus,
                userId,
                items,
                comments,
                guestName: guest_name ?? guestName,
                guestMobile: guest_mobile ?? guestMobile,
                totalAmount: total_amount ?? totalAmount
            });

            return res.status(201).json({
                success: true,
                data: result
            });

        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to create laundry order right now.",
                logLabel: "LaundryOrderController.create error",
            });
        }
    }


    /* =========================================================
       GET BY PROPERTY (PAGINATED)
    ========================================================= */

    async getByProperty(req, res) {

        try {

            const propertyId = req.params.property_id;
            const { page, limit, status, vendor_status, search, export: exportParam } = req.query;

            const result = await LaundryOrderService.getByPropertyId({
                propertyId,
                page,
                limit,
                status: status != "undefined" ? status : undefined,
                vendorStatus: vendor_status != "undefined" ? vendor_status : undefined,
                search: search != "undefined" ? String(search ?? "") : "",
                exportRows: exportParam === "true",
            });

            return res.json({
                success: true,
                ...result
            });

        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to fetch laundry orders right now.",
                logLabel: "LaundryOrderController.getByProperty error",
            });
        }
    }


    /* =========================================================
       GET BY BOOKING
    ========================================================= */

    async getByBooking(req, res) {

        try {

            const bookingId = req.params.booking_id;

            const result =
                await LaundryOrderService.getByBookingId(bookingId);

            return res.json(result);

        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to fetch booking laundry orders right now.",
                logLabel: "LaundryOrderController.getByBooking error",
            });
        }
    }


    /* =========================================================
       UPDATE ORDER HEADER
    ========================================================= */

    async update(req, res) {

        try {

            const id = req.params.id;

            const {
                laundryStatus,
                pickupDate,
                deliveryDate,
                vendorStatus,
                vendorId,
                comments
            } = req.body;

            const userId = req.user?.user_id;

            const result = await LaundryOrderService.updateOrder({
                id,
                laundryStatus,
                pickupDate,
                deliveryDate,
                vendorStatus,
                vendorId,
                userId,
                comments
            });

            return res.json({
                success: true,
                data: result
            });

        } catch (err) {
            return sendErrorResponse(res, err, {
                fallbackMessage: "Unable to update laundry order right now.",
                logLabel: "LaundryOrderController.update error",
            });
        }
    }
}

export default Object.freeze(new LaundryOrderController());
