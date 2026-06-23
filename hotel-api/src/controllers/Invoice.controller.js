import InvoiceService from "../services/Invoice.service.js";
import InvoicePdfService from "../services/InvoicePdf.service.js";

class InvoiceController {
    
    async generate(req, res, next) {
        try {
            const bookingId = req.params.bookingId;
            const userId = req.user?.id; // Assuming auth middleware attaches user
            
            const result = await InvoiceService.generateInvoice(bookingId, userId);
            
            return res.status(200).json(result);
        } catch (error) {
            if (error.status === 400 || error.message === "Booking not found." || error.message.includes("Cannot generate invoice") || error.message.includes("after checkout")) {
                return res.status(error.status || 400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    async getByBooking(req, res, next) {
        try {
            const bookingId = req.params.bookingId;
            const invoice = await InvoiceService.getExistingInvoice(bookingId);
            
            if (!invoice) {
                return res.status(404).json({ success: false, message: "Invoice not found for this booking." });
            }
            
            return res.status(200).json({ success: true, invoice });
        } catch (error) {
            next(error);
        }
    }

    async download(req, res, next) {
        try {
            const bookingId = req.params.bookingId;
            const userId = req.user?.id;
            
            let invoiceData;
            try {
                // generateInvoice safely returns existing if found, or generates new
                const result = await InvoiceService.generateInvoice(bookingId, userId);
                invoiceData = result.invoice;
            } catch (error) {
                if (error.status === 400 || error.message === "Booking not found." || error.message.includes("Cannot generate invoice") || error.message.includes("after checkout")) {
                    return res.status(error.status || 400).json({ success: false, message: error.message });
                }
                throw error;
            }

            if (!invoiceData) {
                return res.status(404).json({ success: false, message: "Invoice not found." });
            }

            const pdfBuffer = await InvoicePdfService.generatePdfBuffer(invoiceData);
            
            const sanitizedNo = (invoiceData.invoice_no || "unknown").replace(/\//g, "-");
            const filename = `Invoice-${sanitizedNo}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            return res.send(pdfBuffer);
        } catch (error) {
            console.error("PDF Download error:", error);
            return res.status(500).json({ success: false, message: "Invoice PDF generation failed." });
        }
    }
}

export default new InvoiceController();
