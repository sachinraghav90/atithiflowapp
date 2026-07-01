import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { NativeSelect } from "@/components/ui/native-select";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import {
    useGetPropertyEnquiriesQuery,
    useGetEnquiryKpisQuery,
    useLazyExportPropertyEnquiriesQuery,
    useUpdateEnquiryMutation,
    useGetStaffByPropertyQuery,
    useGetLogsQuery as useGetAuditLogsQuery,
    useGetLogsByTableQuery,
    useGetBookingsQuery,
    useGetRoomTypesQuery,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { cn } from "@/lib/utils";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { formatReadableLabel } from "@/utils/formatString";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarRangePicker } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, Plus, RefreshCcw, User, Phone, MapPin, Calendar, Clock, ClipboardList, Info, Building2, Package, Globe, UserCheck, DollarSign, ListTodo, Activity } from "lucide-react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { exportToExcel } from "@/utils/exportToExcel";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { GridBadge } from "@/components/ui/grid-badge";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { formatAppDate, formatAppDateTime, parseAppDate, toDatetimeLocalValue } from "@/utils/dateFormat";
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import { getFormattedAuditChanges, getAuditChangeText, getAuditActionBadge, formatAuditActionText } from "@/utils/auditUtils";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\d{5,15}$/;
const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());
const isValidPhone = (phone: string) => PHONE_REGEX.test(phone.replace(/\D/g, ""));

type EnquiryStatus =
    | "open"
    | "follow_up"
    | "reserved"
    | "booked"
    | "closed"
    | "cancelled";

type Enquiry = {
    id: string;
    property_id: string;
    enquiry_sequence?: string | number;
    booking_id: string | null;

    guest_name: string;
    mobile: string;
    email: string;

    source: string;
    enquiry_type: string;
    status: EnquiryStatus;

    agent_name?: string | null;
    agent_type?: string | null;

    contact_method?: string | null;
    city?: string | null;
    nationality?: string | null;
    plan?: string | null;

    total_members?: string | null;
    senior_citizens?: string | null;
    child?: string | null;
    specially_abled?: string | null;

    room_details?: {
        room_type: string;
        no_of_rooms: number;
    }[];

    room_type?: string | null;
    no_of_rooms?: number | null;

    check_in?: string | null;
    check_out?: string | null;

    booked_by?: string | null;
    comment?: string | null;
    follow_up_date?: string | null;

    quote_amount?: string | null;
    offer_amount?: string | null;

    is_reserved: boolean;
    is_active: boolean;

    has_alternate_stay?: boolean;
    alternate_check_in?: string | null;
    alternate_check_out?: string | null;
    alternate_room_details?: {
        room_type: string;
        no_of_rooms: number;
    }[] | null;

    created_by?: string;
    created_on?: string;
    updated_by?: string | null;
    updated_on?: string | null;
};

const ENQUIRY_STATUS_OPTIONS: Array<{ label: string; value: EnquiryStatus }> = [
    { label: "Open", value: "open" },
    { label: "Follow Up", value: "follow_up" },
    { label: "Booked", value: "booked" },
    { label: "Closed", value: "closed" },
    { label: "Cancelled", value: "cancelled" },
];

function formatEnquiryStatus(status?: string | null) {
    return formatReadableLabel(status) || "—";
}

function formatEnquiryDate(value?: string | null) {
    return formatAppDate(value);
}

function formatEnquiryCurrency(value?: string | null) {
    return value ? `₹${value}` : "—";
}

function getEnquiryDisplay(enquiry: Enquiry) {
    return {
        primaryLabel: enquiry.guest_name || enquiry.mobile || enquiry.email || enquiry.id,
        contactLabel: enquiry.mobile || "--",
        cityLabel: enquiry.city || "--",
        offerAmountLabel: formatEnquiryCurrency(enquiry.offer_amount),
        checkInLabel: formatEnquiryDate(enquiry.check_in),
        checkOutLabel: formatEnquiryDate(enquiry.check_out),
        statusLabel: formatEnquiryStatus(enquiry.status),
        followUpLabel: enquiry.follow_up_date ? formatAppDateTime(enquiry.follow_up_date) : "--",
    };
}

function getAuditActionLabel(log: any) {
    return getAuditActionBadge(log.event_type);
}

