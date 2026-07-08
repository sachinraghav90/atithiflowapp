import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getDb } from "../../utils/getDb.js";
import { numberToWords } from "../../utils/numberToWords.js";

class InvoicePdfService {
    async generatePdfBuffer(invoice) {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const formatCurrency = (amount) => Number(amount || 0).toFixed(2);

        // Constants
        const m = 10; // margins
        const pw = 210; // page width
        const ew = pw - 2 * m; // effective width (190)
        let y = 4; // start near the very top of the page

        // 1. Header
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Tax Invoice", pw / 2, y + 4, { align: "center" });
        y += 4.5;

        const gridTop = y;
        const midX = m + (ew / 2); // 105
        
        // Prepare split texts for left side with smaller font
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        let buyerStateName = invoice.buyer_state && invoice.buyer_state !== "-" ? invoice.buyer_state : null;
        let sellerStateName = invoice.seller_state && invoice.seller_state !== "-" ? invoice.seller_state : null;
        let placeOfSupply = invoice.place_of_supply && invoice.place_of_supply !== "-" ? invoice.place_of_supply : null;
        let sellerAddress = invoice.seller_address && invoice.seller_address !== "-" ? invoice.seller_address : null;
        let buyerAddress = invoice.buyer_address && invoice.buyer_address !== "-" ? invoice.buyer_address : null;
        let sellerName = invoice.seller_name && invoice.seller_name !== "-" ? invoice.seller_name : null;

        try {
            const db = getDb();
            if (invoice.property_id && (!sellerStateName || sellerStateName === "-" || !sellerAddress || !sellerName)) {
                const propRes = await db.query(`SELECT brand_name FROM public.properties WHERE id = $1`, [invoice.property_id]);
                if (propRes.rows.length > 0) {
                    if (!sellerName && propRes.rows[0].brand_name) sellerName = propRes.rows[0].brand_name;
                }
                
                const addrRes = await db.query(`SELECT state, address_line_1, address_line_2, city, postal_code FROM public.addresses WHERE entity_type = 'PROPERTY' AND entity_id = $1 AND address_type = 'PROPERTY' LIMIT 1`, [invoice.property_id]);
                if (addrRes.rows.length > 0) {
                    const addr = addrRes.rows[0];
                    if (addr.state) sellerStateName = addr.state;
                    if (!sellerAddress) {
                        sellerAddress = [addr.address_line_1, addr.address_line_2, addr.city, addr.postal_code]
                            .filter(Boolean).join(", ");
                    }
                }
            }
            if (invoice.booking_id) {
                const guestRes = await db.query(
                    `SELECT coming_from, country FROM public.guests WHERE booking_id = $1 ORDER BY CASE WHEN guest_type = 'ADULT' THEN 1 ELSE 2 END, id ASC LIMIT 1`,
                    [invoice.booking_id]
                );
                if (guestRes.rows.length > 0) {
                    const guest = guestRes.rows[0];
                    if (!placeOfSupply && guest.coming_from) placeOfSupply = guest.coming_from;
                }
            }
            
            const stateMap = {
                "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand",
                "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar",
                "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
                "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
                "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "25": "Daman & Diu",
                "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa",
                "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
                "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
            };

            if (sellerStateName && stateMap[sellerStateName]) {
                sellerStateName = stateMap[sellerStateName];
            }
            if (buyerStateName && stateMap[buyerStateName]) {
                buyerStateName = stateMap[buyerStateName];
            } else if ((!buyerStateName || buyerStateName === "-") && invoice.buyer_state_code) {
                buyerStateName = stateMap[invoice.buyer_state_code] || buyerStateName;
            }

        } catch(e) {
            console.error("Failed to fetch property/guest details:", e);
        }

        sellerName = sellerName || "-";
        sellerStateName = sellerStateName || "-";
        buyerStateName = buyerStateName || "-";
        placeOfSupply = placeOfSupply || "-";
        sellerAddress = sellerAddress || "-";
        buyerAddress = buyerAddress || "-";

        const splitSellerAddr = doc.splitTextToSize(sellerAddress, midX - m - 4);
        const splitBuyerAddr = doc.splitTextToSize(buyerAddress, midX - m - 4);

        // Calculate dynamic heights for left sections (using smaller multiplier ~3mm)
        const sellerH = 4 + 3 + (splitSellerAddr.length * 3) + 3 + 4; 
        const buyerH = 4 + 3 + 3 + (splitBuyerAddr.length * 3) + 3 + 3 + 4;
        const leftH = sellerH + buyerH;

        // Right side has 7 rows
        const minRightH = 7 * 8; // 56
        const gridHeight = Math.max(leftH, minRightH, 60);
        const rowHeight = gridHeight / 7;

        // 2. Top Grid Box
        doc.rect(m, gridTop, ew, gridHeight); // Outer box
        doc.line(midX, gridTop, midX, gridTop + gridHeight); // Vertical split

        // --- Left Column Data ---
        let ly = gridTop;
        
        // Seller Box
        ly += 3.5;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(sellerName.toUpperCase(), m + 2, ly);
        ly += 3.5;
        doc.setFont("helvetica", "normal");
        doc.text(splitSellerAddr, m + 2, ly);
        ly += (splitSellerAddr.length * 3);
        doc.text(`GSTIN/UIN: ${invoice.seller_gstin || "-"}`, m + 2, ly);
        ly += 3.5;
        doc.text(`State Name : ${sellerStateName}, Code : ${invoice.seller_state_code || "-"}`, m + 2, ly);
        
        // Separator for Buyer
        let buyerY = gridTop + sellerH;
        doc.line(m, buyerY, midX, buyerY);
        ly = buyerY + 3.5;
        
        // Buyer Box
        doc.text("Buyer (Bill to)", m + 2, ly);
        ly += 3.5;
        doc.setFont("helvetica", "bold");
        doc.text((invoice.buyer_name || invoice.guest_name || "-").toUpperCase(), m + 2, ly);
        ly += 3.5;
        doc.setFont("helvetica", "normal");
        doc.text(splitBuyerAddr, m + 2, ly);
        ly += (splitBuyerAddr.length * 3);
        if (invoice.buyer_gstin && invoice.buyer_gstin !== "-") {
            doc.text(`GSTIN/UIN: ${invoice.buyer_gstin}`, m + 2, ly);
            ly += 3.5;
        }
        doc.text(`State Name : ${buyerStateName}, Code : ${invoice.buyer_state_code || "-"}`, m + 2, ly);
        ly += 3.5;
        doc.text(`Place of Supply : ${placeOfSupply}`, m + 2, ly);

        // --- Right Column Data ---
        const drawRightBox = (index, label1, val1, label2, val2, splitAt = midX + ((ew/2) / 2)) => {
            const rowY = gridTop + (index * rowHeight);
            if (index > 0) {
                doc.line(midX, rowY, pw - m, rowY); // horizontal separator
            }
            if (label2 !== null) {
                doc.line(splitAt, rowY, splitAt, rowY + rowHeight); // vertical separator
            }
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            
            // Box 1
            doc.text(label1, midX + 2, rowY + 3);
            doc.setFont("helvetica", "bold");
            const splitVal1 = doc.splitTextToSize(val1, (splitAt - midX) - 4);
            doc.text(splitVal1, midX + 2, rowY + 6);
            
            // Box 2
            if (label2 !== null) {
                doc.setFont("helvetica", "normal");
                doc.text(label2, splitAt + 2, rowY + 3);
                doc.setFont("helvetica", "bold");
                const splitVal2 = doc.splitTextToSize(val2, (pw - m - splitAt) - 4);
                doc.text(splitVal2, splitAt + 2, rowY + 6);
            }
        };

        const invDateObj = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date();
        const invDateStr = invDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
        const refNo = invoice.booking_id ? `NH${invoice.booking_id} dt. ${invDateStr}` : "-";

        drawRightBox(0, "Invoice No.", invoice.invoice_no || "-", "Dated", invDateStr);
        drawRightBox(1, "Delivery Note", "", "Mode/Terms of Payment", "");
        drawRightBox(2, "Reference No. & Date.", refNo, "Other References", "");
        drawRightBox(3, "Buyer's Order No.", "", "Dated", "");
        drawRightBox(4, "Dispatch Doc No.", "", "Delivery Note Date", "");
        drawRightBox(5, "Dispatched through", "", "Destination", "");
        drawRightBox(6, "Terms of Delivery", "", null); // Takes full row width

        y = gridTop + gridHeight; // Update y to bottom of grid

        // 3. Items Table
        const items = [];
        
        // Collect items dynamically
        if (Number(invoice.stay_taxable_amount) > 0) {
            const checkInStr = invoice.check_in_date ? new Date(invoice.check_in_date).toLocaleDateString('en-GB').replace(/\//g, '.') : "";
            const checkOutStr = invoice.check_out_date ? new Date(invoice.check_out_date).toLocaleDateString('en-GB').replace(/\//g, '.') : "";
            
            items.push({
                particulars: `    Stay Revenue`,
                hsn: "996311",
                amount: formatCurrency(invoice.stay_taxable_amount),
                isMain: true,
                padBottom: 0
            });
            items.push({
                particulars: `    Guest name - ${invoice.guest_name || "-"}\n    Check in - ${checkInStr}\n    Check Out - ${checkOutStr}`,
                hsn: "",
                amount: "",
                isMain: false,
                padTop: 0
            });
        }

        if (Number(invoice.early_checkin_amount) > 0) {
            items.push({ particulars: "    Early Check-In", hsn: "996311", amount: formatCurrency(invoice.early_checkin_amount), isMain: true });
        }

        if (Number(invoice.delayed_checkout_amount) > 0) {
            items.push({ particulars: "    Delayed Checkout", hsn: "996311", amount: formatCurrency(invoice.delayed_checkout_amount), isMain: true });
        }

        if (Number(invoice.laundry_taxable_amount) > 0) {
            items.push({ particulars: "    Laundry Revenue", hsn: "-", amount: formatCurrency(invoice.laundry_taxable_amount), isMain: true });
        }

        // Add blank row separator to shift taxes down a bit
        items.push({ particulars: " ", hsn: " ", amount: " ", isMain: false });

        // Add taxes into the particulars list right-aligned style for visuals
        const taxableAmountNum = Number(invoice.taxable_amount) || 1;
        if (Number(invoice.cgst_amount) > 0 || Number(invoice.sgst_amount) > 0) {
            const cgstRate = Math.round((Number(invoice.cgst_amount) / taxableAmountNum) * 100);
            const sgstRate = Math.round((Number(invoice.sgst_amount) / taxableAmountNum) * 100);
            items.push({ particulars: `CGST Output ${cgstRate}%    `, hsn: "", amount: formatCurrency(invoice.cgst_amount), isMain: false, rightAlign: true });
            items.push({ particulars: `SGST/UTGST Output ${sgstRate}%    `, hsn: "", amount: formatCurrency(invoice.sgst_amount), isMain: false, rightAlign: true });
        }
        if (Number(invoice.igst_amount) > 0) {
            const igstRate = Math.round((Number(invoice.igst_amount) / taxableAmountNum) * 100);
            items.push({ particulars: `IGST Output ${igstRate}%    `, hsn: "", amount: formatCurrency(invoice.igst_amount), isMain: false, rightAlign: true });
        }
        if (Number(invoice.round_off_amount) !== 0) {
            items.push({ particulars: "Round Off", hsn: "", amount: formatCurrency(invoice.round_off_amount), isMain: false, rightAlign: true });
        }

        const tableBody = items.map(item => {
            const pStyles = { fontStyle: item.isMain ? 'bold' : 'normal', halign: item.rightAlign ? 'right' : 'left' };
            const hStyles = { halign: 'center' };
            const aStyles = { halign: 'right', fontStyle: item.isMain ? 'bold' : 'normal' };
            
            if (item.isMonospace) {
                pStyles.font = 'courier';
                pStyles.fontSize = 6.5;
            }

            if (item.padBottom === 0) {
                pStyles.cellPadding = { top: 1.5, right: 1.5, bottom: 0, left: 1.5 };
                hStyles.cellPadding = { top: 1.5, right: 1.5, bottom: 0, left: 1.5 };
                aStyles.cellPadding = { top: 1.5, right: 1.5, bottom: 0, left: 1.5 };
            } else if (item.padTop === 0) {
                pStyles.cellPadding = { top: 0.5, right: 1.5, bottom: 1.5, left: 1.5 };
                hStyles.cellPadding = { top: 0.5, right: 1.5, bottom: 1.5, left: 1.5 };
                aStyles.cellPadding = { top: 0.5, right: 1.5, bottom: 1.5, left: 1.5 };
            }

            return [
                { content: item.particulars, styles: pStyles, hasTopBorder: item.hasTopBorder },
                { content: item.hsn, styles: hStyles, hasTopBorder: item.hasTopBorder },
                { content: item.amount, styles: aStyles, hasTopBorder: item.hasTopBorder }
            ];
        });

        let itemsHeightEstimate = 0;
        tableBody.forEach(row => {
            let maxLines = 1;
            row.forEach(cell => {
                if (cell && typeof cell.content === 'string') {
                    const lines = cell.content.split('\n').length;
                    if (lines > maxLines) maxLines = lines;
                }
            });
            itemsHeightEstimate += maxLines * 4.5; // approx 4.5mm per line
        });
        
        const estimatedTableEnd = y + 8 + itemsHeightEstimate + 8; // head + body + total
        const remainingSpace = 224 - estimatedTableEnd; // 224 is the calculated start of bottom blocks

        if (remainingSpace > 10) {
            tableBody.push([
                { content: ' ', styles: { minCellHeight: remainingSpace } },
                { content: ' ' },
                { content: ' ' }
            ]);
        }

        // We append the Total Row with 3 explicit columns to completely bypass colSpan layout bugs
        tableBody.push([
            { content: 'Total', styles: { halign: 'right', fontStyle: 'normal' } }, 
            { content: '', styles: {} }, 
            { content: `Rs. ${formatCurrency(invoice.grand_total)}`, styles: { halign: 'right', fontStyle: 'bold' } }
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Particulars', 'HSN/SAC', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'normal', lineColor: 0, lineWidth: 0.2, halign: 'center', fontSize: 7 },
            bodyStyles: { textColor: 0, lineColor: 0, valign: 'top', fontSize: 7 },
            columnStyles: {
                0: { cellWidth: 145 },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 25, halign: 'right' }
            },
            willDrawCell: function(data) {
                // Set explicitly object for line width to avoid array bug
                if (data.section === 'body') {
                    // Default for all body cells: vertical borders only
                    // If it's the first row, add top border to seal the header
                    if (data.row.index === 0) {
                        data.cell.styles.lineWidth = { top: 0.2, bottom: 0, left: 0.2, right: 0.2 };
                    } else {
                        data.cell.styles.lineWidth = { top: 0, bottom: 0, left: 0.2, right: 0.2 };
                    }
                }
                
                // For the last row (Total row)
                if (data.section === 'body' && data.row.index === tableBody.length - 1) {
                    data.cell.styles.lineWidth = { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 };
                }
            },
            didDrawCell: function(data) {
                if (data.section === 'body' && data.row.raw[0] && data.row.raw[0].hasTopBorder) {
                    doc.setDrawColor(200, 200, 200); // light gray
                    doc.setLineWidth(0.2);
                    doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
                    doc.setDrawColor(0, 0, 0); // reset back to black for regular table borders
                }
            },
            margin: { left: m, right: m },
            didDrawPage: (data) => { y = data.cursor.y; }
        });

        // Amount Chargeable in words
        const amountWordsHeight = 8;
        doc.rect(m, y, ew, amountWordsHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Amount Chargeable (in words)", m + 2, y + 3.5);
        doc.text("E. & O.E", pw - m - 2, y + 3.5, { align: "right" });
        doc.setFont("helvetica", "bold");
        const correctAmountInWords = invoice.grand_total ? numberToWords(Number(invoice.grand_total)) : (invoice.amount_in_words || "-");
        doc.text(correctAmountInWords, m + 2, y + 6.5);
        y += amountWordsHeight;

        // 5. Tax Breakdown Table
        const taxRate = 12; // Example static
        const halfRate = taxRate / 2;

        const taxBody = [];
        if (Number(invoice.stay_taxable_amount) > 0) {
            taxBody.push([
                "996311",
                formatCurrency(invoice.stay_taxable_amount),
                `${halfRate}%`, formatCurrency(invoice.cgst_amount),
                `${halfRate}%`, formatCurrency(invoice.sgst_amount),
                formatCurrency(invoice.total_tax_amount)
            ]);
        }
        
        // Total row for taxes
        taxBody.push([
            { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatCurrency(invoice.taxable_amount), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: '' },
            { content: formatCurrency(invoice.cgst_amount), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: '' },
            { content: formatCurrency(invoice.sgst_amount), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(invoice.total_tax_amount), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        autoTable(doc, {
            startY: y,
            head: [
                [
                    { content: 'HSN/SAC', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'Taxable\nValue', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'SGST/UTGST', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'Total\nTax Amount', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
                ],
                ['Rate', 'Amount', 'Rate', 'Amount']
            ],
            body: taxBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'normal', lineColor: 0, lineWidth: 0.2, halign: 'center', fontSize: 7 },
            bodyStyles: { textColor: 0, lineColor: 0, lineWidth: 0.2, halign: 'right', fontSize: 7 },
            columnStyles: {
                0: { halign: 'left', cellWidth: 60 },
                1: { halign: 'right', cellWidth: 40 },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right', cellWidth: 23 },
                4: { halign: 'center', cellWidth: 12 },
                5: { halign: 'right', cellWidth: 23 },
                6: { halign: 'right', cellWidth: 20 }
            },
            margin: { left: m, right: m },
            didDrawPage: (data) => { y = data.cursor.y; }
        });

        // 6. Tax Amount in Words & Footer
        const footerHeight = 25;
        doc.rect(m, y, ew, footerHeight);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Tax Amount (in words) : ", m + 2, y + 4);
        doc.setFont("helvetica", "bold");
        const correctTaxAmountInWords = invoice.total_tax_amount ? numberToWords(Number(invoice.total_tax_amount)) : (invoice.tax_amount_in_words || "-");
        doc.text(correctTaxAmountInWords, m + 32, y + 4);

        // Signatory
        doc.setFont("helvetica", "bold");
        doc.text(`for ${(invoice.seller_name || "Hotel").toUpperCase()}`, pw - m - 2, y + 14, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.text("Authorised Signatory", pw - m - 2, y + 22, { align: "right" });

        y += footerHeight;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("This is a Computer Generated Invoice", pw / 2, y + 4, { align: "center" });

        return Buffer.from(doc.output("arraybuffer"));
    }
}

export default new InvoicePdfService();