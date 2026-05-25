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
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    fontFamily: "Courier",
    backgroundColor: "#ffffff",
    color: "#000000",
  },
  center: {
    textAlign: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  metaText: {
    fontSize: 9,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "dashed",
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "bold",
  },
  detailValue: { fontSize: 9 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  th: {
    fontSize: 9,
    fontWeight: "bold",
  },
  td: {
    fontSize: 9,
  },
  right: {
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  footNote: {
    marginTop: 10,
    fontSize: 9,
    textAlign: "center",
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
  const showTable = orderType === "Restaurant" || isPrintableValue(order?.table_no);
  const showOrderStatus = isPrintableValue(order?.order_status);
  const showPaymentStatus = isPrintableValue(order?.payment_status);
  const showNotes = isPrintableValue(order?.notes);
  const formattedDateTime = safeText(formatAppDateTime(order?.order_date));
  const [datePart, timePart] = String(formattedDateTime).split(" ");
  const modeText = showPaymentStatus ? safeText(order?.payment_status) : "Pending";

  return (
    <Document>
      <Page size={[226, 600]} style={styles.page}>
        <Text style={[styles.center, styles.title]}>{headerTitle}</Text>
        <Text style={[styles.center, styles.subtitle]}>Original Receipt</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Date:{safeText(datePart)}</Text>
          <Text style={styles.metaText}>Time:{safeText(timePart)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Order:{safeText(orderId)}</Text>
          <Text style={styles.metaText}>{showTable ? `Table:${safeText(order?.table_no)}` : `Room:${safeText(order?.room_no)}`}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Type:{safeText(orderType)}</Text>
          {showGuestName && <Text style={styles.metaText}>Guest:{safeText(order?.guest_name)}</Text>}
        </View>
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
          <Text style={styles.totalValue}>{money(order?.total_amount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>CGST (0%):</Text>
          <Text style={styles.totalValue}>0.00</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>SGST (0%):</Text>
          <Text style={styles.totalValue}>0.00</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{money(order?.total_amount)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>MODE:</Text>
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