function getAuditChangeText(log: any, plainText = false) {
    if (log.event_type === "CREATE" || log.event_type === "NEW_BOOKING") {
        const text = log.event_type === "NEW_BOOKING" ? "New Booking Created" : "Created";
        if (plainText) return `Enquiry: ${text}`;
        return (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Enquiry:</span> {text}
            </div>
        );
    }

    try {
        const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
        if (!details || (!details.before && !details.after)) return log.comments || "—";

        const formattedDetails: any = { before: {}, after: {} };
        const { before, after } = details;

        if (before.status !== after.status) {
            formattedDetails.before["Lead Status"] = formatEnquiryStatus(before.status);
            formattedDetails.after["Lead Status"] = formatEnquiryStatus(after.status);
        }
        if (before.follow_up_date !== after.follow_up_date) {
            formattedDetails.before["Follow-up Date & Time"] = before.follow_up_date ? formatAppDateTime(before.follow_up_date) : "None";
            formattedDetails.after["Follow-up Date & Time"] = after.follow_up_date ? formatAppDateTime(after.follow_up_date) : "None";
        }
        if (before.comment !== after.comment) {
            const parseComment = (c: string) => {
                if (!c) return { source: null, notes: "None" };
                const match = c.match(/^Source:\s*([^|]+)\|\s*(.*)$/s);
                if (match) {
                    return { source: match[1].trim(), notes: match[2].trim() || "None" };
                }
                return { source: null, notes: c };
            };

            const bParsed = parseComment(before.comment);
            const aParsed = parseComment(after.comment);

            if (bParsed.source !== aParsed.source) {
                formattedDetails.before["Source"] = bParsed.source || "None";
                formattedDetails.after["Source"] = aParsed.source || "None";
            }
            
            if (bParsed.notes !== aParsed.notes || bParsed.source === aParsed.source) {
                formattedDetails.before["Enquiry Notes"] = bParsed.notes;
                formattedDetails.after["Enquiry Notes"] = aParsed.notes;
            }
        }
        if (after.contact_method) {
            formattedDetails.before["Method"] = before.contact_method ? String(before.contact_method).replace("_", " ") : "None";
            formattedDetails.after["Method"] = after.contact_method ? String(after.contact_method).replace("_", " ") : "None";
        }
        if (after.mobile) {
            formattedDetails.before["Phone/WhatsApp"] = before.mobile || "None";
            formattedDetails.after["Phone/WhatsApp"] = after.mobile || "None";
        }
        if (after.email) {
            formattedDetails.before["Email"] = before.email || "None";
            formattedDetails.after["Email"] = after.email || "None";
        }
        if (before.booking_id !== after.booking_id) {
            formattedDetails.before["Booking"] = before.booking_id ? `BO${before.booking_id}` : "None";
            formattedDetails.after["Booking"] = after.booking_id ? `BO${after.booking_id}` : "None";
        }
        if (before.booking_shift_comment !== after.booking_shift_comment) {
            formattedDetails.before["Comment"] = before.booking_shift_comment || "None";
            formattedDetails.after["Comment"] = after.booking_shift_comment || "None";
        }

        if (plainText) {
            return getAuditChangePlainText(formattedDetails);
        }
        return getFormattedAuditChanges(formattedDetails);
    } catch (e) {
        return log.comments || "—";
    }
}

