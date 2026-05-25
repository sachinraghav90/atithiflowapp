import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { formatAppDate } from "@/utils/dateUtils";

// Helper Functions
const safeText = (value: any) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && value.trim() === "") return "—";
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(String).join(", ") || "—";
    }
    const flattened = [
      value.address_line_1,
      value.address_line_2,
      value.city,
      value.state,
      value.postal_code,
      value.country,
    ]
      .filter(Boolean)
      .join(", ");
    return flattened || "—";
  }
  return value;
};

const money = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
};

const formatDate = (value: any) => {
  if (!value) return "—";
  const dateObj = new Date(value);
  if (isNaN(dateObj.getTime())) return "—";
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = String(dateObj.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
};

const hasData = (value: any) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null)
    return Object.keys(value).length > 0;
  return false;
};

const getRoomDisplayData = (roomNo: any, allRoomsMeta: any) => {
  if (!allRoomsMeta || !Array.isArray(allRoomsMeta))
    return { roomNo: "-", floorName: "Floor 1", bedType: "King", category: "Deluxe" };

  const room = allRoomsMeta.find((r: any) => r.room_no === roomNo);

  return {
    roomNo: room?.room_no ?? "-",
    floorName: room?.floor_number ? `Floor ${room.floor_number}` : "Floor 1",
    bedType: room?.bed_type_name?.split(" ")?.[0] ?? "King",
    category: room?.room_category_name ?? room?.room_type ?? "Deluxe",
  };
};

const isPrintableValue = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "—") return false;
    const cleanVal = trimmed.replace(/[₹\s,]/g, "");
    if (
      cleanVal === "0" ||
      cleanVal === "0.00" ||
      cleanVal === "0.0" ||
      cleanVal === "-0"
    )
      return false;
    return true;
  }
  if (typeof val === "number") {
    return val !== 0;
  }
  if (Array.isArray(val)) {
    return val.length > 0 && val.some(isPrintableValue);
  }
  if (typeof val === "object") {
    return (
      Object.keys(val).length > 0 && Object.values(val).some(isPrintableValue)
    );
  }
  return false;
};

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
    paddingBottom: 8,
    marginBottom: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  propertyAddress: {
    fontSize: 8,
    color: "#0284c7",
    fontWeight: "bold",
    marginTop: 2,
    letterSpacing: 0,
    textTransform: "none",
  },
  bookingIdBox: {
    alignItems: "flex-end",
  },
  bookingId: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },
  statusBadge: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0,
    textTransform: "none",
    color: "#0284c7",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
    paddingBottom: 4,
    marginTop: 0,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e0f2fe",
    borderRadius: 6,
    padding: 8,
    marginTop: 0,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  col6: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 2,
    marginRight: 8,
  },
  col12: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  label: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#0369a1",
    width: "35%",
  },
  value: {
    fontSize: 8,
    color: "#1e293b",
    width: "65%",
    textAlign: "right",
  },
  guestNameBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  guestDot: {
    width: 4,
    height: 4,
    backgroundColor: "#0ea5e9",
    borderRadius: 2,
    marginRight: 4,
  },
  guestName: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  gridCol7: {
    width: "58.5%",
  },
  gridCol5: {
    width: "40.5%",
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#e0f2fe",
    borderRadius: 6,
    padding: 8,
    marginTop: 0,
    marginBottom: 12,
    minHeight: 120,
    backgroundColor: "#ffffff",
  },
  sideBySideCardCompact: {
    padding: 6,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem: {
    width: "48%",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 2,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 8,
    color: "#1e293b",
  },
  commentsBox: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  commentsLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 2,
  },
  commentsValue: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.2,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#0369a1",
    flex: 1,
  },
  tableHeaderCellRight: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#0369a1",
    flex: 1,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
  },
  tableCell: {
    fontSize: 8,
    color: "#334155",
    flex: 1,
  },
  tableCellRight: {
    fontSize: 8,
    color: "#0f172a",
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
  },
  noDataText: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
  },
  billingTable: {
    borderWidth: 1,
    borderColor: "#e0f2fe",
    borderRadius: 6,
    padding: 0,
    marginTop: 0,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  billingHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  billingRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  billingRowHighlight: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  billingRowGrandTotal: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  billingRowBalance: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  billingLabel: {
    fontSize: 8,
    color: "#334155",
    flex: 2,
  },
  billingLabelHighlight: {
    fontSize: 8,
    color: "#1e293b",
    fontWeight: "bold",
    flex: 2,
  },
  billingLabelGrandTotal: {
    fontSize: 8,
    color: "#0f172a",
    fontWeight: "bold",
    flex: 2,
  },
  billingLabelBalance: {
    fontSize: 9,
    color: "#ffffff",
    fontWeight: "bold",
    flex: 2,
  },
  billingValue: {
    fontSize: 8,
    color: "#0f172a",
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
  },
  billingValueDiscount: {
    fontSize: 8,
    color: "#047857",
    flex: 1,
    textAlign: "right",
  },
  billingValueBalance: {
    fontSize: 9,
    color: "#ffffff",
    fontWeight: "bold",
    flex: 1,
    textAlign: "right",
  },
  sectionContainer: {
    marginTop: 0,
    marginBottom: 8,
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 6,
    color: "#94a3b8",
    textAlign: "center",
  },
});

