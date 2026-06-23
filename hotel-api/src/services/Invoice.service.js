import { getDb } from "../../utils/getDb.js";
import { numberToWords } from "../../utils/numberToWords.js";
import AuditService from "./Audit.service.js";

class InvoiceService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    getFinancialYear(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // 1-12
        if (month >= 4) {
            return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
        } else {
            return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
        }
    }

    async getExistingInvoice(bookingId) {
        const query = `
            SELECT *
            FROM public.invoices
            WHERE booking_id = $1
              AND invoice_status = 'ISSUED'
            ORDER BY id DESC
            LIMIT 1;
        `;
        const res = await this.#DB.query(query, [bookingId]);
        return res.rows[0] || null;
    }

    async generateSequence(client, propertyId, fy) {
        const prefix = `INV/${propertyId}/${fy}/`;
        const query = `
            SELECT invoice_no
            FROM public.invoices
            WHERE property_id = $1 AND invoice_no LIKE $2
            ORDER BY id DESC
            LIMIT 1
        `;
        const res = await client.query(query, [propertyId, `${prefix}%`]);
        let seq = 1;
        if (res.rows.length > 0) {
            const lastNo = res.rows[0].invoice_no;
            const parts = lastNo.split('/');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }
        return `${prefix}${seq.toString().padStart(4, '0')}`;
    }

    async generateInvoice(bookingId, userId) {
        const client = await this.#DB.connect();
        try {
            await client.query("BEGIN");

            // 1. Fetch existing invoice
            const existing = await this.getExistingInvoice(bookingId);
            if (existing) {
                await client.query("ROLLBACK");
                return { success: true, message: "Invoice already exists.", invoice: existing };
            }

            // 2. Fetch booking
            const bookingRes = await client.query(`SELECT * FROM public.bookings WHERE id = $1`, [bookingId]);
            const booking = bookingRes.rows[0];

            if (!booking) {
                throw new Error("Booking not found.");
            }

            if (booking.booking_status !== 'CHECKED_OUT') {
                const error = new Error("Invoice can be generated only after checkout.");
                error.status = 400;
                throw error;
            }

            // 3. Fetch Primary Guest
            const guestRes = await client.query(`
                SELECT * FROM public.guests
                WHERE booking_id = $1
                ORDER BY CASE WHEN guest_type = 'ADULT' THEN 1 ELSE 2 END, id ASC
                LIMIT 1
            `, [bookingId]);
            const guest = guestRes.rows[0];

            if (!guest) {
                const error = new Error("Cannot generate invoice because primary guest details are missing.");
                error.status = 400;
                throw error;
            }

            // Fetch guest address
            let guestAddressStr = guest.address;
            if (!guestAddressStr) {
                const addressRes = await client.query(`SELECT * FROM public.addresses WHERE entity_type = 'GUEST' AND entity_id = $1 AND address_type = 'HOME' LIMIT 1`, [guest.id]);
                if (addressRes.rows.length > 0) {
                    const addr = addressRes.rows[0];
                    guestAddressStr = [addr.address_line_1, addr.city, addr.state, addr.country].filter(Boolean).join(", ");
                }
            }

            // 4. Fetch Property Details
            const propRes = await client.query(`SELECT * FROM public.properties WHERE id = $1`, [booking.property_id]);
            const property = propRes.rows[0] || {};
            let propertyState = "-";
            let propertyAddressStr = "-";
            const propAddrRes = await client.query(`SELECT * FROM public.addresses WHERE entity_type = 'PROPERTY' AND entity_id = $1 LIMIT 1`, [booking.property_id]);
            if (propAddrRes.rows.length > 0) {
                const pAddr = propAddrRes.rows[0];
                propertyState = pAddr.state || "-";
                propertyAddressStr = [pAddr.address_line_1, pAddr.address_line_2, pAddr.city, pAddr.postal_code].filter(Boolean).join(", ");
            }

            // 5. Generate Invoice Number
            const invoiceDate = new Date();
            const fy = this.getFinancialYear(invoiceDate);
            const invoiceNo = await this.generateSequence(client, booking.property_id, fy);

            // 6. GST logic and Amount calculation
            let sellerGstin = property.gst_no || "";
            let sellerStateCode = sellerGstin.length >= 2 ? sellerGstin.substring(0, 2) : "-";
            let buyerStateCode = guest.country === 'India' && guest.state ? "-" : sellerStateCode; // Defaulting same state for now

            let earlyCheckin = Number(booking.early_checkin_amount) || 0;
            let delayedCheckout = Number(booking.delayed_checkout_amount) || 0;

            // Stay taxable
            let stayTaxable = Number(booking.price_after_discount);
            if (isNaN(stayTaxable) || stayTaxable <= 0) {
                stayTaxable = Number(booking.price_before_tax) - Number(booking.discount_amount);
                if (isNaN(stayTaxable) || stayTaxable <= 0) {
                    stayTaxable = Number(booking.final_amount) - Number(booking.gst_amount) - Number(booking.room_tax_amount);
                }
            }
            stayTaxable = Math.max(0, stayTaxable);

            // Laundry taxable
            const laundryRes = await client.query(`
                SELECT COALESCE(SUM(subtotal_amount), 0) as laundry_taxable
                FROM public.laundry_orders
                WHERE booking_id = $1 AND status = 'active' AND laundry_status != 'CANCELLED'
            `, [bookingId]);
            const laundryTaxable = Number(laundryRes.rows[0].laundry_taxable) || 0;

            const taxableAmount = stayTaxable + earlyCheckin + delayedCheckout + laundryTaxable;

            let cgst = 0;
            let sgst = 0;
            let igst = 0;

            // Simple 12% rule
            const totalTaxRate = 0.12; 
            const calculatedTax = taxableAmount * totalTaxRate;

            if (sellerStateCode === buyerStateCode) {
                cgst = calculatedTax / 2;
                sgst = calculatedTax / 2;
            } else {
                igst = calculatedTax;
            }

            const totalTax = cgst + sgst + igst;
            let grandTotalRaw = taxableAmount + totalTax;
            const roundOff = Math.round(grandTotalRaw) - grandTotalRaw;
            const grandTotal = Math.round(grandTotalRaw);

            // 7. Insert Invoice Snapshot
            const insertQuery = `
                INSERT INTO public.invoices (
                    booking_id, property_id, invoice_no, invoice_date, reference_no,
                    seller_name, seller_gstin, seller_address, seller_state, seller_state_code,
                    buyer_name, buyer_gstin, buyer_address, buyer_state, buyer_state_code,
                    place_of_supply, guest_name, guest_mobile, check_in_date, check_out_date,
                    stay_taxable_amount, laundry_taxable_amount, early_checkin_amount, delayed_checkout_amount,
                    taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax_amount,
                    round_off_amount, grand_total, amount_in_words, tax_amount_in_words,
                    created_by
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20,
                    $21, $22, $23, $24,
                    $25, $26, $27, $28, $29,
                    $30, $31, $32, $33, $34
                )
                RETURNING *;
            `;

            const fullName = [guest.salutation, guest.first_name, guest.last_name].filter(Boolean).join(" ");
            
            const values = [
                bookingId, booking.property_id, invoiceNo, invoiceDate, `BO${bookingId}`,
                property.brand_name || "-", property.gst_no || "-", propertyAddressStr, propertyState, sellerStateCode,
                fullName, null, guestAddressStr || "-", buyerStateCode, buyerStateCode,
                guest.coming_from || "-", fullName, guest.phone || "-", booking.actual_arrival || booking.estimated_arrival, booking.actual_departure || booking.estimated_departure,
                stayTaxable, laundryTaxable, earlyCheckin, delayedCheckout,
                taxableAmount, cgst, sgst, igst, totalTax,
                roundOff, grandTotal, numberToWords(grandTotal), numberToWords(totalTax),
                userId || null
            ];

            const insertRes = await client.query(insertQuery, values);
            const invoice = insertRes.rows[0];

            // 8. Audit logging
            try {
                await AuditService.log({
                    property_id: booking.property_id,
                    event_id: invoice.id,
                    table_name: "invoices",
                    event_type: "INVOICE_GENERATED",
                    task_name: "Generate Invoice",
                    comments: `Invoice generated for booking BO${bookingId}`,
                    details: JSON.stringify({
                        invoice_no: invoice.invoice_no,
                        booking_id: bookingId,
                        booking_no: `BO${bookingId}`,
                        grand_total: grandTotal
                    }),
                    user_id: userId || null
                });
            } catch (auditErr) {
                console.error("Audit log failed for invoice generation:", auditErr);
            }

            await client.query("COMMIT");
            return { success: true, message: "Invoice generated successfully.", invoice };

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}

export default Object.freeze(new InvoiceService());