export default function EnquiriesManagement() {
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selected, setSelected] = useState<Enquiry | null>(null);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLimit, setHistoryLimit] = useState(25);


    const [activeTab, setActiveTab] = useState<"enquiry" | "audit">("enquiry");
    const [auditSearchInput, setAuditSearchInput] = useState("");
    const [auditSearchQuery, setAuditSearchQuery] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("");
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [kpiDateRange, setKpiDateRange] = useState<[Date | null, Date | null]>(() => {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return [lastMonth, today];
    });
    const [auditPage, setAuditPage] = useState(1);
    const [auditLimit, setAuditLimit] = useState(10);

    const [status, setStatus] = useState<EnquiryStatus>("open");
    const [followUpDate, setFollowUpDate] = useState<string>("");
    const [followUpSource, setFollowUpSource] = useState<string>("Phone");
    const [followUpSourceValue, setFollowUpSourceValue] = useState<string>("");
    const [countryCode, setCountryCode] = useState<string>("+91");
    const [comment, setComment] = useState("");
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const { data: roomTypesData } = useGetRoomTypesQuery(
        { propertyId: selected?.property_id || selectedPropertyId, limit: 100 },
        { skip: !selected?.property_id && !selectedPropertyId }
    );

    const getRoomTypeName = (roomTypeValue: any, index?: number) => {
        if (!roomTypeValue) return `Room ${index !== undefined ? index + 1 : ''}`;

        const value = String(roomTypeValue).trim();

        const roomTypes =
            roomTypesData?.roomTypes ||
            roomTypesData?.data ||
            roomTypesData?.rooms ||
            roomTypesData?.results ||
            roomTypesData ||
            [];

        const list = Array.isArray(roomTypes) ? roomTypes : [];

        const matched = list.find((item: any) => {
            const possibleIds = [
                item?.id,
                item?.room_type_id,
                item?.category_id,
                item?.ref_room_type_id,
                item?.category?.id,
            ];

            return possibleIds.some((id) => String(id) === value);
        });

        if (matched) {
            return (
                matched?.category?.name ||
                matched?.name ||
                matched?.room_type ||
                matched?.category_name ||
                matched?.room_category_name ||
                matched?.title ||
                value
            );
        }

        const isNumeric = /^[0-9]+$/.test(value);

        if (isNumeric) {
            return `Room Type #${value}`;
        }

        return value;
    };

    const getGroupedRoomRequirements = (roomDetails: any[] | null | undefined) => {
        if (!roomDetails || !roomDetails.length) return [];

        const groupedMap = new Map();
        
        roomDetails.forEach((room, index) => {
            const resolvedName = getRoomTypeName(room.room_type, index);
            
            if (groupedMap.has(resolvedName)) {
                groupedMap.get(resolvedName).no_of_rooms += (Number(room.no_of_rooms) || 0);
            } else {
                groupedMap.set(resolvedName, {
                    ...room,
                    resolvedName,
                    no_of_rooms: Number(room.no_of_rooms) || 0,
                });
            }
        });

        return Array.from(groupedMap.values());
    };

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "">("");

    const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string>("");
    const [bookingShiftComment, setBookingShiftComment] = useState<string>("");

    const { data: bookingsData, isLoading: bookingsLoading } = useGetBookingsQuery(
        { propertyId: selectedPropertyId ?? 0, limit: 1000 },
        { skip: !bookingSheetOpen || !selectedPropertyId }
    );

    const { data: staffData } = useGetStaffByPropertyQuery({ 
        property_id: selectedPropertyId 
    }, { 
        skip: !isLoggedIn || !selectedPropertyId 
    });

    const staffMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (staffData?.data) {
            staffData.data.forEach((staff: any) => {
                const name = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
                if (staff.user_id) {
                    map[staff.user_id] = name || staff.email || staff.user_id;
                }
            });
        }
        return map;
    }, [staffData]);

    const navigate = useNavigate()

    const openManage = (enquiry: Enquiry, edit: boolean = false) => {
        setSelected(enquiry);
        setEditMode(edit);
        setStatus(enquiry.status || "open");
        setFollowUpDate(enquiry.follow_up_date ? toDatetimeLocalValue(new Date(enquiry.follow_up_date)) : "");
        setComment("");
        setFormErrors({});
        setSubmitted(false);
        setFollowUpSource("Phone");
        setFollowUpSourceValue(enquiry.mobile || "");
        if (enquiry.mobile?.startsWith("+")) {
            const parts = enquiry.mobile.split(" ");
            setCountryCode(parts[0]);
            setFollowUpSourceValue(parts.slice(1).join(" "));
        }
        setFormErrors({});
        setSubmitted(false);
        setEditMode(edit);
        setOpen(true);
    };
    const { myProperties, isMultiProperty, isInitializing } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: enquiries, isLoading: enquiryLoading, isFetching: enquiryFetching, refetch } = useGetPropertyEnquiriesQuery({
        propertyId: selectedPropertyId,
        page,
        limit,
        search: searchQuery,
        status: statusFilter,
        fromDate: dateRange[0] ? dateRange[0].toISOString() : undefined,
        toDate: dateRange[1] ? dateRange[1].toISOString() : undefined,
    }, {
        skip: !isLoggedIn || !selectedPropertyId || isInitializing
    })

    const { data: kpiData, isLoading: kpiLoading } = useGetEnquiryKpisQuery({
        propertyId: selectedPropertyId,
        from: kpiDateRange[0] ? kpiDateRange[0].toISOString() : "",
        to: kpiDateRange[1] ? kpiDateRange[1].toISOString() : "",
    }, {
        skip: !isLoggedIn || !selectedPropertyId,
    });

    const { data: auditLogs, isLoading: auditLoading } = useGetAuditLogsQuery(
        {
            tableName: "enquiries",
            eventId: selected?.id,
            page: historyPage,
            limit: historyLimit,
        },
        { skip: !selected?.id || sheetTab !== "history" }
    );

    const { data: globalAuditLogs, isLoading: globalAuditLoading, isFetching: globalAuditFetching, refetch: refetchGlobalLogs } = useGetLogsByTableQuery({
        tableName: "enquiries",
        propertyId: selectedPropertyId,
        page: 1,
        limit: 1000
    }, {
        skip: !isLoggedIn || !selectedPropertyId || activeTab !== "audit"
    });

    const filteredAuditLogs = useMemo(() => {
        let logs = globalAuditLogs?.data || [];
        if (auditActionFilter) {
            logs = logs.filter((log: any) => log.event_type === auditActionFilter);
        }
        if (auditSearchQuery) {
            const query = auditSearchQuery.toLowerCase();
            logs = logs.filter((log: any) => {
                const idMatch = formatModuleDisplayId("enquiry", log.event_id).toLowerCase().includes(query);
                const userMatch = (staffMap[log.user_id] || log.user_first_name || "").toLowerCase().includes(query);
                return idMatch || userMatch;
            });
        }
        return logs;
    }, [globalAuditLogs?.data, auditActionFilter, auditSearchQuery, staffMap]);

    const paginatedAuditLogs = useMemo(() => {
        const start = (auditPage - 1) * auditLimit;
        return filteredAuditLogs.slice(start, start + auditLimit);
    }, [filteredAuditLogs, auditPage, auditLimit]);

    const exportHistoryLogs = () => {
        if (!filteredAuditLogs.length) {
            toast.info("No audit logs to export");
            return;
        }

        const formatted = filteredAuditLogs.map((log: any) => {
            const userName = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || staffMap[log.user_id] || "System";
            return {
                "Enquiry ID": formatModuleDisplayId("enquiry", log.event_id),
                "Action": formatAuditActionText(log.event_type),
                "Change": getAuditChangeText(log, true),
                "User": userName,
                "Date & Time": formatAppDateTime(log.created_on),
            };
        });

        exportToExcel(formatted, "EnquiriesAuditLogs.xlsx");
        toast.success("History exported successfully");
    };

    const refreshHistoryGrid = async () => {
        if (globalAuditFetching) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchGlobalLogs();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const [getAllEnquiries, { isFetching: exportingEnquiries }] = useLazyExportPropertyEnquiriesQuery()
    const [updateEnquiry, { isLoading: isUpdating }] = useUpdateEnquiryMutation()

    const handleUpdateBookingId = async () => {
        if (!selected) return;

        if (!bookingShiftComment.trim()) {
            toast.error("Comment is required");
            return;
        }

        const payload = {
            booking_id: selectedBookingId ? Number(selectedBookingId) : null,
            booking_shift_comment: bookingShiftComment
        };
        try {
            await updateEnquiry({ id: selected.id, payload }).unwrap();
            toast.success("Booking ID updated successfully!");
            setBookingSheetOpen(false);
            setSelected({ ...selected, booking_id: payload.booking_id });
            refetch();
        } catch (error) {
            toast.error("Failed to update booking ID");
        }
    };

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId, searchQuery, statusFilter, dateRange]);

    const exportEnquiriesSheet = async () => {
        if (exportingEnquiries) return;

        const totalRecords = enquiries?.pagination?.totalItems ?? enquiries?.pagination?.total ?? (enquiries?.data?.length || 0);
        if (!totalRecords) {
            toast.info("No enquiries to export");
            return;
        }

        const toastId = toast.loading("Preparing enquiries export...");

        try {
            const res = await getAllEnquiries({
                propertyId: selectedPropertyId,
                status: statusFilter,
                search: searchQuery,
                fromDate: dateRange[0] ? dateRange[0].toISOString() : undefined,
                toDate: dateRange[1] ? dateRange[1].toISOString() : undefined,
            }).unwrap();

            if (!res?.data?.length) {
                toast.dismiss(toastId);
                toast.info("No enquiries to export");
                return;
            }

            const formatted = res.data.map((enquiry: Enquiry) => {
                const displayEnquiry = getEnquiryDisplay(enquiry);

                return {
                    "Enquiry ID": formatModuleDisplayId("enquiry", enquiry.enquiry_sequence || enquiry.id),
                    Name: displayEnquiry.primaryLabel,
                    Contact: displayEnquiry.contactLabel,
                    City: displayEnquiry.cityLabel,
                    "Offer Amount": displayEnquiry.offerAmountLabel,
                    "Check In": displayEnquiry.checkInLabel,
                    "Check Out": displayEnquiry.checkOutLabel,
                    Status: displayEnquiry.statusLabel,
                    "Follow Up": displayEnquiry.followUpLabel,
                };
            });

            exportToExcel(formatted, "Enquiries.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export enquiries");
        }
    };

    const handleSourceChange = (val: string) => {
        setFollowUpSource(val);
        setFormErrors(p => ({ ...p, followUpSource: "", followUpSourceValue: "" }));
        if (selected) {
            if (val === "Phone" || val === "WhatsApp") {
                if (selected.mobile) {
                    const parts = selected.mobile.split(" ");
                    if (parts.length > 1 && parts[0].startsWith("+")) {
                        setCountryCode(parts[0]);
                        setFollowUpSourceValue(parts.slice(1).join(" "));
                    } else {
                        setCountryCode("+91");
                        setFollowUpSourceValue(selected.mobile);
                    }
                } else {
                    setFollowUpSourceValue("");
                }
            } else if (val === "Email") {
                setFollowUpSourceValue(selected.email || "");
            } else {
                setFollowUpSourceValue("");
            }
        }
    };

    const handleUpdate = async () => {
        if (!selected) return;

        setSubmitted(true);
        const newErrors: Record<string, string> = {};

        if (!status) {
            newErrors.status = "Enquiry Status is required";
        }
        if (!followUpDate) {
            newErrors.followUpDate = "Follow-up Date & Time is required";
        }
        if (!followUpSource) {
            newErrors.followUpSource = "Method is required";
        }
        if (!followUpSourceValue.trim()) {
            newErrors.followUpSourceValue = `${followUpSource} is required`;
        } else if (followUpSource === "Email" && !isValidEmail(followUpSourceValue)) {
            newErrors.followUpSourceValue = "Invalid email address";
        } else if ((followUpSource === "Phone" || followUpSource === "WhatsApp") && !isValidPhone(followUpSourceValue)) {
            newErrors.followUpSourceValue = "Invalid mobile number";
        }
        if (!comment.trim()) {
            newErrors.comment = "Enquiry Notes is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            return;
        }

        const payload: any = {
            status,
            ...(followUpDate && { follow_up_date: followUpDate }),
            comment,
            contact_method: followUpSource === "Phone" ? "PHONE_CALL" : followUpSource.toUpperCase(),
        };

        if (followUpSource === "Email") {
            payload.email = followUpSourceValue;
        } else {
            payload.mobile = `${countryCode} ${followUpSourceValue}`;
        }

        const promise = updateEnquiry({ id: selected.id, payload }).unwrap()

        await toast.promise(promise, {
            error: "Error updating enquiry",
            pending: "Updating please wait",
            success: "Enquiry updated successfully"
        })

        setOpen(false);
    };

    function handleBook(enquiry: Enquiry) {
        navigate("/reservation", {
            state: {
                fromEnquiry: true,
                enquiryId: enquiry.id,
                enquiry,
            },
        });
    }

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)
    const { permission: bookingPermission } = usePermission("/bookings", { autoRedirect: false })

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        setDateRange([null, null]);
        setPage(1);
    };

    const resetHistoryFiltersHandler = () => {
        setAuditSearchInput("");
        setAuditSearchQuery("");
        setAuditActionFilter("");
        setAuditPage(1);
    };

    const refreshTable = async () => {
        if (enquiryLoading) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetch();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh");
        }
    };

    const enquiryRows = useMemo(() => enquiries?.data ?? [], [enquiries?.data]);

    const enquiryColumns = useMemo<ColumnDef<Enquiry>[]>(() => [
        {
            label: "Enquiry ID",
            headClassName: "text-center w-[120px]",
            cellClassName: "text-center font-medium text-primary min-w-[120px]",
            render: (enquiry) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => openManage(enquiry, false)}
                    aria-label={`Open summary view for enquiry ${formatModuleDisplayId("enquiry", enquiry.enquiry_sequence || enquiry.id)}`}
                >
                    {formatModuleDisplayId("enquiry", enquiry.enquiry_sequence || enquiry.id)}
                </button>
            ),
        },
        {
            label: "Name",
            cellClassName: "font-medium whitespace-nowrap max-w-[150px] truncate",
            render: (enquiry) => getEnquiryDisplay(enquiry).primaryLabel,
        },
        {
            label: "Contact",
            cellClassName: "font-medium whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).contactLabel,
        },
        {
            label: "City",
            cellClassName: "text-slate-700 whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).cityLabel,
        },
        {
            label: "Offer Amount",
            headClassName: "text-center",
            cellClassName: "text-center font-medium whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).offerAmountLabel,
        },
        {
            label: "Check In",
            headClassName: "text-center",
            cellClassName: "text-center text-xs text-slate-700 whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).checkInLabel,
        },
        {
            label: "Check Out",
            headClassName: "text-center",
            cellClassName: "text-center text-xs text-slate-700 whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).checkOutLabel,
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center whitespace-nowrap",
            render: (enquiry) => (
                <GridBadge status={enquiry.status} statusType="enquiry">
                    {getEnquiryDisplay(enquiry).statusLabel}
                </GridBadge>
            ),
        },
        {
            label: "Follow Up",
            headClassName: "text-center",
            cellClassName: "text-center text-xs text-slate-700 whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).followUpLabel,
        },
    ], []);

    const auditColumns = useMemo<ColumnDef<any>[]>(() => [

        {
            label: "Action",
            headClassName: "text-center w-[140px]",
            cellClassName: "text-center font-medium min-w-[140px]",
            render: (log) => getAuditActionBadge(log.event_type),
        },
        {
            label: "Updated By",
            cellClassName: "whitespace-nowrap",
            render: (log) => {
                const name = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim();
                return name || staffMap[log.user_id] || "System";
            },
        },
        {
            label: "Date & Time",
            headClassName: "text-white w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
            render: (log) => formatAppDateTime(log.created_on),
        },
        {
            label: "Changes",
            cellClassName: "min-w-[300px] py-2",
            render: (log) => getAuditChangeText(log),
        },
    ], [staffMap]);

    return (
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Enquiries</h1>
                        <p className="text-sm text-muted-foreground">
                            Track and manage customer enquiries
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isMultiProperty && (
                            <div className="flex items-center h-9 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <div className="flex-1 min-w-0 h-full">
                                    <MenuItemSelect
                                        value={selectedPropertyId ?? ""}
                                        items={myProperties?.properties?.map((p: any) => ({ id: p.id, label: p.brand_name })) || []}
                                        onSelect={(val) => {
                                            setSelectedPropertyId(Number(val) || null);
                                            setPage(1);
                                        }}
                                        itemName="label"
                                        placeholder="Select Property"
                                        extraClasses="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2"
                                    />
                                </div>
                            </div>
                        )}

                        {permission?.can_create && (
                            <Button
                                variant="hero"
                                className="h-10 px-4 flex items-center gap-2"
                                onClick={() => navigate("/create-enquiry")}
                            >
                                <Plus className="w-4 h-4" /> New Enquiry
                            </Button>
                        )}
                    </div>
                </div>

                <div className="border-b border-border flex">
                    <button
                            onClick={() => setActiveTab("enquiry")}
                            className={cn(
                                "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                                activeTab === "enquiry"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Enquiries
                        </button>
                    <button
                            onClick={() => setActiveTab("audit")}
                            className={cn(
                                "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                                activeTab === "audit"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            History
                        </button>
                </div>

                {activeTab === "enquiry" && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-end items-center">
                                <div className="w-fit">
                                    <GridToolbarRangePicker
                                        startDate={kpiDateRange[0]}
                                        endDate={kpiDateRange[1]}
                                        onChange={(dates) => setKpiDateRange(dates)}
                                        startLabel="KPI"
                                        endLabel="To"
                                        className="bg-background border-border shadow-sm h-9"
                                    />
                                </div>
                            </div>
                            
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Total</p>
                                    <h3 className="text-lg font-bold text-primary">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.total_enquiries || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Converted</p>
                                    <h3 className="text-lg font-bold text-green-600">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.converted || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Converted but Canceled</p>
                                    <h3 className="text-lg font-bold text-destructive">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.converted_but_canceled || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Open</p>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.all_status?.["open"] || kpiData?.all_status?.["Open"] || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Follow Up</p>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.all_status?.["follow_up"] || kpiData?.all_status?.["Follow Up"] || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Booked</p>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.all_status?.["booked"] || kpiData?.all_status?.["Booked"] || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Closed</p>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.all_status?.["closed"] || kpiData?.all_status?.["Closed"] || 0)}
                                    </h3>
                                </div>
                                <div className="bg-background rounded-[3px] border border-border px-3 py-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-muted-foreground   tracking-wider truncate mr-2">Cancelled</p>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {kpiLoading ? <span className="animate-pulse bg-muted rounded w-8 h-4 block"></span> : (kpiData?.all_status?.["cancelled"] || kpiData?.all_status?.["Cancelled"] || 0)}
                                    </h3>
                                </div>
                            </div>
                        </div>

                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchInput}
                                    onChange={setSearchInput}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        setPage(1);
                                    }}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value as EnquiryStatus | "");
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...ENQUIRY_STATUS_OPTIONS,
                                    ]}
                                />

                                <GridToolbarRangePicker
                                    startDate={dateRange[0]}
                                    endDate={dateRange[1]}
                                    onChange={(dates) => {
                                        setDateRange(dates);
                                        setPage(1);
                                    }}
                                    startLabel="From"
                                    endLabel="To"
                                    className="w-full"
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Enquiries",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportEnquiriesSheet,
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
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={enquiryColumns}
                            data={enquiryRows}
                            loading={enquiryLoading || enquiryFetching || isInitializing}
                            emptyText="No enquiries found"
                            minWidth="1080px"
                            actionClassName="text-center w-[60px]"
                            className="mt-0"
                            actions={(enquiry) => {
                                return (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                onClick={() => openManage(enquiry, true)}
                                                aria-label={`Manage enquiry ${enquiry.id}`}
                                            >
                                                <Pencil className="w-3.5 h-3.5 mx-auto" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Manage Enquiry</TooltipContent>
                                    </Tooltip>
                                );
                            }}
                            enablePagination={!!enquiries?.pagination}
                            paginationProps={{
                                page,
                                totalPages: enquiries?.pagination?.totalPages ?? 1,
                                setPage,
                                disabled: !enquiries,
                                totalRecords: enquiries?.pagination?.totalItems ?? enquiries?.pagination?.total ?? enquiries?.data?.length ?? 0,
                                limit,
                                onLimitChange: (value) => {
                                    setLimit(value);
                                    setPage(1);
                                },
                            }}
                        />
                    </div>
                </div>
                </div>
                )}

                {activeTab === "audit" && (
                    <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={auditSearchInput}
                                        onChange={(v) => {
                                            setAuditSearchInput(v);
                                            if (!v.trim()) {
                                                setAuditSearchQuery("");
                                                setAuditPage(1);
                                            }
                                        }}
                                        onSearch={() => {
                                            setAuditSearchQuery(auditSearchInput.trim());
                                            setAuditPage(1);
                                        }}

                                    />
                                    <GridToolbarSelect
                                        label="Action"
                                        value={auditActionFilter}
                                        onChange={(v) => {
                                            setAuditActionFilter(v);
                                            setAuditPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            { label: "CREATE", value: "CREATE" },
                                            { label: "UPDATE", value: "UPDATE" },
                                            { label: "DELETE", value: "DELETE" },
                                        ]}
                                    />
                                    <div className="w-full" />
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
                                                onClick: resetHistoryFiltersHandler,
                                            },
                                            {
                                                key: "refresh",
                                                label: "Refresh Data",
                                                icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: refreshHistoryGrid,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>

                        <div className="px-2 pb-2">
                            <AppDataGrid
                                density="compact"
                                columns={[
                                    {
                                        label: "Enquiry ID",
                                        headClassName: "text-center w-[120px]",
                                        cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                        render: (log) => formatModuleDisplayId("enquiry", log.event_id),
                                    },
                                    {
                                        label: "Action",
                                        headClassName: "text-center w-[140px]",
            cellClassName: "text-center font-medium min-w-[140px]",
                                        render: (log) => getAuditActionBadge(log.event_type),
                                    },
                                    {
                                        label: "Change",
                                        headClassName: "w-[320px]",
            cellClassName: "min-w-[320px] whitespace-normal text-primary/80 font-medium",
                                        render: (log) => getAuditChangeText(log),
                                    },
                                    {
                                        label: "User",
                                        headClassName: "w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
                                        render: (log) => {
                                            const name = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim();
                                            return name || staffMap[log.user_id] || "System";
                                        },
                                    },
                                    {
                                        label: "Date & Time",
                                        headClassName: "text-white w-[180px]",
                                        cellClassName: "text-muted-foreground min-w-[180px]",
                                        render: (log) => formatAppDateTime(log.created_on),
                                    },
                                ]}
                                data={paginatedAuditLogs}
                                loading={globalAuditLoading || globalAuditFetching}
                                emptyText="No history records found"
                                minWidth="800px"
                                className="mt-0"
                                enablePagination
                                paginationProps={{
                                    page: auditPage,
                                    totalPages: Math.ceil(filteredAuditLogs.length / auditLimit) || 1,
                                    setPage: setAuditPage,
                                    disabled: globalAuditFetching,
                                    totalRecords: filteredAuditLogs.length,
                                    limit: auditLimit,
                                    onLimitChange: (value) => {
                                        setAuditLimit(value);
                                        setAuditPage(1);
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Manage Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className={cn("w-full overflow-y-auto bg-background transition-all duration-300", sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-4xl sm:max-w-3xl")}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                       
                            <SheetHeader className="px-6 py-4 -mx-6 mb-3 border-b">
                            <div className="space-y-0.5">
                                <SheetTitle className="text-xl font-bold">
                                    {editMode ? "Update Enquiry" : "Enquiry"}
                                    {selected?.id && <span className="ml-2">[#{formatModuleDisplayId("enquiry", selected.enquiry_sequence || selected.id)}]</span>}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {editMode 
                                        ? `Adjust lead lifecycle and internal notes` 
                                        : `Comprehensive summary of lead configuration`}
                                </p>
                            </div>
                        </SheetHeader>

                        {!editMode && (
                            <div className="border-b border-border flex mb-4">
                                <button
                                    onClick={() => setSheetTab("summary")}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
                                        sheetTab === "summary"
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setSheetTab("history")}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 ",
                                        sheetTab === "history"
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    History
                                </button>
                            </div>
                        )}

                        {selected && !editMode && (
                            <div className="space-y-4">
                                {sheetTab === "summary" && (
                                    <div className="space-y-4">
                                        <CardSectionView title="Guest Profile" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                                            <ViewField label="Guest Name" value={selected.guest_name} />
                                            <ViewField label="Mobile" value={selected.mobile} />
                                            <ViewField label="Email" value={selected.email} />
                                            <ViewField label="City" value={selected.city} />
                                            <ViewField label="Source" value={selected.source || "Direct"} />
                                            <ViewField label="Enquiry Type" value={selected.enquiry_type || "General"} />
                                        </CardSectionView>

                                        <CardSectionView title="Stay Schedule" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                                            <ViewField label="Check In" value={selected.check_in ? formatAppDate(selected.check_in) : "—"} />
                                            <ViewField label="Check Out" value={selected.check_out ? formatAppDate(selected.check_out) : "—"} />
                                            <ViewField label="Selected Plan" value={selected.plan} />
                                            <ViewField label="Status" value={formatEnquiryStatus(selected.status)} />
                                            <ViewField 
                                                label="Booking ID" 
                                                value={
                                                    <div className="flex items-center gap-2">
                                                        {selected.booking_id ? formatModuleDisplayId("booking", selected.booking_id) : "N/A"}
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setSelectedBookingId(selected.booking_id ? String(selected.booking_id) : "");
                                                                            setBookingShiftComment(""); 
                                                                            setBookingSheetOpen(true);
                                                                        }}
                                                                        className="rounded-[4px] border-2 border-primary bg-background text-primary hover:bg-primary hover:text-white transition-all h-5 w-5 flex items-center justify-center shadow-sm"
                                                                    >
                                                                        <Pencil className="w-3 h-3 stroke-[2.5]" />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {selected.booking_id ? "Update Booking ID" : "Set Booking ID"}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                } 
                                            />
                                        </CardSectionView>

                                        <CardSectionView title="Room Requirements" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                                            {selected.room_details?.length ? (
                                                getGroupedRoomRequirements(selected.room_details).map((room, i) => (
                                                    <ViewField
                                                        key={i}
                                                        label={room.resolvedName}
                                                        value={`${room.no_of_rooms || 0} ${Number(room.no_of_rooms) === 1 ? "Room" : "Rooms"}`}
                                                    />
                                                ))
                                            ) : (
                                                <ViewField
                                                    label="Room Requirements"
                                                    value="No specific room requirements documented."
                                                    className="sm:col-span-3"
                                                />
                                            )}
                                            <ViewField label="Total Guests" value={`${selected.total_members || 0} Members • ${selected.child || 0} Children`} />
                                            <ViewField label="Offer Amount" value={selected.offer_amount ? `₹ ${selected.offer_amount}` : "—"} />
                                        </CardSectionView>

                                        {selected.has_alternate_stay && (
                                            <CardSectionView title="Alternate Stay Schedule" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                <ViewField label="Check In" value={selected.alternate_check_in ? formatAppDate(selected.alternate_check_in) : "—"} />
                                                <ViewField label="Check Out" value={selected.alternate_check_out ? formatAppDate(selected.alternate_check_out) : "—"} />
                                                
                                                <div className="sm:col-span-2 space-y-2 mt-2">
                                                    <h4 className="text-xs font-semibold text-muted-foreground  tracking-wide"></h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                                        {selected.alternate_room_details?.length ? (
                                                            getGroupedRoomRequirements(selected.alternate_room_details).map((room, i) => (
                                                                <ViewField
                                                                    key={i}
                                                                    label={room.resolvedName}
                                                                    value={`${room.no_of_rooms || 0} ${Number(room.no_of_rooms) === 1 ? "Room" : "Rooms"}`}
                                                                />
                                                            ))
                                                        ) : (
                                                            <ViewField
                                                                label="Alternate Room Requirements"
                                                                value="No specific alternate room requirements documented."
                                                                className="sm:col-span-2"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </CardSectionView>
                                        )}

                                        <CardSectionView title="Enquiry Notes" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 gap-y-4">
                                            {(() => {
                                                const commentStr = selected.comment || "";
                                                const match = commentStr.match(/^Source:\s*([^|]+)\|\s*(.*)$/s);
                                                if (match) {
                                                    return (
                                                        <>
                                                            <ViewField label="Follow-up Source" value={match[1].trim()} />
                                                            <ViewField label="Notes" value={match[2].trim() || "No activity notes recorded yet for this enquiry."} />
                                                        </>
                                                    );
                                                }
                                                return (
                                                    <ViewField
                                                        label="Notes"
                                                        value={commentStr || "No activity notes recorded yet for this enquiry."}
                                                    />
                                                );
                                            })()}
                                        </CardSectionView>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <div className="border border-border rounded-[3px] bg-background">
                                        <AppDataGrid
                                            density="compact"
                                            columns={auditColumns}
                                            data={auditLogs?.data || []}
                                            loading={auditLoading}
                                            emptyText="No history available for this enquiry"
                                            className="mt-0"
                                            minWidth="600px"
                                            enablePagination={!!auditLogs?.pagination}
                                            paginationProps={{
                                                page: historyPage,
                                                totalPages: auditLogs?.pagination?.totalPages ?? 1,
                                                setPage: setHistoryPage,
                                                disabled: !auditLogs,
                                                totalRecords: auditLogs?.pagination?.totalItems ?? auditLogs?.pagination?.total ?? auditLogs?.data?.length ?? 0,
                                                limit: historyLimit,
                                                onLimitChange: (val) => {
                                                    setHistoryLimit(val);
                                                    setHistoryPage(1);
                                                },
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selected && editMode && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 gap-4">
                                <div className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4 mb-3">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Enquiry Lifecycle Management
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-3">
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Enquiry Status *</Label>
                                            <NativeSelect
                                                className={cn("w-full h-11 bg-background shadow-none text-sm border-border/60", submitted && formErrors.status && "border-red-500 focus-visible:ring-red-500")}
                                                value={status}
                                                onChange={(e) => {
                                                    setStatus(e.target.value as EnquiryStatus);
                                                    setFormErrors(p => ({ ...p, status: "" }));
                                                }}
                                            >
                                                {ENQUIRY_STATUS_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </NativeSelect>
                                            {submitted && formErrors.status && <p className="text-[10px] text-red-500 font-medium">{formErrors.status}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={cn("text-foreground", submitted && formErrors.followUpDate && "text-red-500")}>Follow-up Date & Time *</Label>
                                            <ResponsiveDatePicker
                                                value={parseAppDate(followUpDate)}
                                                onChange={(date) => {
                                                    setFollowUpDate(toDatetimeLocalValue(date));
                                                    setFormErrors(p => ({ ...p, followUpDate: "" }));
                                                }}
                                                minDate={new Date(new Date().setDate(new Date().getDate() - 5))}
                                                maxDate={new Date()}
                                                showTime
                                                className={cn("h-11 rounded-[3px] bg-background border-border/60 text-sm w-full shadow-none", submitted && formErrors.followUpDate && "border-red-500")}
                                            />
                                            {submitted && formErrors.followUpDate && <p className="text-[10px] text-red-500 font-medium">{formErrors.followUpDate}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={cn("text-foreground", submitted && formErrors.followUpSource && "text-red-500")}>Method *</Label>
                                            <NativeSelect
                                                className={cn("w-full h-11 bg-background shadow-none text-sm border-border/60", submitted && formErrors.followUpSource && "border-red-500 focus-visible:ring-red-500")}
                                                value={followUpSource}
                                                onChange={(e) => handleSourceChange(e.target.value)}
                                            >
                                                <option value="" disabled>-- Select Method --</option>
                                                <option value="Phone">Phone</option>
                                                <option value="WhatsApp">WhatsApp</option>
                                                <option value="Email">Email</option>
                                            </NativeSelect>
                                            {submitted && formErrors.followUpSource && <p className="text-[10px] text-red-500 font-medium">{formErrors.followUpSource}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className={cn("text-foreground", submitted && formErrors.followUpSourceValue && "text-red-500")}>{(followUpSource || "Method Value")} *</Label>
                                            {followUpSource === "Email" ? (
                                                <Input
                                                    className={cn("h-11 bg-background shadow-none text-sm border-border/60", submitted && formErrors.followUpSourceValue && "border-red-500 focus-visible:ring-red-500")}
                                                    value={followUpSourceValue}
                                                    onChange={(e) => {
                                                        setFollowUpSourceValue(e.target.value);
                                                        setFormErrors(p => ({ ...p, followUpSourceValue: "" }));
                                                    }}
                                                    placeholder="Enter email address"
                                                    type="email"
                                                />
                                            ) : (
                                                <div className={cn("flex h-11 rounded-[3px] border border-border/60 overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring", submitted && formErrors.followUpSourceValue && "border-red-500 focus-within:ring-red-500")}>
                                                    <PhonePrefixSelect
                                                        value={countryCode}
                                                        onChange={(val) => setCountryCode(val)}
                                                        className="w-[100px] border-0 border-r border-border/60 rounded-none bg-transparent"
                                                    />
                                                    <Input
                                                        className="flex-1 border-0 rounded-none h-full bg-transparent shadow-none px-3"
                                                        value={followUpSourceValue}
                                                        onChange={(e) => {
                                                            setFollowUpSourceValue(e.target.value.replace(/\D/g, ""));
                                                            setFormErrors(p => ({ ...p, followUpSourceValue: "" }));
                                                        }}
                                                        placeholder="Enter phone number"
                                                        maxLength={15}
                                                    />
                                                </div>
                                            )}
                                            {submitted && formErrors.followUpSourceValue && <p className="text-[10px] text-red-500 font-medium">{formErrors.followUpSourceValue}</p>}
                                        </div>
                                        
                                        <div className="space-y-2 col-span-1 md:col-span-2 mt-2">
                                            <Label className={cn("text-foreground", submitted && formErrors.comment && "text-red-500")}>Enquiry Notes *</Label>
                                            <div className="relative">
                                                <textarea
                                                    className={cn("w-full min-h-[100px] rounded-[3px] border border-border/60 bg-background px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30 leading-relaxed resize-none shadow-none", submitted && formErrors.comment && "border-red-500 focus:ring-red-500")}
                                                    value={comment}
                                                    onChange={(e) => {
                                                        setComment(e.target.value);
                                                        setFormErrors(p => ({ ...p, comment: "" }));
                                                    }}
                                                    maxLength={500}
                                                    placeholder="Add new notes or follow-up details..."
                                                />
                                                <div className="absolute bottom-2 right-2 text-[10px] font-bold text-muted-foreground/60 bg-background/80 px-1">
                                                    {comment.length}/500
                                                </div>
                                            </div>
                                            {submitted && formErrors.comment && <p className="text-[10px] text-red-500 font-medium">{formErrors.comment}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {bookingPermission?.can_create && !selected.is_reserved && (
                                <div className="pb-4">
                                    <div className="p-4 rounded-[5px] border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-primary tracking-wide">Convert to Booking</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">Ready to confirm? Proceed to reservations with this enquiry data.</p>
                                        </div>
                                        <Button
                                            variant="heroOutline"
                                            className="h-10 px-6 text-xs font-bold flex items-center gap-2 bg-background shadow-sm hover:bg-primary/10 border-primary/30 text-primary"
                                            onClick={() => handleBook(selected)}
                                            disabled={status !== "booked"}
                                        >
                                            <Plus className="w-4 h-4" /> Book Enquiry
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                        <div className="-mx-6 -mb-6 px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                            <Button
                                variant="heroOutline"
                                onClick={() => setOpen(false)}
                            >
                                {editMode ? "Cancel" : "Close"}
                            </Button>

                            {editMode && (
                                <Button
                                    variant="hero"
                                    onClick={handleUpdate}
                                >
                                    Update
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>
            {/* Booking ID Update Sheet */}
            <Sheet open={bookingSheetOpen} onOpenChange={setBookingSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md bg-background overflow-y-auto">
                    <SheetHeader className="px-6 py-4 -mx-6 mb-3 border-b">
                        <div className="space-y-0.5">
                            <SheetTitle className="text-xl font-bold">Select Booking</SheetTitle>
                            <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                Link an existing booking to this enquiry
                            </p>
                        </div>
                    </SheetHeader>
                    <div className="space-y-6">
                        <div className="space-y-2 mt-4">
                            <Label className="text-foreground">Booking ID</Label>
                            <NativeSelect
                                className="w-full h-11 bg-background shadow-none text-sm border-border/60"
                                value={selectedBookingId}
                                onChange={(e) => setSelectedBookingId(e.target.value)}
                                disabled={bookingsLoading}
                            >
                                <option value="">--Please Select--</option>
                                {bookingsData?.bookings?.map((b: any) => {
                                    const guestText = b.guest_name ? ` - ${b.guest_name}` : "";
                                    return (
                                        <option key={b.id} value={b.id.toString()}>
                                            {`Booking #${formatModuleDisplayId("booking", b.id)}${guestText}`}
                                        </option>
                                    );
                                })}
                            </NativeSelect>
                        </div>
                        <div className="space-y-2 mt-4">
                            <Label className="text-foreground">Comment *</Label>
                            <Textarea
                                className="w-full bg-background shadow-none text-sm border-border/60 min-h-[80px]"
                                value={bookingShiftComment}
                                onChange={(e) => setBookingShiftComment(e.target.value)}
                                disabled={bookingsLoading || isUpdating}
                            />
                        </div>
                        <div className="flex gap-3 justify-end pt-4 border-t border-border mt-8">
                            <Button variant="outline" className="h-10 px-6 font-semibold" onClick={() => setBookingSheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                className="h-10 px-6 font-semibold bg-primary text-white hover:bg-primary/90" 
                                onClick={handleUpdateBookingId}
                                disabled={isUpdating}
                            >
                                {isUpdating ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