type Props = {
  booking: any;
  guests: any[];
  vehicles: any[];
  payments: any[];
  property: any;
  allRoomsMeta: any[];
  bookingInstructions?: string;
};

export default function BookingSummaryPDF({
  booking,
  guests,
  vehicles,
  payments,
  property,
  allRoomsMeta,
  bookingInstructions,
}: Props) {
  const propertyBrandName =
    property?.brand_name || property?.name || "AtithiFlow Hotel";
 const propertyAddress = [
  property?.address_line_1,
  property?.address_line_2,
  property?.city,
  property?.state,
  property?.postal_code,
  property?.country,
]
  .filter(Boolean) // remove null/undefined/empty values
  .join(", ");
  const displayBookingId = String(booking?.id || "").padStart(3, "0");
  const formattedBookingId = booking?.booking_no || `BO${displayBookingId}`;
  const bookingStatus = (booking?.booking_status || "").replace("_", " ");

  const baseAmt = +(booking?.price_before_tax || 0);
  const discAmt = +(booking?.discount_amount || 0);
  const roomTaxAmt = +(booking?.room_tax_amount || 0);
  const gstAmt = +(booking?.gst_amount || 0);
  const finalRoomAmt = +(booking?.final_amount || 0);
  const restTotalAmt = +(booking?.restaurant_total_amount || 0);
  const grandTotalAmt = finalRoomAmt + restTotalAmt;
  const paidAmt = +(booking?.paid_amount || 0);
  const restPaidAmt = +(booking?.restaurant_paid_amount || 0);
  const totalPaidAmt = paidAmt + restPaidAmt;
  const remainingBalanceAmt = grandTotalAmt - totalPaidAmt;

  const formatReadableLabel = (value: string) => {
    if (!value) return "—";
    return value
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const instructionsPlainText = (bookingInstructions || "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/(h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.propertyTitle}>{propertyBrandName}</Text>
            <Text style={styles.propertyAddress}>{safeText(propertyAddress)}</Text>
          </View>
          <View style={styles.bookingIdBox}>
            <Text style={styles.bookingId}>BOOKING #{formattedBookingId}</Text>
            <Text style={styles.statusBadge}>{bookingStatus}</Text>
          </View>
        </View>

        {/* Side-by-Side Booking & Rooms */}
      
        <View style={styles.gridRow}>
          {/* Booking Info */}
          <View style={styles.gridCol7}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={[styles.infoCard, styles.sideBySideCardCompact]}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Primary Guest</Text>
                  <Text style={styles.infoValue}>
                    {`${booking?.primary_guest?.first_name || ""} ${booking?.primary_guest?.last_name || ""}`.trim() || "—"}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Guest Phone</Text>
                  <Text style={styles.infoValue}>
                    {safeText(booking?.primary_guest?.phone)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Booking Source</Text>
                  <Text style={styles.infoValue}>
                    {formatReadableLabel(booking?.booking_type)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Adults / Children</Text>
                  <Text style={styles.infoValue}>
                    {booking?.adult || 0} A / {booking?.child || 0} C
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Arrival Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(booking?.estimated_arrival)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Departure Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(booking?.estimated_departure)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Total Nights</Text>
                  <Text style={styles.infoValue}>
                    {booking?.booking_nights || 0} nights
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Booking Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(booking?.booking_date)}
                  </Text>
                </View>
              </View>

              {isPrintableValue(booking?.comments) && (
                <View style={styles.commentsBox}>
                  <Text style={styles.commentsLabel}>Comments</Text>
                  <Text style={styles.commentsValue}>
                    {safeText(booking?.comments)}
                  </Text>
                </View>
              )}
            </View>
            </View>
          </View>

          {/* Rooms Info */}
          <View style={styles.gridCol5}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Rooms</Text>
            <View style={[styles.infoCard, styles.sideBySideCardCompact]}>
              {hasData(booking?.rooms) ? (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                      Room No
                    </Text>
                    <Text style={styles.tableHeaderCell}>Floor</Text>
                    <Text style={styles.tableHeaderCell}>Bed</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                      Category
                    </Text>
                  </View>
                  {booking.rooms.map((room: any, index: number) => {
                    const ui = getRoomDisplayData(room.room_no, allRoomsMeta);
                    return (
                      <View key={room.room_id || index} style={styles.tableRow}>
                        <Text
                          style={[
                            styles.tableCell,
                            { flex: 1.2, fontWeight: "bold", color: "#0f172a" },
                          ]}
                        >
                          {ui.roomNo}
                        </Text>
                        <Text style={styles.tableCell}>{ui.floorName}</Text>
                        <Text style={styles.tableCell}>{ui.bedType}</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>
                          {ui.category}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noDataText}>No Rooms Assigned</Text>
              )}
            </View>
            </View>
          </View>
        </View>

        {/* Guests Details */}
        {hasData(guests) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Guests Details</Text>
            {guests.map((g: any, index: number) => {
              const fullName = `${g.salutation || ""} ${g.first_name || ""} ${g.middle_name || ""} ${g.last_name || ""}`
                .replace(/\s+/g, " ")
                .trim();
              const isLastGuest = index === guests.length - 1;
              return (
                <View
                  key={g.id || index}
                  style={[styles.card, isLastGuest ? { marginBottom: 12 } : null]}
                >
                  <View style={styles.guestNameBox}>
                    <View style={styles.guestDot} />
                    <Text style={styles.guestName}>{fullName}</Text>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col6}>
                      <Text style={styles.label}>Phone</Text>
                      <Text style={styles.value}>{safeText(g.phone)}</Text>
                    </View>
                    <View style={[styles.col6, { marginRight: 0 }]}>
                      <Text style={styles.label}>Email</Text>
                      <Text style={styles.value}>{safeText(g.email)}</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col6}>
                      <Text style={styles.label}>Gender / Age</Text>
                      <Text style={styles.value}>
                        {safeText(g.gender)} {g.age ? `/ ${g.age} yrs` : ""}
                      </Text>
                    </View>
                    <View style={[styles.col6, { marginRight: 0 }]}>
                      <Text style={styles.label}>Nationality</Text>
                      <Text style={styles.value}>{safeText(g.nationality)}</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col6}>
                      <Text style={styles.label}>ID Proof</Text>
                      <Text style={styles.value}>
                        {safeText(g.id_type)}{" "}
                        {g.id_number ? `(${g.id_number})` : ""}
                      </Text>
                    </View>
                    <View style={[styles.col6, { marginRight: 0 }]}>
                      <Text style={styles.label}>Coming From</Text>
                      <Text style={styles.value}>{safeText(g.coming_from)}</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col6}>
                      <Text style={styles.label}>Going To</Text>
                      <Text style={styles.value}>{safeText(g.going_to)}</Text>
                    </View>
                    <View style={[styles.col6, { marginRight: 0 }]}>
                      <Text style={styles.label}>Emergency</Text>
                      <Text style={styles.value}>
                        {g.emergency_contact_name
                          ? `${g.emergency_contact_name} - `
                          : ""}
                        {safeText(g.emergency_contact)}
                      </Text>
                    </View>
                  </View>

                  {isPrintableValue(g.address) && (
                    <View style={styles.col12}>
                      <Text style={[styles.label, { width: "17%" }]}>
                        Address
                      </Text>
                      <Text style={[styles.value, { width: "83%" }]}>
                        {safeText(g.address)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Side-by-Side Payments and Vehicles */}
        {(hasData(payments) || hasData(vehicles)) && (
          <View style={styles.gridRow}>
            {/* Payments */}
            {hasData(payments) ? (
              <View style={[styles.gridCol5, !hasData(vehicles) ? { width: "100%" } : { width: "48%" }]}>
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Payments</Text>
                <View style={[styles.card, styles.sideBySideCardCompact]}>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Method</Text>
                      <Text style={styles.tableHeaderCellRight}>Amount</Text>
                    </View>
                    {payments.map((p: any, index: number) => (
                      <View key={p.id || index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>
                          {formatDate(p.payment_date || p.created_at)}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>
                          {safeText(p.payment_method)}
                        </Text>
                        <Text style={styles.tableCellRight}>
                          Rs {money(p.paid_amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            ) : (
              <View style={hasData(vehicles) ? { width: "0%" } : undefined} />
            )}

            {/* Vehicles */}
            {hasData(vehicles) && (
              <View style={[styles.gridCol5, !hasData(payments) ? { width: "100%" } : { width: "48%" }]}>
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Vehicle Details</Text>
                <View style={[styles.card, styles.sideBySideCardCompact]}>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Type</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Name</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Number</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Phone</Text>
                    </View>
                    {vehicles.map((v: any, index: number) => (
                      <View key={v.id || index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1.2 }]}>
                          {safeText(v.vehicle_type)}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1.2 }]}>
                          {safeText(v.vehicle_name)}
                        </Text>
                        <Text style={[styles.tableCell, { fontWeight: "bold", flex: 1.5 }]}>
                          {safeText(v.vehicle_number)}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>
                          {safeText(v.phone)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            )}
          </View>
        )}

        {/* Billing & Financial Summary */}
        <View style={[styles.sectionContainer]}>
          <Text style={styles.sectionTitle}>Billing Summary</Text>
          <View style={styles.billingTable}>
            <View style={styles.billingHeaderRow}>
              <Text style={styles.tableHeaderCell}>Billing Item</Text>
              <Text style={styles.tableHeaderCellRight}>Amount</Text>
            </View>

            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>
                Base Room Rent (Before Tax)
              </Text>
              <Text style={styles.billingValue}>Rs {money(baseAmt)}</Text>
            </View>

            {isPrintableValue(discAmt) && (
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>
                  Discount (
                  {booking?.discount_type === "PERCENTAGE"
                    ? `${booking.discount}%`
                    : "Flat"}
                  )
                </Text>
                <Text style={styles.billingValueDiscount}>
                  - Rs {money(discAmt)}
                </Text>
              </View>
            )}

            {isPrintableValue(booking?.price_after_discount) && (
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>
                  Room Rent (After Discount)
                </Text>
                <Text style={styles.billingValue}>
                  Rs {money(booking.price_after_discount)}
                </Text>
              </View>
            )}

            {isPrintableValue(gstAmt) && (
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>GST Amount</Text>
                <Text style={styles.billingValue}>Rs {money(gstAmt)}</Text>
              </View>
            )}

            {isPrintableValue(roomTaxAmt) && (
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Other Room Taxes</Text>
                <Text style={styles.billingValue}>Rs {money(roomTaxAmt)}</Text>
              </View>
            )}

            <View style={styles.billingRowHighlight}>
              <Text style={styles.billingLabelHighlight}>
                Total Room Booking Amount (A)
              </Text>
              <Text style={styles.billingValue}>Rs {money(finalRoomAmt)}</Text>
            </View>

            {isPrintableValue(restTotalAmt) && (
              <View style={styles.billingRowHighlight}>
                <Text style={styles.billingLabelHighlight}>
                  Restaurant Services (B)
                </Text>
                <Text style={styles.billingValue}>
                  Rs {money(restTotalAmt)}
                </Text>
              </View>
            )}

            <View style={styles.billingRowGrandTotal}>
              <Text style={styles.billingLabelGrandTotal}>
                Grand Total (A + B)
              </Text>
              <Text style={styles.billingValue}>Rs {money(grandTotalAmt)}</Text>
            </View>

            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Total Paid Amount</Text>
              <Text style={styles.billingValue}>Rs {money(totalPaidAmt)}</Text>
            </View>

            <View style={styles.billingRowBalance}>
              <Text style={styles.billingLabelBalance}>Remaining Balance</Text>
              <Text style={styles.billingValueBalance}>
                Rs {money(Math.abs(remainingBalanceAmt))}
              </Text>
            </View>
          </View>
        </View>

        {!!instructionsPlainText && (
          <View style={styles.sectionContainer} break>
            <Text style={styles.sectionTitle}>Booking Instructions</Text>
            <View style={styles.card}>
              <Text style={[styles.commentsValue, { fontSize: 8, lineHeight: 1.5 }]}>
                {instructionsPlainText}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
       
      </Page>
    </Document>
  );
}
