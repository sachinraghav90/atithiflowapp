import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatAppDateTime } from "@/utils/dateFormat";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

const safeText = (value: any) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && value.trim() === "") return "—";
  return String(value);
};

const isPrintableValue = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "—") return false;
    const cleanVal = trimmed.replace(/[₹\s,]/g, "");
    if (cleanVal === "0" || cleanVal === "0.00" || cleanVal === "0.0" || cleanVal === "-0") return false;
    return true;
  }
  if (typeof val === "number") return val !== 0;
  if (Array.isArray(val)) return val.length > 0 && val.some(isPrintableValue);
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
};

const money = (value: any) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    fontFamily: "Times-Roman",
    backgroundColor: "#ffffff",
    color: "#000000",
  },
  center: {
    textAlign: "center",
  },
  title: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8.5,
    fontFamily: "Times-Bold",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  metaText: {
    fontSize: 8,
    fontFamily: "Times-Roman",
  },
  divider: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#555555",
    borderBottomStyle: "dashed",
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Times-Bold",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3.5,
  },
  detailLabel: {
    fontSize: 8,
    fontFamily: "Times-Bold",
  },
  detailValue: {
    fontSize: 8,
    fontFamily: "Times-Roman",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
  },
  th: {
    fontSize: 8,
    fontFamily: "Times-Bold",
  },
  td: {
    fontSize: 8,
    fontFamily: "Times-Roman",
  },
  right: {
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 8.5,
    fontFamily: "Times-Bold",
  },
  totalValue: {
    fontSize: 8.5,
    fontFamily: "Times-Bold",
  },
  footNote: {
    marginTop: 14,
    fontSize: 7.5,
    fontFamily: "Times-Roman",
    textAlign: "center",
    lineHeight: 1.3,
  },
});

type Props = {
  order: any;
  propertyName?: string;
};

