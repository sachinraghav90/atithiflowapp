import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image
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
    paddingBottom: 60,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
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
    textAlign: "center",
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
    borderBottomColor: "#475569",
    paddingBottom: 4,
    marginTop: 0,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#475569",
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
    borderBottomColor: "#e2e8f0",
    paddingBottom: 2,
    marginRight: 8,
  },
  col12: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  label: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0369a1",
    width: "35%",
  },
  value: {
    fontSize: 9,
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
    fontSize: 10,
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
    borderColor: "#475569",
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
    width: "32%",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 2,
    marginBottom: 4,
  },
  infoItem4Col: {
    width: "24%",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 2,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    color: "#1e293b",
    flexWrap: "wrap",
  },
  commentsBox: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  commentsLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 2,
  },
  commentsValue: {
    fontSize: 8.5,
    color: "#475569",
    lineHeight: 1.2,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0369a1",
    flex: 1,
  },
  tableHeaderCellRight: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0369a1",
    flex: 1,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
  },
  tableCell: {
    fontSize: 9,
    color: "#334155",
    flex: 1,
    flexWrap: "wrap",
  },
  tableCellRight: {
    fontSize: 9,
    color: "#0f172a",
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
    flexWrap: "wrap",
  },
  noDataText: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
  },
  billingTable: {
    borderWidth: 1,
    borderColor: "#475569",
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
    borderBottomColor: "#475569",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  billingRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  billingRowHighlight: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  billingRowGrandTotal: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  billingRowBalance: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 2,
    borderTopColor: "#0f172a",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  billingLabel: {
    fontSize: 9,
    color: "#334155",
    flex: 2,
  },
  billingLabelHighlight: {
    fontSize: 9,
    color: "#1e293b",
    fontWeight: "bold",
    flex: 2,
  },
  billingLabelGrandTotal: {
    fontSize: 9,
    color: "#0f172a",
    fontWeight: "bold",
    flex: 2,
  },
  billingLabelBalance: {
    fontSize: 10,
    color: "#0f172a",
    fontWeight: "bold",
    flex: 2,
  },
  billingValue: {
    fontSize: 9,
    color: "#0f172a",
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
  },
  billingValueDiscount: {
    fontSize: 9,
    color: "#047857",
    flex: 1,
    textAlign: "right",
  },
  billingValueBalance: {
    fontSize: 10,
    color: "#0f172a",
    fontWeight: "bold",
    flex: 1,
    textAlign: "right",
  },
  sectionContainer: {
    marginTop: 0,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: "#475569",
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
    .replace(/\r?\n|\r/g, "")
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
    .replace(/\n{2,}/g, "\n")
    .trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {property?.logo_mime && (
              <Image 
                src={{
                  uri: `${import.meta.env.VITE_API_URL}/properties/${property.id}/logo`,
                  method: "GET",
                  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
                }}
                style={{ width: 40, height: 40, marginRight: 8, objectFit: "contain" }} 
              />
            )}
            <Text style={styles.propertyTitle}>{propertyBrandName}</Text>
          </View>
          <View style={styles.bookingIdBox}>
            <Text style={styles.bookingId}>BOOKING #{formattedBookingId}</Text>
            <Text style={styles.statusBadge}>{bookingStatus}</Text>
          </View>
        </View>

        {/* Side-by-Side Booking & Rooms */}
      
        <View style={styles.gridRow}>
          {/* Booking Info */}
          <View style={!booking?.has_guest_image ? { width: "100%" } : { flex: 1, marginRight: 16 }}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={[styles.infoCard, styles.sideBySideCardCompact, { minHeight: 0, height: 110 }]}>
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

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Rooms</Text>
                  <Text style={styles.infoValue}>
                    {hasData(booking?.rooms) ? booking.rooms.map((room: any) => getRoomDisplayData(room.room_no, allRoomsMeta).roomNo).join(", ") : "—"}
                  </Text>
                </View>
              </View>
            </View>
            </View>
          </View>

          {/* Guest Photo */}
          {booking?.has_guest_image && (
          <View style={{ width: 95 }}>
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { textAlign: "center" }]}>Photo</Text>
              <View style={[styles.infoCard, { padding: 0, overflow: "hidden", minHeight: 0, height: 110 }]}>
                <Image 
                  src={{
                    uri: `${import.meta.env.VITE_API_URL}/bookings/${booking.id}/guest-image`,
                    method: "GET",
                    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
                  }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              </View>
            </View>
          </View>
          )}
        </View>

        {/* Guests Details */}
        {hasData(guests) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Guests Details</Text>
            
            {/* Primary Guest Card */}
            {guests.length > 0 && (() => {
              const g = guests[0];
              const fullName = `${g.salutation || ""} ${g.first_name || ""} ${g.middle_name || ""} ${g.last_name || ""}`.replace(/\s+/g, " ").trim();
              return (
                <View style={[styles.infoCard, guests.length === 1 ? { marginBottom: 12 } : { marginBottom: 8 }]}>
                  <View style={styles.guestNameBox}>
                    <View style={styles.guestDot} />
                    <Text style={styles.guestName}>{fullName}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{safeText(g.phone)}</Text>
                    </View>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{safeText(g.email)}</Text>
                    </View>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Gender / Age</Text>
                      <Text style={styles.infoValue}>
                        {safeText(g.gender)} {g.age ? `/ ${g.age} yrs` : ""}
                      </Text>
                    </View>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Nationality</Text>
                      <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>{safeText(g.nationality)}</Text>
                    </View>

                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>ID Proof</Text>
                      <Text style={styles.infoValue}>
                        {safeText(g.id_type)} {g.id_number ? `(${g.id_number})` : ""}
                      </Text>
                    </View>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Coming From</Text>
                      <Text style={styles.infoValue}>{safeText(g.coming_from)}</Text>
                    </View>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Going To</Text>
                      <Text style={styles.infoValue}>{safeText(g.going_to)}</Text>
                    </View>
                    <View style={styles.infoItem4Col}>
                      <Text style={styles.infoLabel}>Emergency Contact</Text>
                      <Text style={styles.infoValue}>
                        {g.emergency_contact_name ? `${g.emergency_contact_name}\n` : ""}
                        {safeText(g.emergency_contact)}
                      </Text>
                    </View>

                  {isPrintableValue(g.address) && (
                    <View style={[styles.infoItem, { width: "100%" }]}>
                      <Text style={styles.infoLabel}>Address</Text>
                      <Text style={styles.infoValue}>{safeText(g.address)}</Text>
                    </View>
                  )}
                  </View>
                </View>
              );
            })()}

            {/* Additional Guests Grid */}
            {guests.length > 1 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Additional Guest Details</Text>
                <View style={[styles.card, { padding: 0 }]}>
                  <View style={styles.table}>
                    <View style={[styles.tableHeader, { paddingTop: 8, paddingHorizontal: 8 }]}>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Name</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Gender / Age</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ID Type</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>ID Number</Text>
                    </View>
                    {guests.slice(1).map((g: any, index: number) => {
                      const fullName = `${g.salutation || ""} ${g.first_name || ""} ${g.middle_name || ""} ${g.last_name || ""}`.replace(/\s+/g, " ").trim();
                      const isLast = index === guests.length - 2;
                      return (
                        <View key={g.id || index} style={[styles.tableRow, { paddingHorizontal: 8 }, isLast && { borderBottomWidth: 0, paddingBottom: 8 }]}>
                          <Text style={[styles.tableCell, { flex: 1.5 }]}>{fullName}</Text>
                          <Text style={[styles.tableCell, { flex: 1 }]}>
                            {safeText(g.gender)} {g.age ? `/ ${g.age} yrs` : ""}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1 }]}>{safeText(g.id_type)}</Text>
                          <Text style={[styles.tableCell, { flex: 1.2 }]}>{safeText(g.id_number)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Vehicles */}
        {hasData(vehicles) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={[styles.infoCard, { padding: 6 }]}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Type</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Vehicle No.</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Phone</Text>
                </View>
                {vehicles.map((v: any, index: number) => (
                  <View key={v.id || index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 0.8, paddingRight: 4 }]}>
                      {safeText(v.vehicle_type)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2, paddingRight: 4 }]}>
                      {safeText(v.vehicle_name)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5, paddingRight: 4 }]}>
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
        )}

        {!!instructionsPlainText && (
          <View style={[styles.sectionContainer, { marginTop: 12, borderTopWidth: 1, borderTopColor: "#475569", paddingTop: 8 }]}>
            <Text style={[styles.commentsValue, { fontSize: 8, lineHeight: 1.5, fontWeight: "bold", marginBottom: 2 }]}>
              Note :
            </Text>
            <Text style={[styles.commentsValue, { fontSize: 8, lineHeight: 1.5 }]}>
              {instructionsPlainText}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.propertyAddress}>{safeText(propertyAddress)}</Text>
        </View>
      </Page>
    </Document>
  );
}
