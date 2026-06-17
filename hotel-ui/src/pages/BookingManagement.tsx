import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarRangePicker, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


import { pdf } from "@react-pdf/renderer";
import BookingSummaryPDF from "@/components/pdf/BookingSummaryPDF";
import ChangeRoomModal from "@/components/booking/ChangeRoomModal";
import { toast } from "react-toastify";
import {
    useCancelBookingMutation,
    useGetAllRoomsMetaQuery,
    useGetBookingByIdQuery,
    useGetBookingsQuery,
    useGetMyPropertiesQuery,
    useLazyExportBookingsQuery,
    useUpdateBookingMutation,
    useGetGuestsByBookingQuery,
    useGetVehiclesByBookingQuery,
    useGetPaymentsByBookingIdQuery,
    useGetPropertyByIdQuery,
    useUpdatePropertiesMutation,
    useGetLogsByTableQuery,
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { useAppSelector } from "@/redux/hook";
import { selectCanManagePropertySettings, selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useNavigate, useLocation } from "react-router-dom";
import GuestsEmbedded from "@/components/layout/GuestsEmbedded";
import VehiclesEmbedded from "@/components/layout/VehiclesEmbedded";
import PaymentsEmbedded from "@/components/layout/PaymentEmbedded";
import { formatToDDMMYY } from "@/utils/formatToDDMMYY";
import LaundryEmbedded from "@/components/layout/LaundryEmbedded";
import BookingLogsEmbedded from "@/components/layout/BookingLogsEmbedded";
import RestaurantOrdersEmbedded from "@/components/layout/RestaurantOrdersEmbedded";
import { Copy, Download, Eye, FilterX, Plus, RefreshCcw, HelpCircle, Printer, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { formatAppDate, parseAppDate, toISODateOnly, formatAppDateTime } from "@/utils/dateFormat";
import { formatReadableLabel } from "@/utils/formatString";
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { getFormattedAuditChanges, getAuditActionBadge, getAuditChangePlainText, formatAuditActionText } from "@/utils/auditUtils";
import { exportToExcel } from "@/utils/exportToExcel";



const UPDATABLE_STATUSES = [
    "CHECKED_IN",
    "CHECKED_OUT",
    "NO_SHOW",
];

const BOOKING_STATUSES = [
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "NO_SHOW",
    "CANCELLED"
] as const;

const normalizeBookingStatus = (value?: string) =>
    value?.trim().toUpperCase().replace(/\s+/g, "_") || "";

const buildStatusTimestamp = (timeValue: string) => {
    const [hours, minutes] = timeValue.split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return "";
    }

    const timestamp = new Date();
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp.toISOString();
};


const parseDate = (value?: string) =>
    parseAppDate(value);

const formatDate = (date: Date | null) => {
    return toISODateOnly(date);
};

const getCurrentTimeHHMM = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const BOOKING_INSTRUCTIONS_WORD_LIMIT = 4000;

const getWordCountFromHtml = (value: string) => {
    if (!value) return 0;
    const plainText = value
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .trim();
    if (!plainText) return 0;
    return plainText.split(/\s+/).filter(Boolean).length;
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
    if (typeof val === "number") {
        return val !== 0;
    }
    if (Array.isArray(val)) {
        return val.length > 0 && val.some(isPrintableValue);
    }
    if (typeof val === "object") {
        return Object.keys(val).length > 0 && Object.values(val).some(isPrintableValue);
    }
    return true;
};

const hasPrintableData = (obj: any): boolean => {
    if (!obj) return false;
    if (Array.isArray(obj)) {
        return obj.length > 0 && obj.some(item => hasPrintableData(item));
    }
    if (typeof obj === "object") {
        return Object.entries(obj).some(([key, val]) => {
            if (["id", "bookingId", "booking_id", "property_id", "temp_key", "is_active", "created_by", "created_on", "updated_by", "updated_on"].includes(key)) {
                return false;
            }
            return isPrintableValue(val);
        });
    }
    return isPrintableValue(obj);
};

const SUMMARY_TABS = [
    { id: "summary", label: "Summary" },
    { id: "rooms", label: "Rooms" },
    { id: "guests", label: "Guests" },
    { id: "vehicles", label: "Vehicles" },
    { id: "payments", label: "Payments" },
    { id: "laundry", label: "Laundry" },
    { id: "orders", label: "Restaurant Orders" },
    { id: "logs", label: "Logs" },
];

export default function BookingsManagement() {

    const todayISO = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return toISODateOnly(d);
    };

    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return toISODateOnly(d);
    };

    const [propertyId, setPropertyId] = useState<number | undefined>();
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [arrivalFrom, setArrivalFrom] = useState<string>("");
    const [arrivalTo, setArrivalTo] = useState<string>("");
    const [departureFrom, setDepartureFrom] = useState<string>("");
    const [departureTo, setDepartureTo] = useState<string>("");
    const [scope, setScope] = useState("");
    const [status, setStatus] = useState("CONFIRMED");
    const [instructionsOpen, setInstructionsOpen] = useState(false);
    const [isEditingInstructions, setIsEditingInstructions] = useState(false);
    const [instructionsDraft, setInstructionsDraft] = useState("");
    const didRunInitialStatusSync = useRef(false);

    const { page, limit, setPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [propertyId, searchQuery, arrivalFrom, arrivalTo, departureFrom, departureTo, scope, status],
    });

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState("summary");
    
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);

    const [mainTab, setMainTab] = useState<"bookings" | "audit">("bookings");
    const [mainAuditPage, setMainAuditPage] = useState(1);
    const [mainAuditLimit, setMainAuditLimit] = useState(10);
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");

    const {
        data: globalAuditLogs,
        isLoading: globalAuditLogsLoading,
        isFetching: globalAuditLogsFetching,
        refetch: refetchGlobalAuditLogs
    } = useGetLogsByTableQuery({
        tableName: "bookings",
        page: mainAuditPage,
        limit: mainAuditLimit,
    }, {
        skip: !isLoggedIn || mainTab !== "audit"
    });

    const paginatedHistoryLogs = useMemo(() => {
        let rows = globalAuditLogs?.data ?? [];
        if (historySearchQuery) {
            const lowerQuery = historySearchQuery.toLowerCase();
            rows = rows.filter((r: any) =>
                r.event_type?.toLowerCase().includes(lowerQuery) ||
                r.user_name?.toLowerCase().includes(lowerQuery) ||
                r.user_first_name?.toLowerCase().includes(lowerQuery) ||
                (r.event_id && formatModuleDisplayId("booking", r.event_id).toLowerCase().includes(lowerQuery))
            );
        }
        if (historyActionFilter) {
            rows = rows.filter((r: any) => r.event_type?.toUpperCase() === historyActionFilter.toUpperCase());
        }
        return rows;
    }, [globalAuditLogs?.data, historySearchQuery, historyActionFilter]);

    const historyTotalRecords = globalAuditLogs?.pagination?.totalItems ?? globalAuditLogs?.pagination?.total ?? 0;
    const historyTotalPages = globalAuditLogs?.pagination?.totalPages ?? 1;

    const historyActionOptions = useMemo(() => {
        return ["CREATE", "UPDATE", "DELETE"];
    }, []);

    const resetHistoryFilters = () => {
        setHistorySearchInput("");
        setHistorySearchQuery("");
        setHistoryActionFilter("");
        setMainAuditPage(1);
    };

    const refreshHistoryGrid = async () => {
        if (globalAuditLogsFetching) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchGlobalAuditLogs();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const exportHistoryLogs = () => {
        if (!paginatedHistoryLogs.length) return toast.info("No history rows to export");
        const formatted = paginatedHistoryLogs.map((audit: any) => {
            let details: any = null;
            try {
                details = typeof audit.details === "string" ? JSON.parse(audit.details) : audit.details;
            } catch {}
            
            let changeText = "--";
            if (details) {
                changeText = getAuditChangePlainText(details);
            }

            return {
                "Booking ID": formatModuleDisplayId("booking", audit.event_id),
                "Action": formatAuditActionText(audit.event_type),
                "Change": changeText,
                "User": `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                "Date & Time": formatAppDateTime(audit.created_on),
            };
        });
        exportToExcel(formatted, "Bookings-History.xlsx");
        toast.success("Export completed");
    };

    const [cancelFee, setCancelFee] = useState("0");
    const [cancelComment, setCancelComment] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [bookingId, setBookingId] = useState("");

    const [updatedStatus, setUpdatedStatus] = useState<string>("");
    const [statusSelectOpen, setStatusSelectOpen] = useState(false);

    const [statusTime, setStatusTime] = useState("");
    const [statusTimeError, setStatusTimeError] = useState("");
    const [isEarlyCheckin, setIsEarlyCheckin] = useState(false);
    const [isDelayedCheckout, setIsDelayedCheckout] = useState(false);
    const [auditComment, setAuditComment] = useState("");
    const [auditCommentError, setAuditCommentError] = useState("");
    const statusTimeInputRef = useRef<HTMLInputElement>(null);

    const memoizedArrivalFrom = useMemo(() => (arrivalFrom ? new Date(arrivalFrom) : null), [arrivalFrom]);
    const memoizedArrivalTo = useMemo(() => (arrivalTo ? new Date(arrivalTo) : null), [arrivalTo]);
    const memoizedDepartureFrom = useMemo(() => (departureFrom ? new Date(departureFrom) : null), [departureFrom]);
    const memoizedDepartureTo = useMemo(() => (departureTo ? new Date(departureTo) : null), [departureTo]);



    const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)

    const navigate = useNavigate()
    const location = useLocation()

    const handleDownloadPDF = async () => {
        if (!selectedBooking?.booking) {
            toast.error("Booking data is not ready yet.");
            return;
        }

        const previewTab = window.open("", "_blank");
        if (!previewTab) {
            toast.error("Unable to open PDF preview. Please allow pop-ups.");
            return;
        }

        const displayId = formatModuleDisplayId("booking", bookingId)
            .replace(/#/g, "")
            .trim();

        const fileName = `Booking_Summary_${displayId}.pdf`;

        try {
            const fallbackProperty = myProperties?.properties?.find(
                (p: any) => p.id === selectedBooking.booking.property_id
            ) || staffProperty;
            const propertyForPdf =
                propertyDetails?.id === selectedBooking.booking.property_id
                    ? propertyDetails
                    : fallbackProperty;

            const blob = await pdf(
                <BookingSummaryPDF
                    booking={selectedBooking.booking}
                    guests={guestsData?.guests || []}
                    vehicles={vehiclesData?.vehicles || []}
                    payments={paymentsData?.data || []}
                    property={propertyForPdf}
                    allRoomsMeta={allRoomsMeta || []}
                    bookingInstructions={propertyForPdf?.booking_instructions || ""}
                />
            ).toBlob();

            const blobUrl = URL.createObjectURL(blob);

            const safeTitle = fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            previewTab.document.write(`
                <!doctype html>
                <html>
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>${safeTitle}</title>
                    <style>
                      html, body { margin: 0; padding: 0; height: 100%; background: #111827; }
                      .toolbar {
                        height: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        padding: 0 12px;
                        background: #0b1220;
                        border-bottom: 1px solid #1f2937;
                        box-sizing: border-box;
                      }
                      .download-link {
                        color: #e5e7eb;
                        text-decoration: none;
                        font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                        background: #1d4ed8;
                        border-radius: 6px;
                        padding: 8px 12px;
                      }
                      .download-link:hover { background: #1e40af; }
                      iframe { border: 0; width: 100%; height: calc(100% - 44px); }
                    </style>
                  </head>
                  <body>
                    <div class="toolbar">
                      <a class="download-link" href="${blobUrl}" download="${safeTitle}">Download PDF</a>
                    </div>
                    <iframe src="${blobUrl}" title="${safeTitle}"></iframe>
                  </body>
                </html>
            `);
            previewTab.document.close();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
        } catch (err) {
            previewTab.close();
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF.");
        }
    };

    useEffect(() => {
        if (location.state?.openBookingId) {
            handleManage(location.state.openBookingId, false);
            if (location.state?.tab) {
                setActiveTab(location.state.tab);
            }
            // Clear state so a manual page refresh doesn't pop it open again
            window.history.replaceState({}, document.title)
        }
    }, [location.state?.openBookingId, location.state?.tab]);

    const { myProperties, staffProperty, isMultiProperty, isOwner, isSuperAdmin, isInitializing } = useAutoPropertySelect(propertyId, setPropertyId);
    const canManagePropertySettings = useAppSelector(selectCanManagePropertySettings);
    const [updateProperty, { isLoading: isSavingInstructions }] = useUpdatePropertiesMutation();
    const currentPropertyId = propertyId ?? (staffProperty?.id ? Number(staffProperty.id) : undefined);
    const { data: propertyDetails } = useGetPropertyByIdQuery(currentPropertyId as number, {
        skip: !currentPropertyId,
    });
    const bookingInstructions = propertyDetails?.booking_instructions || "";

    const sanitizeInstructionsHtml = (raw: string) => {
        if (!raw) return "";
        return raw
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
            .replace(/\son\w+="[^"]*"/gi, "")
            .replace(/\son\w+='[^']*'/gi, "")
            .replace(/javascript:/gi, "");
    };

    const normalizeInstructionsHtml = (raw: string) => {
        if (!raw) return "";
        return raw
            .replace(/<li>\s*(<br\s*\/?>|&nbsp;|\s)*<\/li>/gi, "")
            .replace(/<p>\s*(<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, "")
            .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br /><br />")
            .replace(/(<\/(ul|ol)>)\s*(<(ul|ol)>)/gi, "$1")
            .trim();
    };

    const handleEditInstructions = () => {
        setInstructionsDraft(bookingInstructions || "");
        setIsEditingInstructions(true);
    };

    const handleCancelInstructionsEdit = () => {
        setInstructionsDraft(bookingInstructions || "");
        setIsEditingInstructions(false);
    };

    const handleCloseInstructionsPanel = () => {
        setInstructionsOpen(false);
    };

    const handleUpdateInstructions = async () => {
        if (!currentPropertyId || isSavingInstructions) return;
        const normalizedDraft = normalizeInstructionsHtml(instructionsDraft || "");
        const wordCount = getWordCountFromHtml(normalizedDraft);
        if (wordCount > BOOKING_INSTRUCTIONS_WORD_LIMIT) {
            toast.error(`Booking instructions cannot exceed ${BOOKING_INSTRUCTIONS_WORD_LIMIT} words`);
            return;
        }
        try {
            await updateProperty({
                id: currentPropertyId,
                payload: { booking_instructions: normalizedDraft },
            }).unwrap();
            toast.success("Booking instructions updated successfully");
            setIsEditingInstructions(false);
        } catch {
            toast.error("Failed to update booking instructions");
        }
    };

    useEffect(() => {
        if (!instructionsOpen) {
            setIsEditingInstructions(false);
            return;
        }
        setInstructionsDraft(bookingInstructions || "");
    }, [instructionsOpen, bookingInstructions]);



    const { data: bookingsData, isLoading: bookingsLoading, isFetching: bookingsFetching, isUninitialized: bookingsUninitialized, refetch: refetchBookings } = useGetBookingsQuery({
        propertyId,
        page,
        arrivalFrom,
        arrivalTo,
        departureFrom,
        departureTo,
        scope,
        status: status || undefined,
        search: searchQuery,
        limit
    }, {
        skip: !isLoggedIn || !propertyId || isNaN(Number(propertyId))
    })

    const { data: allRoomsMeta, isLoading: allRoomsMetaLoading } = useGetAllRoomsMetaQuery({ propertyId }, {
        skip: !isLoggedIn || !propertyId || isNaN(Number(propertyId))
    })


    const { data: selectedBooking, isLoading: selectedBookingLoading } = useGetBookingByIdQuery(bookingId, {
        skip: !isLoggedIn || !bookingId
    })

    const normalizedUpdatedStatus = normalizeBookingStatus(updatedStatus);
    const requiresStatusTime = 
        (normalizedUpdatedStatus === "CHECKED_IN" && selectedBooking?.booking?.booking_status !== "CHECKED_IN") || 
        (normalizedUpdatedStatus === "CHECKED_OUT" && selectedBooking?.booking?.booking_status !== "CHECKED_OUT");
    const statusTimeLabel = normalizedUpdatedStatus === "CHECKED_IN" ? "Check-in Time" : "Checkout Time";

    const { data: guestsData } = useGetGuestsByBookingQuery({ booking_id: bookingId }, {
        skip: !detailsOpen || !bookingId
    })

    const { data: vehiclesData } = useGetVehiclesByBookingQuery({ bookingId }, {
        skip: !detailsOpen || !bookingId
    })

    const { data: paymentsData } = useGetPaymentsByBookingIdQuery({ bookingId }, {
        skip: !detailsOpen || !bookingId || !isLoggedIn
    })

    const [cancelBooking] = useCancelBookingMutation()
    const [updateBooking, { error }] = useUpdateBookingMutation()
    const [updateBookingStatus] = useUpdateBookingMutation()
    const [getAllBookings, { isFetching: exportingBookings }] = useLazyExportBookingsQuery()

    async function handleManage(id: string, isEdit: boolean = true) {
        setBookingId(id)
        setEditMode(isEdit);
        setDetailsOpen(true);
        setActiveTab("summary");
    }

    async function handleCancelBooking() {
        if (!selectedBooking) return;

        const promise = cancelBooking({ booking_id: selectedBooking?.booking?.id, cancellation_fee: cancelFee, comments: cancelComment });

        toast.promise(promise, {
            pending: "Cancelling booking...",
            success: "Booking cancelled successfully",
            error: "Failed to cancel booking",
        });

        setCancelOpen(false);
        setDetailsOpen(false);
    }

    function resetStatusConfirmation() {
        setConfirmStatusOpen(false);
        setUpdatedStatus("");
        setStatusTime("");
        setStatusTimeError("");
        setIsEarlyCheckin(false);
        setIsDelayedCheckout(false);
        setAuditComment("");
        setAuditCommentError("");
    }

    function focusStatusTimeInput() {
        const input = statusTimeInputRef.current;
        if (!input) return;

        input.focus();

        try {
            const inputWithPicker = input as HTMLInputElement & { showPicker?: () => void };
            inputWithPicker.showPicker?.();
        } catch {
            // Browser may not support programmatic native picker opening.
        }
    }

    async function exportBookingsSheet() {
        if (exportingBookings) return;

        const totalRecords = bookingsData?.pagination?.totalItems ?? bookingsData?.pagination?.total ?? (bookingsData?.bookings?.length || 0);
        if (!totalRecords) {
            toast.info("No bookings to export");
            return;
        }

        const toastId = toast.loading("Preparing bookings export...");

        try {
            const res = await getAllBookings({
                propertyId,
                arrivalFrom,
                arrivalTo,
                departureFrom,
                departureTo,
                scope: scope || undefined,
                status: status || undefined,
                search: searchQuery.trim(),
            }).unwrap();

            const rows = Array.isArray(res?.bookings) ? res.bookings : Array.isArray(res) ? res : [];

            if (!rows.length) {
                toast.dismiss(toastId);
                toast.info("No bookings to export");
                return;
            }

            const formatted = rows.map((b: any) => ({
                "Booking": formatModuleDisplayId("booking", b.id),
                "Status": b.booking_status?.replace("_", " "),
                "Arrival": formatToDDMMYY(b.estimated_arrival),
                "Departure": formatToDDMMYY(b.estimated_departure),
                "Amount": `₹ ${b.final_amount}`,
                "Room number(s)": Array.isArray(b.room_numbers) ? b.room_numbers.join(", ") : (b.room_numbers?.toString() || "-"),
                "Pickup / Drop": `${b.pickup ? "Yes" : "No"} / ${b.drop ? "Yes" : "No"}`,
            }));

            // Note: exportToExcel assumed to be implemented globally or via helper
            // exportToExcel(formatted, "bookings.xlsx");
            toast.dismiss(toastId);
            toast.success("Bookings exported successfully");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export bookings");
        }
    }

    async function handleUpdateBooking() {
        if (!selectedBooking) return;

        const normalizedStatus = normalizeBookingStatus(updatedStatus);
        const needsStatusTime = 
            (normalizedStatus === "CHECKED_IN" && selectedBooking?.booking?.booking_status !== "CHECKED_IN") || 
            (normalizedStatus === "CHECKED_OUT" && selectedBooking?.booking?.booking_status !== "CHECKED_OUT");
        const requiredTimeLabel = normalizedStatus === "CHECKED_IN" ? "Check-in Time" : "Checkout Time";
        const selectedTimestamp = needsStatusTime ? buildStatusTimestamp(statusTime) : "";

        setAuditCommentError("");
        let hasError = false;

        if (needsStatusTime && !statusTime) {
            setStatusTimeError(`${requiredTimeLabel} is required`);
            hasError = true;
        } else if (needsStatusTime && !selectedTimestamp) {
            setStatusTimeError(`Enter a valid ${requiredTimeLabel.toLowerCase()}`);
            hasError = true;
        }

        if (normalizedStatus === "CHECKED_IN") {
            const today = new Date();
            const estArrival = new Date(selectedBooking.booking.estimated_arrival);
            
            const todayDate = new Date(today);
            todayDate.setHours(0, 0, 0, 0);
            
            const estArrivalDate = new Date(estArrival);
            estArrivalDate.setHours(0, 0, 0, 0);
            
            if (todayDate < estArrivalDate) {
                setStatusTimeError("Early check-in is allowed only on the scheduled arrival date. For previous-day arrival, please duplicate this booking or create a new booking.");
                hasError = true;
            }
        }

        if (normalizedStatus === "CHECKED_OUT") {
            const today = new Date();
            const estDeparture = new Date(selectedBooking.booking.estimated_departure);
            
            const todayDate = new Date(today);
            todayDate.setHours(0, 0, 0, 0);
            
            const estDepartureDate = new Date(estDeparture);
            estDepartureDate.setHours(0, 0, 0, 0);
            
            if (todayDate > estDepartureDate) {
                setStatusTimeError("Delayed checkout is allowed only on the scheduled checkout date. For next-day or longer stay, please use New Booking.");
                hasError = true;
            }
        }

        if (isEarlyCheckin && !auditComment.trim()) {
            setAuditCommentError("Comment is required for Early Check-In");
            hasError = true;
        }

        if (isDelayedCheckout && !auditComment.trim()) {
            setAuditCommentError("Comment is required for Delayed Checkout");
            hasError = true;
        }

        if (hasError) return;

        const payload: Record<string, any> = {
            booking_id: selectedBooking?.booking?.id,
            status: updatedStatus,
        };

        if (normalizedStatus === "CHECKED_IN") {
            payload.actual_arrival = needsStatusTime ? selectedTimestamp : selectedBooking.booking.actual_arrival;
            if (isEarlyCheckin) {
                payload.is_early_checkin = true;
                payload.audit_comment = auditComment.trim();
            }
        }

        if (normalizedStatus === "CHECKED_OUT") {
            payload.actual_departure = needsStatusTime ? selectedTimestamp : selectedBooking.booking.actual_departure;
            if (isDelayedCheckout) {
                payload.is_delayed_checkout = true;
                payload.audit_comment = auditComment.trim();
            }
        }

        const promise = updateBooking(payload).unwrap();

        resetStatusConfirmation();

        try {
            await toast.promise(promise, {
                pending: "Updating booking...",
                success: "Booking updated successfully",
                error: {
                    render({ data }: { data: any }) {
                        return data?.data?.message || data?.message || "Failed to update booking status";
                    },
                    pauseOnHover: true
                }
            });
        } catch {
            // Error feedback is handled by toast.promise.
        }

    }


    

    

    const resetFiltersHandler = () => {
        if (myProperties?.properties?.[0]?.id) {
            setPropertyId(Number(myProperties.properties[0].id));
        }
        setSearchQuery("");
        setScope("");
        setStatus("");
        setArrivalFrom("");
        setArrivalTo("");
        setDepartureFrom("");
        setDepartureTo("");
        setPage(1);
    };

    const refreshTable = async () => {
        if (bookingsFetching) return;
        try {
            await refetchBookings();
            toast.success("Data refreshed");
        } catch {
            toast.error("Failed to refresh data");
        }
    };

    const bookingRows = useMemo(() => {
        const rows = (!bookingsLoading && !bookingsUninitialized && bookingsData?.bookings)
            ? [...bookingsData.bookings]
            : [];
        
        // Sort by ID descending (Latest created on top)
        return rows.sort((a, b) => Number(b.id) - Number(a.id));
    }, [bookingsData?.bookings, bookingsLoading, bookingsUninitialized]);


    function BookingSummaryTab({ booking }: any) {
        if (!booking) return null;

        const finalAmt = +(booking?.final_amount || 0);
        const restTotal = +(booking?.restaurant_total_amount || 0);
        const totalAmt = finalAmt + restTotal;

        const paidAmt = +(booking?.paid_amount || 0);
        const restPaid = +(booking?.restaurant_paid_amount || 0);
        const totalPaid = paidAmt + restPaid;

        const remaining = totalAmt - totalPaid;

        const formatTimeOnly = (value?: string | null) => {
            if (!value) return "—";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "—";
            return date.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
        };

        const arrivalTime = booking?.estimated_arrival_time
            ? formatTimeOnly(booking.estimated_arrival_time)
            : formatTimeOnly(booking?.actual_arrival);

        const requiredAdditional = Math.max(0, (booking?.adult || 1) - 1);
        const totalGuestsSaved = guestsData?.guests?.length || 0;
        const completedAdditional = Math.max(0, totalGuestsSaved - 1);
        const pendingCount = requiredAdditional - completedAdditional;
        const isPendingGuests = guestsData && pendingCount > 0;

        return (
            <div className="space-y-4">
                {isPendingGuests && (
                    <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-[3px] border border-amber-200 text-sm font-medium flex items-center gap-2">
                        Guest details for {pendingCount} additional guest{pendingCount === 1 ? " is" : "s are"} pending.
                    </div>
                )}
                <CardSectionView 
                    title="Financial Overview" 
                    titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" 
                    className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4"
                >
                    <ViewField label="Total Amount" value={`₹ ${totalAmt}`} />
                    <ViewField label="Paid Amount" value={`₹ ${totalPaid}`} />
                    <ViewField label="Remaining Balance" value={`₹ ${Math.abs(remaining)}`} />
                    <ViewField label="Discount" value={`₹ ${booking?.discount_amount || 0}`} />
                </CardSectionView>

                <CardSectionView 
                    title="Booking Information" 
                    titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4"
                >
                    <ViewField label="Guest Name" value={booking?.primary_guest ? `${booking.primary_guest.first_name} ${booking.primary_guest.last_name || ""}`.trim() : "—"} />
                    <ViewField label="Booking Source" value={booking?.booking_type ? formatReadableLabel(booking.booking_type) : "—"} />
                    <ViewField label="Adults / Children" value={`${booking?.adult || 0} A / ${booking?.child || 0} C`} />
                    <ViewField label="Arrival Date" value={formatToDDMMYY(booking?.estimated_arrival)} />
                    <ViewField label="Departure Date" value={formatToDDMMYY(booking?.estimated_departure)} />
                    <ViewField label="Total Nights" value={booking?.booking_nights || 0} />
                    <ViewField label="Status" value={formatReadableLabel(booking?.booking_status) || "—"} />
                    <ViewField label="Booking Date" value={formatToDDMMYY(booking?.booking_date)} />
                    <ViewField label="Rooms Booked" value={booking?.rooms?.length || 0} />
                    <ViewField label="Arrival Time" value={arrivalTime} />
                    <ViewField label="Checked In On" value={booking?.actual_arrival ? formatToDDMMYY(booking.actual_arrival) : "—"} />
                    <ViewField label="Comments" value={booking?.comments || "No comments"} className="sm:col-span-2 lg:col-span-3" />
                </CardSectionView>
            </div>
        );
    }

    function getRoomDisplayData(roomNo: any) {
        if (!allRoomsMeta) return { roomNo: "-", floorName: "Floor 1", bedType: "King", category: "Deluxe" };

        const room = allRoomsMeta.find((r: any) => r.room_no === roomNo)

        return {
            roomNo: room?.room_no ?? "-",

            floorName: room?.floor_number
                ? `Floor ${room.floor_number}`
                : "Floor 1",

            bedType:
                room?.bed_type_name?.split(" ")?.[0] ??
                "King",

            category:
                room?.room_category_name ??
                room?.room_type ??
                "Deluxe",
        };
    }


    function BookingRoomsTab({ booking }: any) {
        const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];
        const [isChangeRoomOpen, setIsChangeRoomOpen] = useState(false);

        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button variant="hero" onClick={() => setIsChangeRoomOpen(true)}>
                        Shift
                    </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">

                {rooms.map((room: any) => {

                    const ui = getRoomDisplayData(room.room_no);

                    return (

                        <div
                            key={room.room_id}
                            className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-2 transition-all hover:border-primary"
                        >

                            <p className="text-xs text-muted-foreground">
                                {ui.floorName}
                            </p>

                            <div className="flex justify-center items-center">
                                <p className="text-2xl font-semibold">
                                    {ui.roomNo}
                                </p>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                {ui.bedType} | {ui.category}
                            </p>

                        </div>
                    );
                })}
                </div>

                <ChangeRoomModal
                    open={isChangeRoomOpen}
                    onClose={() => setIsChangeRoomOpen(false)}
                    booking={booking}
                    propertyId={booking?.property_id}
                />
            </div>
        );
    }
    function BookingGuestsTab({ bookingId, guestCount }: { bookingId: string, guestCount: number }) {
        return <GuestsEmbedded bookingId={bookingId} guestCount={guestCount} />;
    }

    function BookingVehiclesTab({ bookingId, rooms }: any) {
        return <VehiclesEmbedded bookingId={bookingId} rooms={rooms} />;
    }

    function BookingPaymentsTab({ bookingId, propertyId, remainingBalance }: any) {
        return <PaymentsEmbedded bookingId={bookingId} propertyId={propertyId} remainingBalance={remainingBalance} />;
    }

    function BookingLaundryTab({ bookingId, propertyId, bookingStatus }: any) {
        const { data: bookingData } = useGetBookingByIdQuery(bookingId, { skip: !bookingId });
        const booking = bookingData?.booking;
        
        const guestName = booking?.primary_guest ? `${booking.primary_guest.first_name} ${booking.primary_guest.last_name || ""}`.trim() : "";
        const guestMobile = booking?.primary_guest?.phone || "";

        return (
            <LaundryEmbedded
                bookingId={bookingId}
                propertyId={propertyId}
                bookingStatus={bookingStatus}
                guestName={guestName}
                guestMobile={guestMobile}
            />
        );
    }

    function BookingRestaurantOrderTab({ bookingId, propertyId, bookingStatus }: any) {
        return (
            <RestaurantOrdersEmbedded
                bookingId={bookingId}
                propertyId={propertyId}
                bookingStatus={bookingStatus}
            />
        );
    }

    function BookingLogsTab({ bookingId, propertyId }: any) {
        return <BookingLogsEmbedded bookingId={bookingId} propertyId={propertyId} />;
    }

    function ComingSoon({ label }: { label: string }) {
        return (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
                {label} module coming soon
            </div>
        );
    }




    return (
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage bookings and reservation details
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {(isSuperAdmin || isOwner) && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <div className="flex-1 min-w-0 h-full">
                                    <MenuItemSelect
                                        value={propertyId ?? ""}
                                        items={myProperties?.properties?.map((p: any) => ({ id: p.id, label: p.brand_name })) || []}
                                        onSelect={(val) => {
                                            setPropertyId(val ? Number(val) : undefined);
                                            setPage(1);
                                        }}
                                        itemName="label"
                                        placeholder="Select Property"
                                        extraClasses="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2"
                                    />
                                </div>
                            </div>
                        )}

                        <Button
                            variant="heroOutline"
                            className="h-10 px-4 flex items-center gap-2"
                            onClick={() => setInstructionsOpen(true)}
                        >
                            <HelpCircle className="w-4 h-4" /> Instructions
                        </Button>

                        <Button
                            variant="hero"
                            className="h-10 px-4 flex items-center gap-2"
                            onClick={() => navigate("/reservation")}
                        >
                            <Plus className="w-4 h-4" /> New Booking
                        </Button>
                    </div>
                </div>

                <div className="border-b border-border flex">
                    <button
                        onClick={() => setMainTab("bookings")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            mainTab === "bookings"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Bookings
                    </button>
                    <button
                        onClick={() => setMainTab("audit")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            mainTab === "audit"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        History
                    </button>
                </div>

                {mainTab === "bookings" && (
                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="flex flex-col border-b-0">
                            {/* Row 1 */}
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchInput}
                                    onChange={(val) => {
                                        setSearchInput(val);
                                        if (!val.trim()) {
                                            setSearchQuery("");
                                            setPage(1);
                                        }
                                    }}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        setPage(1);
                                    }}
                                />

                                <GridToolbarSelect
                                    label="Scope"
                                    value={scope}
                                    onChange={(value) => {
                                        setScope(value);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Upcoming", value: "upcoming" },
                                        { label: "Past", value: "past" },
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={status}
                                    onChange={(value) => {
                                        setStatus(value);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...BOOKING_STATUSES.map((s) => ({ label: s, value: s })),
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Bookings",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportBookingsSheet,
                                        },
                                        {
                                            key: "reset",
                                            label: "Reset Filters",
                                            icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: resetFiltersHandler,
                                        },
                                        {
                                            key: "refresh",
                                            label: "Refresh Data",
                                            icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: refreshTable,
                                            disabled: bookingsFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>

                            {/* Row 2 */}
                            <GridToolbarRow className="gap-2">
                                    <GridToolbarRangePicker
                                        startDate={memoizedArrivalFrom}
                                        endDate={memoizedArrivalTo}
                                        startLabel="Arrival"
                                        endLabel="Arrival To"
                                        displayFormat="dd/MM/yy"
                                        startPlaceholder="DD/MM/YY"
                                        endPlaceholder="DD/MM/YY"
                                        onChange={([start, end]) => {
                                            setPage(1);
                                            setArrivalFrom(start ? formatDate(start) : "");
                                            setArrivalTo(end ? formatDate(end) : "");
                                        }}
                                    />

                                    <GridToolbarRangePicker
                                        startDate={memoizedDepartureFrom}
                                        endDate={memoizedDepartureTo}
                                        startLabel="Departure"
                                        endLabel="Departure To"
                                        displayFormat="dd/MM/yy"
                                        startPlaceholder="DD/MM/YY"
                                        endPlaceholder="DD/MM/YY"
                                        minDate={memoizedArrivalFrom || undefined}
                                        onChange={([start, end]) => {
                                            setPage(1);
                                            setDepartureFrom(start ? formatDate(start) : "");
                                            setDepartureTo(end ? formatDate(end) : "");
                                        }}
                                    />

                                <GridToolbarSpacer className="hidden md:block" />
                                <GridToolbarSpacer type="actions" className="hidden md:block" />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            columns={[
                                {
                                    label: "Booking ID",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium",
                                    render: (b: any) => (
                                        <button
                                            type="button"
                                            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                            onClick={() => handleManage(b.id, false)}
                                            aria-label={`Open summary view for booking ${formatModuleDisplayId("booking", b.id)}`}
                                        >
                                            {formatModuleDisplayId("booking", b.id)}
                                        </button>
                                    ),
                                },
                                {
                                    label: "Status",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (b: any) => (
                                        <GridBadge status={b.booking_status} statusType="booking">
                                            {b.booking_status?.replace("_", " ")}
                                        </GridBadge>
                                    )
                                },
                                {
                                    label: "Arrival",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium text-xs whitespace-nowrap",
                                    render: (b: any) => formatToDDMMYY(b.estimated_arrival)
                                },
                                {
                                    label: "Departure",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium text-xs whitespace-nowrap",
                                    render: (b: any) => formatToDDMMYY(b.estimated_departure)
                                },
                                {
                                    label: "Room number(s)",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (b: any) => (
                                        <div className="max-w-[150px] truncate mx-auto" title={Array.isArray(b.room_numbers) ? b.room_numbers.join(", ") : b.room_numbers?.toString()}>
                                            {Array.isArray(b.room_numbers) ? b.room_numbers.slice(0, 4).join(", ") : (b.room_numbers?.toString() || "-")}{(b.room_numbers?.length || 0) > 4 ? "..." : ""}
                                        </div>
                                    )
                                },
                                {
                                    label: "Pickup / Drop",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (b: any) => `${b.pickup ? "Yes" : "No"} / ${b.drop ? "Yes" : "No"}`
                                },
                                {
                                    label: "Amount",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium",
                                    render: (b: any) => <span className="inline-flex min-w-[60px] justify-center rounded-[3px] bg-muted/40 px-2 py-1 text-xs font-semibold">₹ {b.final_amount}</span>
                                }
                            ] as ColumnDef<any>[]}
                            data={bookingRows}
                            loading={bookingsLoading || bookingsFetching || isInitializing}
                            emptyText="No bookings found"
                            minWidth="800px"
                            enablePagination={!!bookingsData?.pagination}
                            paginationProps={{
                                page,
                                totalPages: bookingsData?.pagination?.totalPages ?? 1,
                                setPage,
                                disabled: bookingsLoading,
                                totalRecords: bookingsData?.pagination?.totalItems ?? bookingsData?.pagination?.total ?? bookingsData?.bookings?.length ?? 0,
                                limit,
                                onLimitChange: (value) => {
                                    handleLimitChange(value);
                                }
                            }}
                        />
                    </div>
                </div>
                )}

                {mainTab === "audit" && (
                    <div className="flex-1">
                        <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                            <div className="w-full">
                                <GridToolbar className="border-b-0">
                                    <GridToolbarRow className="gap-2">
                                        <GridToolbarSearch
                                            value={historySearchInput}
                                            onChange={setHistorySearchInput}
                                            onSearch={() => {
                                                setHistorySearchQuery(historySearchInput.trim());
                                                setMainAuditPage(1);
                                            }}

                                        />

                                        <GridToolbarSelect
                                            label="Action"
                                            value={historyActionFilter}
                                            onChange={(value) => {
                                                setHistoryActionFilter(value);
                                                setMainAuditPage(1);
                                            }}
                                            options={[
                                                { label: "All", value: "" },
                                                ...historyActionOptions.map((action) => ({
                                                    label: action,
                                                    value: action,
                                                })),
                                            ]}
                                        />

                                        <GridToolbarActions
                                            className="gap-1 justify-end"
                                            actions={[
                                                {
                                                    key: "export",
                                                    label: "Export History",
                                                    icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: exportHistoryLogs,
                                                },
                                                {
                                                    key: "reset",
                                                    label: "Reset Filters",
                                                    icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: resetHistoryFilters,
                                                },
                                                {
                                                    key: "refresh",
                                                    label: "Refresh Data",
                                                    icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: refreshHistoryGrid,
                                                    disabled: globalAuditLogsFetching,
                                                },
                                            ]}
                                        />
                                    </GridToolbarRow>
                                </GridToolbar>
                            </div>
                            <div className="px-2 pb-2">
                                <AppDataGrid
                                    data={paginatedHistoryLogs}
                                    loading={globalAuditLogsLoading || globalAuditLogsFetching}
                                    rowKey={(audit: any) => audit.id}
                                    emptyText="No history logs found."
                                    showActions={false}
                                    enablePagination={true}
                                    paginationProps={{
                                        page: mainAuditPage,
                                        setPage: setMainAuditPage,
                                        totalPages: historyTotalPages,
                                        disabled: globalAuditLogsFetching,
                                        totalRecords: historyTotalRecords,
                                        limit: mainAuditLimit,
                                        onLimitChange: (limit) => {
                                            setMainAuditLimit(limit);
                                            setMainAuditPage(1);
                                        }
                                    }}
                                    columns={[
                                        {
                                            label: "Booking ID",
                                            headClassName: "text-center w-[120px]",
                                            cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                            render: (audit: any) => audit.event_id ? formatModuleDisplayId("booking", audit.event_id) : "—",
                                        },
                                        {
                                            label: "Action",
                                            headClassName: "text-center w-[140px]",
                                            cellClassName: "text-center font-medium min-w-[140px]",
                                            render: (audit: any) => getAuditActionBadge(audit.event_type),
                                        },
                                        {
                                            label: "Change",
                                            headClassName: "w-[320px]",
                                            cellClassName: "min-w-[320px] whitespace-normal text-primary/80 font-medium",
                                            render: (audit: any) => {
                                                let parsed = audit.details;
                                                if (typeof parsed === 'string') {
                                                    try { parsed = JSON.parse(parsed); } catch { }
                                                }
                                                return getFormattedAuditChanges(parsed);
                                            },
                                        },
                                        {
                                            label: "User",
                                            headClassName: "w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                                        },
                                        {
                                            label: "Date & Time",
                                            headClassName: "text-white w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => formatAppDateTime(audit.created_on),
                                        },
                                    ] as ColumnDef<any>[]}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Booking Details (Read-only) */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent
                    side="right"

                    className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold    ">
                                    Booking {bookingId ? `[#${formatModuleDisplayId("booking", bookingId)}]` : ""}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {editMode ? "Manage Booking Details" : "Booking Related Details"}
                                </p>
                            </div>
                            
                            <div className="flex items-end gap-3 sm:mr-8">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="heroOutline"
                                                size="sm"
                                                className="h-9 w-9 p-0 shadow-sm rounded-md"
                                                onClick={handleDownloadPDF}
                                                disabled={selectedBookingLoading || !selectedBooking?.booking || !detailsOpen}
                                                aria-label="Print GR"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="center" className="text-xs">
                                            Print GR
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <Button
                                    variant="heroOutline"
                                    size="sm"
                                    className="h-9 px-3 text-xs font-semibold tracking-normal rounded-md"
                                    onClick={() => {
                                        navigate("/reservation", {
                                            state: { duplicateBooking: selectedBooking?.booking }
                                        });
                                    }}
                                >
                                    <Copy className="w-3.5 h-3.5 mr-2" />
                                    Duplicate Booking
                                </Button>

                                <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="heroOutline"
                                            size="sm"
                                            className="h-9 px-3 text-xs font-semibold tracking-normal rounded-md"
                                            onClick={() => {
                                                setUpdatedStatus(selectedBooking?.booking.booking_status || "");
                                                setStatusTime("");
                                                setStatusTimeError("");
                                                setConfirmStatusOpen(true);
                                            }}
                                            disabled={selectedBooking?.booking.booking_status === "CANCELLED"}
                                        >
                                            <CheckSquare className="w-3.5 h-3.5 mr-2" />
                                            Booking Status
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        align="center"
                                        sideOffset={6}
                                        className="bg-white text-black border-border shadow-md px-3 py-1.5 text-xs font-medium z-[200] pointer-events-none"
                                    >
                                        Click to update booking status
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        </SheetHeader>

                    {/* Tabs */}
                    <div className="space-y-6">
                        {/* Tabs Header */}
                        <div className="border-b border-border flex overflow-x-auto overflow-y-hidden scrollbar-hide">
                            {SUMMARY_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px] whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="">
                            {activeTab === "summary" && (
                                <BookingSummaryTab booking={selectedBooking?.booking} />
                            )}
                            {activeTab === "rooms" && (
                                <BookingRoomsTab booking={selectedBooking?.booking} />
                            )}
                            {activeTab === "guests" && (
                                <BookingGuestsTab bookingId={selectedBooking?.booking.id} guestCount={selectedBooking?.adult} />
                            )}
                            {activeTab === "vehicles" && (
                                <BookingVehiclesTab bookingId={selectedBooking?.booking.id} rooms={selectedBooking?.booking.rooms} />
                            )}
                            {activeTab === "payments" && (() => {
                                const finalAmt = +(selectedBooking?.booking?.final_amount || 0);
                                const restTotal = +(selectedBooking?.booking?.restaurant_total_amount || 0);
                                const totalAmt = finalAmt + restTotal;
                                const paidAmt = +(selectedBooking?.booking?.paid_amount || 0);
                                const restPaid = +(selectedBooking?.booking?.restaurant_paid_amount || 0);
                                const totalPaid = paidAmt + restPaid;
                                const remaining = Math.abs(totalAmt - totalPaid);

                                return (
                                    <BookingPaymentsTab 
                                        bookingId={selectedBooking?.booking.id} 
                                        propertyId={selectedBooking?.booking?.property_id} 
                                        remainingBalance={remaining} 
                                    />
                                );
                            })()}
                            {activeTab === "laundry" && (
                                <BookingLaundryTab
                                    bookingId={selectedBooking?.booking.id}
                                    propertyId={selectedBooking?.booking?.property_id}
                                    bookingStatus={selectedBooking?.booking?.booking_status}
                                />
                            )}
                            {activeTab === "orders" && (
                                <BookingRestaurantOrderTab
                                    bookingId={selectedBooking?.booking.id}
                                    propertyId={selectedBooking?.booking?.property_id}
                                    bookingStatus={selectedBooking?.booking?.booking_status}
                                />
                            )}
                            {activeTab === "logs" && (
                                <BookingLogsTab bookingId={selectedBooking?.booking.id} propertyId={selectedBooking?.booking?.property_id} />
                            )}
                        </div>
                    </div>

                    <div className="border-t border-border pt-6 flex justify-end">
                        <Button variant="heroOutline" onClick={() => setDetailsOpen(false)}>
                            Close
                        </Button>
                    </div>

                    </motion.div>
                </SheetContent>
            </Sheet>

            <Sheet 
                open={confirmStatusOpen} 
                onOpenChange={(open) => {
                    if (open) {
                        setConfirmStatusOpen(true);
                        return;
                    }

                    resetStatusConfirmation();
                }}
            >
                <SheetContent side="right" onOpenAutoFocus={(e) => e.preventDefault()} className="w-full sm:max-w-xl overflow-y-auto bg-background p-0 transition-all duration-300 flex flex-col">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col min-h-full h-full"
                    >
                        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">Update Booking Status</SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    Modify booking status and time
                                </p>
                            </div>
                        </SheetHeader>

                        <div className="px-6 pb-6 pt-4 flex flex-col flex-1">
                            <div className="space-y-4 flex-1">
                                <div className="rounded-[5px] border border-primary/50 bg-background p-5 shadow-sm space-y-5 [&>h3+*]:!mt-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Status Details
                                    </h3>

                                    <div className="space-y-4 text-sm mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-sm font-semibold text-foreground">Change Status</Label>
                                <NativeSelect
                                    className="h-10 w-full border-primary/40 bg-background rounded-md px-3 text-sm font-semibold focus:ring-1 focus:ring-primary shadow-sm"
                                    value={updatedStatus}
                                    onChange={(e) => {
                                        const nextStatus = e.target.value;
                                        setUpdatedStatus(nextStatus);
                                        
                                        const normalized = normalizeBookingStatus(nextStatus);
                                        if (normalized === "CHECKED_IN" || normalized === "CHECKED_OUT") {
                                            setStatusTime(getCurrentTimeHHMM());
                                        } else {
                                            setStatusTime("");
                                        }
                                        
                                        if (normalized !== "CHECKED_IN") setIsEarlyCheckin(false);
                                        if (normalized !== "CHECKED_OUT") setIsDelayedCheckout(false);
                                        
                                        setStatusTimeError("");
                                        setAuditCommentError("");
                                    }}
                                    disabled={selectedBooking?.booking.booking_status === "CANCELLED"}
                                >
                                    <option value={""} disabled>Select status</option>
                                    {BOOKING_STATUSES.filter(s => {
                                        const currentStatus = selectedBooking?.booking.booking_status;
                                        
                                        if (s === currentStatus) return false;

                                        if (currentStatus === "CONFIRMED" && s === "CHECKED_OUT") return false;
                                        
                                        if (currentStatus === "CHECKED_IN" && s === "CONFIRMED") return false;
                                        
                                        if (currentStatus === "CHECKED_OUT" && (s === "CONFIRMED" || s === "CHECKED_IN" || s === "NO_SHOW" || s === "CANCELLED")) return false;
                                        
                                        if (currentStatus === "NO_SHOW" && (s === "CHECKED_IN" || s === "CHECKED_OUT")) return false;

                                        return true;
                                    }).map((s) => (
                                        <option key={s} value={s}>
                                            {formatReadableLabel(s)}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>

                            {requiresStatusTime && (
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor="booking-status-time" className="text-sm font-semibold text-foreground">
                                        {statusTimeLabel}
                                    </Label>
                                    <Input
                                        ref={statusTimeInputRef}
                                        id="booking-status-time"
                                        type="time"
                                        value={statusTime}
                                        onClick={focusStatusTimeInput}
                                        onChange={(e) => {
                                            setStatusTime(e.target.value);
                                            setStatusTimeError("");
                                        }}
                                        className={cn(
                                            "h-10 w-full rounded-[4px] border-primary/40 bg-background text-sm font-semibold shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                            statusTimeError && "border-red-500"
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {statusTimeError && (
                            <p className="text-xs text-red-500 mt-1">
                                {statusTimeError}
                            </p>
                        )}

                        {normalizeBookingStatus(updatedStatus) === "CHECKED_IN" && selectedBooking?.booking?.booking_status !== "CHECKED_IN" && (
                            <div className="flex items-center space-x-2 mt-4">
                                <Checkbox
                                    id="early-checkin-checkbox"
                                    checked={isEarlyCheckin}
                                    onCheckedChange={(checked) => {
                                        setIsEarlyCheckin(!!checked);
                                        setAuditCommentError("");
                                    }}
                                />
                                <Label htmlFor="early-checkin-checkbox" className="text-sm cursor-pointer">
                                    Early Check-In
                                </Label>
                            </div>
                        )}

                        {normalizeBookingStatus(updatedStatus) === "CHECKED_OUT" && (
                            <div className="flex items-center space-x-2 mt-4">
                                <Checkbox
                                    id="delayed-checkout-checkbox"
                                    checked={isDelayedCheckout}
                                    onCheckedChange={(checked) => {
                                        setIsDelayedCheckout(!!checked);
                                        setAuditCommentError("");
                                    }}
                                />
                                <Label htmlFor="delayed-checkout-checkbox" className="text-sm cursor-pointer">
                                    Delayed Checkout
                                </Label>
                            </div>
                        )}

                        {(isEarlyCheckin || isDelayedCheckout) && (
                            <div className="mt-4 space-y-1.5">
                                <Label htmlFor="audit-comment" className="text-sm font-semibold text-foreground">
                                    Comment <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="audit-comment"
                                    value={auditComment}
                                    onChange={(e) => {
                                        setAuditComment(e.target.value);
                                        setAuditCommentError("");
                                    }}
                                    placeholder="Enter reason here..."
                                    className={cn(
                                        "w-full rounded-[4px] border-primary/40 bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                        auditCommentError && "border-red-500"
                                    )}
                                    rows={2}
                                />
                                {auditCommentError && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {auditCommentError}
                                    </p>
                                )}
                            </div>
                        )}

                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4 mt-4">
                                <p className="text-sm text-muted-foreground pb-2">
                                    This action may affect availability, billing, and reports.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-2 shrink-0">
                                <Button
                                    variant="heroOutline"
                                    onClick={resetStatusConfirmation}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    variant="hero"
                                    onClick={handleUpdateBooking}
                                >
                                    Yes, Update Status
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

            <Sheet open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl h-full overflow-y-auto bg-background p-0 flex flex-col">
                    <SheetHeader className="px-6 py-4 border-b border-border relative">
                        <SheetTitle className="text-xl font-bold">Booking Instructions</SheetTitle>
                    </SheetHeader>

                    <div className="px-6 pb-6 pt-0 flex-1 space-y-4">
                        {!isEditingInstructions ? (
                            <>
                                {canManagePropertySettings && (
                                    <div className="mb-2 flex justify-end">
                                        <Button
                                            variant="hero"
                                            className="h-9 px-5"
                                            onClick={handleEditInstructions}
                                        >
                                            Update
                                        </Button>
                                    </div>
                                )}
                                {bookingInstructions?.trim() ? (
                                    <div
                                        className="min-h-[220px] rounded-md border border-border bg-muted/10 p-4 text-sm leading-6 text-foreground [&_p]:my-0 [&_p+ul]:mt-2 [&_p+ol]:mt-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_h1]:my-1 [&_h2]:my-1 [&_h3]:my-1 [&_h4]:my-1"
                                        dangerouslySetInnerHTML={{ __html: sanitizeInstructionsHtml(bookingInstructions) }}
                                    />
                                ) : (
                                    <div className="min-h-[220px] rounded-md border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                                        No booking instructions have been added yet.
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <Label className="text-sm font-semibold text-foreground">Instructions</Label>
                                <div className="relative">
                                    <RichTextEditor
                                        value={instructionsDraft}
                                        onChange={setInstructionsDraft}
                                        className="min-h-[260px]"
                                    />
                                    <p className={cn(
                                        "pointer-events-none absolute bottom-2 right-3 text-xs",
                                        getWordCountFromHtml(instructionsDraft || "") > BOOKING_INSTRUCTIONS_WORD_LIMIT
                                            ? "text-red-500"
                                            : "text-muted-foreground"
                                    )}>
                                        {getWordCountFromHtml(instructionsDraft || "")}/{BOOKING_INSTRUCTIONS_WORD_LIMIT}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="-mx-6 -mb-6 px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 mt-4">
                            {!isEditingInstructions ? (
                                <>
                                    <Button
                                        variant="heroOutline"
                                        className="h-9 px-5"
                                        onClick={handleCloseInstructionsPanel}
                                    >
                                        Close
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="heroOutline"
                                        className="h-9 px-5"
                                        onClick={handleCancelInstructionsEdit}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="hero"
                                        className="h-9 px-5"
                                        disabled={isSavingInstructions || !currentPropertyId}
                                        onClick={handleUpdateInstructions}
                                    >
                                        {isSavingInstructions ? "Saving..." : "Save"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>



        </div>
    );
}

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div className="space-y-1">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? "\u2014"}</p>
        </div>
    );
}

function Price({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span>₹ {value}</span>
        </div>
    );
}

function formatDateDisplay(date?: string) {
    if (!date) return "\u2014";
    return formatAppDate(date);
}