export default function RestaurantOrderSummaryPDF({ order, propertyName }: Props) {
  const orderId = order?.id ? formatModuleDisplayId("order", order.id) : "—";
  const headerTitle = propertyName || "AtithiFlow Hotel";
  const items = Array.isArray(order?.items) ? order.items : [];
  const hasItems = items.length > 0;
  const orderType = order?.order_type || "Restaurant";
  const showGuestName = isPrintableValue(order?.guest_name);
  const showGuestMobile = isPrintableValue(order?.guest_mobile);
  const showBookingId = isPrintableValue(order?.booking_id);
  const showRoom = isPrintableValue(order?.room_no);
  const showTable = orderType === "Restaurant" && isPrintableValue(order?.table_no);
  const showOrderStatus = isPrintableValue(order?.order_status);
  const showPaymentStatus = isPrintableValue(order?.payment_status);
  const showNotes = isPrintableValue(order?.notes);
  const showExpectedDelivery = isPrintableValue(order?.expected_delivery_time);
  const formattedExpectedDelivery = order?.expected_delivery_time ? formatAppDateTime(order.expected_delivery_time) : "";
  const showDeliveryPartner = isPrintableValue(order?.delivery_partner_name);
  const formattedDateTime = safeText(formatAppDateTime(order?.order_date));
  const [datePart, timePart] = String(formattedDateTime).split(" ");
  const modeText = showPaymentStatus ? safeText(order?.payment_status) : "Pending";

  const subtotalAmount = order?.subtotal_amount != null ? Number(order.subtotal_amount) : Number(order?.total_amount || 0);
  const gstRate = order?.gst_rate != null ? Number(order.gst_rate) : 0;
  const cgstRate = order?.cgst_rate != null ? Number(order.cgst_rate) : 0;
  const sgstRate = order?.sgst_rate != null ? Number(order.sgst_rate) : 0;
  const cgstAmount = order?.cgst_amount != null ? Number(order.cgst_amount) : 0;
  const sgstAmount = order?.sgst_amount != null ? Number(order.sgst_amount) : 0;
  const grandTotalAmount = order?.grand_total_amount != null ? Number(order.grand_total_amount) : Number(order?.total_amount || 0);

  // Calculate dynamic page height to fit the content perfectly without empty trailing space.
  let dynamicHeight = 260; // base height (margins + headers + first 3 meta rows + totals + payment status + footnote)
  if (showGuestMobile || showBookingId) dynamicHeight += 14;
  if (showExpectedDelivery || showDeliveryPartner) dynamicHeight += 14;
  if (hasItems) {
    dynamicHeight += 38; // table header, borders
    dynamicHeight += items.length * 18; // height per item row
  }
  if (showOrderStatus) dynamicHeight += 14;
  if (showNotes) {
    const notesStr = String(order?.notes || "");
    const lines = Math.max(1, Math.ceil(notesStr.length / 32));
    dynamicHeight += 12 + (lines * 12);
  }

  return (
    <Document>
      <Page size={[226, dynamicHeight]} style={styles.page}>
        <Text style={[styles.center, styles.title]}>{headerTitle}</Text>
        <Text style={[styles.center, styles.subtitle]}>Original Receipt</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{"Date:  " + safeText(datePart)}</Text>
          <Text style={styles.metaText}>{"Time:  " + safeText(timePart)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{"Order:  " + safeText(orderId)}</Text>
          {orderType === "Restaurant" && showTable ? (
            <Text style={styles.metaText}>{"Table:  " + safeText(order?.table_no)}</Text>
          ) : orderType === "Room Service" && showRoom ? (
            <Text style={styles.metaText}>{"Room:  " + safeText(order?.room_no)}</Text>
          ) : (
            <Text style={styles.metaText}></Text>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{"Type:  " + safeText(orderType)}</Text>
          {showGuestName ? (
            <Text style={styles.metaText}>{"Guest:  " + safeText(order?.guest_name)}</Text>
          ) : (
            <Text style={styles.metaText}></Text>
          )}
        </View>
        {(showGuestMobile || showBookingId) && (
          <View style={styles.metaRow}>
            {showGuestMobile ? (
              <Text style={styles.metaText}>{"Mobile:  " + safeText(order?.guest_mobile)}</Text>
            ) : (
              <Text style={styles.metaText}></Text>
            )}
            {showBookingId ? (
              <Text style={styles.metaText}>{"Booking:  " + safeText(formatModuleDisplayId("booking", order.booking_id))}</Text>
            ) : (
              <Text style={styles.metaText}></Text>
            )}
          </View>
        )}
        {(showExpectedDelivery || showDeliveryPartner) && (
          <View style={styles.metaRow}>
            {showExpectedDelivery ? (
              <Text style={styles.metaText}>{"Exp Delivery:  " + safeText(formattedExpectedDelivery)}</Text>
            ) : (
              <Text style={styles.metaText}></Text>
            )}
            {showDeliveryPartner ? (
              <Text style={styles.metaText}>{"Delivery:  " + safeText(order?.delivery_partner_name)}</Text>
            ) : (
              <Text style={styles.metaText}></Text>
            )}
          </View>
        )}
        <View style={styles.divider} />

        {hasItems && (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2.2 }]}>Description</Text>
              <Text style={[styles.th, styles.right, { flex: 0.7 }]}>Qty</Text>
              <Text style={[styles.th, styles.right, { flex: 1 }]}>Price</Text>
              <Text style={[styles.th, styles.right, { flex: 1.1 }]}>Subtotal</Text>
            </View>
            <View style={styles.divider} />
            {items.map((item: any, idx: number) => (
              <View key={item?.id || idx} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 2.2 }]}>{safeText(item?.item_name)}</Text>
                <Text style={[styles.td, styles.right, { flex: 0.7 }]}>{safeText(item?.quantity)}</Text>
                <Text style={[styles.td, styles.right, { flex: 1 }]}>{money(item?.unit_price)}</Text>
                <Text style={[styles.td, styles.right, { flex: 1.1 }]}>{money(item?.item_total)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
          </>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Sub Total:</Text>
          <Text style={styles.totalValue}>{money(subtotalAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{`CGST (${cgstRate}%):`}</Text>
          <Text style={styles.totalValue}>{money(cgstAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{`SGST (${sgstRate}%):`}</Text>
          <Text style={styles.totalValue}>{money(sgstAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{money(grandTotalAmount)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>PAYMENT STATUS:</Text>
          <Text style={styles.detailValue}>{modeText}</Text>
        </View>
        {showOrderStatus && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>STATUS:</Text>
            <Text style={styles.detailValue}>{safeText(order?.order_status)}</Text>
          </View>
        )}
        {showNotes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>NOTE:</Text>
            <Text style={styles.detailValue}>{safeText(order?.notes)}</Text>
          </View>
        )}

        <Text style={styles.footNote}>SAVE PAPER SAVE NATURE !!{"\n"}Thank you for a delicious meal</Text>
      </Page>
    </Document>
  );
}
