import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToExcel } from "@/utils/exportToExcel";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { useCreateLaundryOrderMutation, useGetAllPropertyVendorsQuery, useGetBookingLaundryOrdersQuery, useGetLogsByTableQuery, useGetLogsQuery, useGetPropertyLaundryOrdersQuery, useGetPropertyLaundryPricingQuery, useLazyExportPropertyLaundryOrdersQuery, useTodayInHouseBookingRoomsQuery, useUpdateLaundryOrderMutation, useGetPrimaryGuestByBookingQuery } from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ClipboardList, Download, FilterX, Package, Pencil, RefreshCcw, ShieldCheck, Trash2, Truck, Plus, PlusCircle } from "lucide-react";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation, useNavigate } from "react-router-dom";

import { usePermission } from "@/rbac/usePermission";
import { extractApiErrorMessage } from "@/utils/apiError";
import { apiToast } from "@/utils/apiToastPromise";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import { AppDataGrid, type ColumnDef, DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell } from "@/components/ui/data-grid";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";

import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { formatReadableLabel } from "@/utils/formatString";
import { formatAppDateTime } from "@/utils/dateFormat";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";
import { generateId } from "@/utils/generateId";

/* ---------------- Types ---------------- */
export type LaundryStatus =
    | "PENDING"
    | "PICKED_UP"
    | "IN_PROCESS"
    | "DELIVERED"
    | "CANCELLED";

export type VendorStatus =
    | "NOT_ALLOTTED"
    | "PICKED_UP"
    | "RECEIVED";

const LAUNDRY_STATUSES: LaundryStatus[] = [
    "PENDING",
    "PICKED_UP",
    "IN_PROCESS",
    "DELIVERED",
    "CANCELLED",
];

const VENDOR_STATUSES: VendorStatus[] = [
    "NOT_ALLOTTED",
    "PICKED_UP",
    "RECEIVED",
];

const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE"];

type LaundryOrder = {
    id: string;
    property_id?: string | number | null;
    booking_id?: string | number | null;
    amount: string;
    laundry_status: LaundryStatus;
    vendor_id?: string;
    pickup_date: string;
    delivery_date?: string | null;
    vendor_status?: VendorStatus;
    vendorStatus?: VendorStatus;
    room_no?: string;
    guest_name?: string;
    guest_mobile?: string;
    total_amount?: number;
    items?: any[];
};

type LaundryItemRow = {
    id: string; // frontend only
    laundryId: number | "";
    roomNo?: string;
    itemCount: number | "";
    notes?: string;
    touched?: {
        laundryId?: boolean;
        roomNo?: boolean;
        itemCount?: boolean;
    };
};
function formatDate(date?: Date | null) {
    return date ? date.toISOString() : "";
}

function formatDateTime(value?: string | null) {
    return formatAppDateTime(value, "--");
}

function formatDisplayStatus(value?: string | null) {
    return formatReadableLabel(value) || "--";
}

function formatLaundryOrderDisplayId(rawId: string | number | null | undefined) {
    const normalizedRawId = String(rawId ?? "").trim();

    if (!normalizedRawId) {
        return formatModuleDisplayId("laundry_order", rawId, { padLength: 4 });
    }

    const prefixedMatch = normalizedRawId.match(/^#?LO(\d+)$/i);

    if (prefixedMatch) {
        return `LO${prefixedMatch[1].padStart(4, "0")}`;
    }

    return formatModuleDisplayId("laundry_order", rawId, { padLength: 4 });
}

function parseLaundryAmount(value?: string | number | null) {
    const normalizedValue = String(value ?? "").replace(/[^\d.-]/g, "");
    const amount = Number(normalizedValue);

    return Number.isFinite(amount) ? amount : null;
}

function formatLaundryAmount(value?: string | number | null) {
    const amount = parseLaundryAmount(value);

    if (amount === null) {
        return "--";
    }

    return `Rs. ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;
}

function getLaundryOrderTotalAmount(order: LaundryOrder) {
    const headerTotal = parseLaundryAmount(order.total_amount ?? order.amount);
    
    if (headerTotal && headerTotal > 0) {
        return headerTotal;
    }

    const itemTotal = order.items?.reduce((sum, item) => {
        return sum + (parseLaundryAmount(item?.amount) ?? (Number(item.item_count) * Number(item.item_rate)) ?? 0);
    }, 0);

    return itemTotal || 0;
}

function getLaundryVendorStatus(order: LaundryOrder) {
    return order.vendor_status || order.vendorStatus || "NOT_ALLOTTED";
}

function getLaundryVendorName(order: LaundryOrder, vendors?: Array<{ id: string | number; name: string }>) {
    return vendors?.find(v => String(v.id) === String(order.vendor_id))?.name || "--";
}

function getLaundryOrderItemLabel(order: LaundryOrder) {
    const firstItemName = order.items?.[0]?.item_name?.trim();
    const totalItems = order.items?.length ?? 0;

    if (!firstItemName) {
        return totalItems ? `${totalItems} item(s)` : "--";
    }

    if (totalItems <= 1) {
        return firstItemName;
    }

    return `${firstItemName} +${totalItems - 1} more`;
}

function getLaundryOrderDisplay(order: LaundryOrder, vendors?: Array<{ id: string | number; name: string }>) {
    const vendorStatus = getLaundryVendorStatus(order);

    return {
        guestName: order.guest_name || "--",
        roomNo: order.room_no || "--",
        itemLabel: getLaundryOrderItemLabel(order),
        itemCountLabel: `${order.items?.length ?? 0} item(s)`,
        pickupDateLabel: formatDateTime(order.pickup_date),
        deliveryDateLabel: formatDateTime(order.delivery_date),
        laundryStatusLabel: formatDisplayStatus(order.laundry_status),
        vendorStatus,
        vendorStatusLabel: formatDisplayStatus(vendorStatus),
        vendorName: getLaundryVendorName(order, vendors),
    };
}

function buildLaundryOrderSummaryUrl(order: LaundryOrder, propertyId?: string | number | null) {
    const params = new URLSearchParams({
        summaryOrderId: String(order.id),
    });
    const bookingId = order.booking_id;

    if (bookingId) {
        params.set("bookingId", String(bookingId));
    }

    if (propertyId) {
        params.set("propertyId", String(propertyId));
    }

    return `/laundry-orders?${params.toString()}`;
}

function getLaundryAuditChanges(audit: any) {
    const details = audit.details as Record<string, Record<string, string>> | undefined;
    const before = details?.before;
    const after = details?.after;

    if (audit.event_type === "CREATE") {
        return ["Order Created"];
    }

    const changes: string[] = [];

    if (before?.laundry_status !== after?.laundry_status) {
        changes.push(
            `Laundry: ${formatDisplayStatus(before?.laundry_status)} -> ${formatDisplayStatus(after?.laundry_status)}`
        );
    }

    if (before?.vendor_status !== after?.vendor_status) {
        changes.push(
            `Vendor: ${formatDisplayStatus(before?.vendor_status)} -> ${formatDisplayStatus(after?.vendor_status)}`
        );
    }

    if (before?.vendor_id !== after?.vendor_id) {
        changes.push("Vendor Assigned");
    }

    if (before?.delivery_date !== after?.delivery_date) {
        changes.push("Delivery Date Updated");
    }

    return changes;
}

function getLaundryAuditChangeText(audit: any) {
    return getLaundryAuditChanges(audit).join(", ");
}

function getLaundryAuditDisplay(audit: any) {
    return {
        orderLabel: formatLaundryOrderDisplayId(audit.event_id),
        actionLabel: formatDisplayStatus(audit.event_type),
        actionClassName: "border-slate-300/80 bg-slate-100/90 text-slate-700",
        changeText: getLaundryAuditChangeText(audit) || "--",
        userLabel: `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || "--",
        dateLabel: formatDateTime(audit.created_on as string),
    };
}

/* ---------------- Component ---------------- */
export default function LaundryOrdersManagement() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [sheetOpen, setSheetOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [viewItemsModal, setViewItemsModal] = useState({
        open: false,
        editMode: false,
        order: null as LaundryOrder | null
    });

    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    useEffect(() => {
        if (viewItemsModal.open) {
            setSheetTab("summary");
        }
    }, [viewItemsModal.open]);


    const [statusModal, setStatusModal] = useState<{
        open: boolean;
        orderId?: string;
        status?: string;
        vendorId?: number | null;
        type?: 'laundry' | 'vendor' | 'vendorAssign';
    }>({ open: false });

    const [form, setForm] = useState<CreateLaundryOrderForm>({
        vendorId: "",
        pickupDate: new Date(), // Will be updated by useEffect on open
        deliveryDate: "",
        vendorStatus: "NOT_ALLOTTED",
        bookingId: "",
        roomNo: "",
        items: [
            {
                id: generateId(),
                laundryId: "",
                roomNo: "",
                itemCount: ""
            }
        ]
    });

    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [activeTab, setActiveTab] = useState<"orders" | "audit">("orders");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [laundryStatusFilter, setLaundryStatusFilter] = useState("");
    const [vendorStatusFilter, setVendorStatusFilter] = useState("");
    const [auditSearchInput, setAuditSearchInput] = useState("");
    const [auditSearchQuery, setAuditSearchQuery] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("");

    const [ordersPage, setOrdersPage] = useState(1);
    const [auditPage, setAuditPage] = useState(1);
    const [ordersLimit, setOrdersLimit] = useState(10);
    const [auditLimit, setAuditLimit] = useState(10);

    const [editOrder, setEditOrder] = useState<any>(null);
    const [historyModal, setHistoryModal] = useState({
        open: false,
        order: null as LaundryOrder | null
    });
    const [prefillApplied, setPrefillApplied] = useState(false);
    const prefilledBookingId = location.state?.bookingId;
    const prefilledPropertyId = location.state?.propertyId;
    const prefilledBookingStatus = location.state?.bookingStatus;
    const summaryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const summaryOrderId = summaryParams.get("summaryOrderId");
    const summaryBookingId = summaryParams.get("bookingId");
    const summaryPropertyId = summaryParams.get("propertyId");
    const [autoOpenedSummaryOrderId, setAutoOpenedSummaryOrderId] = useState<string | null>(null);


    const { myProperties, isMultiProperty, isInitializing } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: laundryData, isLoading: laundryLoading, isFetching: laundryFetching, refetch: refetchLaundry } = useGetPropertyLaundryOrdersQuery({
        propertyId: selectedPropertyId,
        page: ordersPage,
        limit: ordersLimit,
        search: searchQuery,
        status: laundryStatusFilter || undefined,
        vendor_status: vendorStatusFilter || undefined
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    const [getAllLaundryOrders, { isFetching: exportingLaundryOrders }] = useLazyExportPropertyLaundryOrdersQuery()

    const { data: laundryTypes } = useGetPropertyLaundryPricingQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    const laundryPricingItems = useMemo(() => {
        if (Array.isArray(laundryTypes?.data?.data)) {
            return laundryTypes.data.data;
        }

        if (Array.isArray(laundryTypes?.data)) {
            return laundryTypes.data;
        }

        return [];
    }, [laundryTypes]);

    const { data: vendors } = useGetAllPropertyVendorsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: todayInHouseRooms } = useTodayInHouseBookingRoomsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: primaryGuest } = useGetPrimaryGuestByBookingQuery(form.bookingId, {
        skip: !form.bookingId
    })

    const { data: summaryBookingLaundryOrders } = useGetBookingLaundryOrdersQuery(summaryBookingId, {
        skip: !summaryOrderId || !summaryBookingId
    })

    const { data: logs, isFetching: logsFetching, refetch: refetchLogs } = useGetLogsByTableQuery({ tableName: "laundry_orders", propertyId: selectedPropertyId, page: 1, limit: 1000 }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    const { data: singleLog } = useGetLogsQuery({ tableName: "laundry_orders", eventId: historyModal.order?.id }, {
        skip: !isLoggedIn || !historyModal.order?.id
    })
    const [createLaundryOrder] = useCreateLaundryOrderMutation()
    const [updateLaundryOrder] = useUpdateLaundryOrderMutation()
    const confirmedBookingRoomOptions = useMemo(() => {
        return (todayInHouseRooms || []).map((room: any) => ({
            value: `${room.booking_id}:${room.room_no}`,
            bookingId: Number(room.booking_id),
            roomNo: String(room.room_no),
        }));
    }, [todayInHouseRooms]);

    const displayedRoomOptions = useMemo(() => {
        if (!form.bookingId) return confirmedBookingRoomOptions;
        return confirmedBookingRoomOptions.filter(
            (option) => option.bookingId === Number(form.bookingId)
        );
    }, [confirmedBookingRoomOptions, form.bookingId]);

    useEffect(() => {
        if (selectedPropertyId) {
            setOrdersPage(1);
            setAuditPage(1);
        }
    }, [selectedPropertyId]);

    useEffect(() => {
        if (!summaryPropertyId) return;

        setSelectedPropertyId(String(summaryPropertyId));
    }, [summaryPropertyId]);

    useEffect(() => {
        if (!summaryOrderId || summaryBookingId || !summaryPropertyId) return;

        setSearchInput(summaryOrderId);
        setSearchQuery(summaryOrderId);
        setOrdersPage(1);
    }, [summaryBookingId, summaryOrderId, summaryPropertyId]);

    useEffect(() => {
        if (!summaryOrderId || autoOpenedSummaryOrderId === summaryOrderId) return;

        const bookingOrder = Array.isArray(summaryBookingLaundryOrders)
            ? summaryBookingLaundryOrders.find((order: LaundryOrder) => String(order.id) === summaryOrderId)
            : null;

        const propertyOrder = Array.isArray(laundryData?.data)
            ? laundryData.data.find((order: LaundryOrder) => String(order.id) === summaryOrderId)
            : null;

        const order = bookingOrder || propertyOrder;

        if (!order) return;

        setViewItemsModal({
            open: true,
            editMode: false,
            order,
        });
        setAutoOpenedSummaryOrderId(summaryOrderId);
    }, [autoOpenedSummaryOrderId, laundryData?.data, summaryBookingLaundryOrders, summaryOrderId]);

    useEffect(() => {
        if (searchInput.trim() === "" && searchQuery !== "") {
            setSearchQuery("");
            setOrdersPage(1);
        }
    }, [searchInput, searchQuery]);

    useEffect(() => {
        if (prefillApplied) return;
        if (!prefilledBookingId || !prefilledPropertyId) return;

        setPrefillApplied(true);

        if (prefilledBookingStatus !== "CHECKED_IN") {
            toast.info("Only checked-in bookings can create laundry orders.");
            return;
        }

        setSelectedPropertyId(String(prefilledPropertyId));
        setForm((prev) => ({
            ...prev,
            bookingId: Number(prefilledBookingId),
        }));
        setSheetOpen(true);
    }, [prefillApplied, prefilledBookingId, prefilledPropertyId, prefilledBookingStatus]);

    useEffect(() => {
        if (sheetOpen) {
            setForm(prev => ({
                ...prev,
                pickupDate: (() => {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() + 30);
                    return d;
                })(),
            }));
        }
    }, [sheetOpen]);

    useEffect(() => {
        if (!form.bookingId || form.roomNo || !confirmedBookingRoomOptions.length) return;

        const roomOption = confirmedBookingRoomOptions.find(
            (option) => option.bookingId === Number(form.bookingId)
        );

        if (!roomOption) return;

        setForm((prev) => ({
            ...prev,
            roomNo: roomOption.roomNo,
            items: prev.items.map((item) => ({
                ...item,
                roomNo: roomOption.roomNo,
            })),
        }));
    }, [form.bookingId, form.roomNo, confirmedBookingRoomOptions]);

    // Hook handles all initialization logic now


    /* ---------------- Handlers ---------------- */
    const validateForm = () => {

        if (!form.pickupDate) return false;

        if (!form.items.length) return false;

        for (const row of form.items) {

            if (!row.laundryId || !row.itemCount)
                return false;

            // room required only if booking selected
            if (form.bookingId && !row.roomNo)
                return false;

            // duplicate check
            const duplicates = form.items.filter(i =>
                i.laundryId === row.laundryId &&
                i.roomNo === row.roomNo
            );

            if (duplicates.length > 1)
                return false;
        }

        return true;
    };

    const handleCreateOrder = async () => {
        setShowErrors(true);
        if (!selectedPropertyId) return;

        if (!validateForm()) {
            return; // 🚀 stops API call
        }


        const payload = buildCreateLaundryOrderPayload(
            Number(selectedPropertyId),
            form,
            laundryPricingItems,
            primaryGuest
        );

        try {

            const promise = createLaundryOrder(payload).unwrap();

            toast.promise(promise, {
                error: {
                    render({ data }) {
                        return extractApiErrorMessage(data);
                    }
                },
                pending: "Creating order, please wait",
                success: "Order created successfully"
            });

            await promise;



            setSheetOpen(false);

            if (location.state?.source === "booking-module" && form.bookingId) {
                navigate("/bookings", {
                    state: {
                        openBookingId: String(form.bookingId),
                        tab: "laundry"
                    }
                });
                return;
            }

            /* ✅ RESET FORM — NEW STRUCTURE */
            setForm({
                vendorId: "",
                pickupDate: (() => {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() + 30);
                    return d;
                })(),
                vendorStatus: "NOT_ALLOTTED",
                bookingId: "",
                roomNo: "",
                comments: "",
                items: [
                    {
                        id: generateId(),
                        laundryId: "",
                        roomNo: "",
                        itemCount: "",
                        notes: ""
                    }
                ]
            });
            setShowErrors(false);

        } catch (err: any) {
            const message = extractApiErrorMessage(err);
            console.error("Create laundry order failed", err);
            toast.error(message);
        }
    };

    const handleCloseSheet = () => {
        setSheetOpen(false);
        if (location.state?.source === "booking-module") {
            navigate("/bookings", {
                state: {
                    openBookingId: String(form.bookingId || location.state?.bookingId),
                    tab: "laundry"
                }
            });
        }
    };

    const handleStatusUpdate = async () => {

        if (!statusModal.orderId) return;

        try {

            if (statusModal.type === "laundry") {

                await updateLaundryOrder({
                    id: statusModal.orderId,
                    laundryStatus: statusModal.status
                }).unwrap();

            } else if (statusModal.type === "vendor") {

                await updateLaundryOrder({
                    id: statusModal.orderId,
                    vendorStatus: statusModal.status
                }).unwrap();

            } else if (statusModal.type === "vendorAssign") {

                await updateLaundryOrder({
                    id: statusModal.orderId,
                    vendorId: statusModal.vendorId
                }).unwrap();

            }

            toast.success("Updated successfully");

            setStatusModal({ open: false });

        } catch (err) {

            toast.error("Update failed");

        }
    };

    const updateOrder = async () => {
        if (!editOrder) return;
        apiToast(updateLaundryOrder({
            id: editOrder.id,
            vendorId: editOrder.vendor_id,
            vendorStatus: editOrder.vendor_status,
            laundryStatus: editOrder.laundry_status,
            deliveryDate: editOrder.delivery_date
        }).unwrap(),
            "Laundry order updating successfully"
        )
        setViewItemsModal({ open: false, editMode: false, order: null })
    }

    const updateItem = (index, patch) => {
        setForm(prev => {
            const items = [...prev.items];
            items[index] = { ...items[index], ...patch };
            return { ...prev, items };
        });
    };

    const addRow = () => {
        setShowErrors(false)
        setForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: generateId(),
                    laundryId: "",
                    roomNo: prev.roomNo || "",
                    itemCount: "",
                    notes: "",
                    touched: {}
                }
            ]
        }));
    };

    const removeRow = (id) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== id)
        }));
    };

    const getRowError = (row, items, bookingId) => {

        if (!row.laundryId || !row.itemCount)
            return "Required fields missing";

        const duplicates = items.filter(i => {

            if (bookingId) {
                // booking exists → check item + room
                return (
                    i.laundryId === row.laundryId &&
                    i.roomNo === row.roomNo
                );
            }

            // hotel laundry → only item
            return i.laundryId === row.laundryId;

        });

        if (duplicates.length > 1)
            return "Duplicate item selected";

        return "";
    };

    const now = new Date();

    const pathname = location.pathname
    const { permission } = usePermission(pathname)

    const filteredOrders = useMemo(() => {
        return laundryData?.data ?? [];
    }, [laundryData?.data]);

    const filteredAuditLogs = useMemo(() => {
        if (!logs?.data) return [];

        const query = auditSearchQuery.trim().toLowerCase();

        return logs.data.filter((audit) => {
            if (auditActionFilter && audit.event_type !== auditActionFilter) {
                return false;
            }

            const displayAudit = getLaundryAuditDisplay(audit);

            if (!query) {
                return true;
            }

            const searchFields = [
                audit.event_id?.toString() || "",
                displayAudit.orderLabel,
                displayAudit.actionLabel,
                displayAudit.changeText,
                displayAudit.userLabel,
                displayAudit.dateLabel,
            ];

            return searchFields.some((field) => field.toLowerCase().includes(query));
        });
    }, [auditActionFilter, auditSearchQuery, logs?.data]);

    const auditTotalRecords = filteredAuditLogs.length;
    const auditTotalPages = Math.max(1, Math.ceil(auditTotalRecords / auditLimit));
    const paginatedAuditLogs = useMemo(() => {
        const start = (auditPage - 1) * auditLimit;
        return filteredAuditLogs.slice(start, start + auditLimit);
    }, [filteredAuditLogs, auditPage, auditLimit]);

    useEffect(() => {
        if (auditPage > auditTotalPages) {
            setAuditPage(auditTotalPages);
        }
    }, [auditPage, auditTotalPages]);

    const laundryAuditColumns = useMemo<ColumnDef[]>(() => [
        {
            label: "Order ID",
            cellClassName: "font-medium whitespace-nowrap",
            render: (audit) => {
                const displayAudit = getLaundryAuditDisplay(audit);

                return (
                    <button
                        type="button"
                        className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm text-left"
                        onClick={() =>
                            setHistoryModal({
                                open: true,
                                order: { id: String(audit.event_id) } as LaundryOrder,
                            })
                        }
                    >
                        {displayAudit.orderLabel}
                    </button>
                );
            },
        },
        {
            label: "Action",
            cellClassName: "whitespace-nowrap",
            render: (audit) => {
                const displayAudit = getLaundryAuditDisplay(audit);

                return (
                    <GridBadge tone="neutral" className={displayAudit.actionClassName}>
                        {displayAudit.actionLabel}
                    </GridBadge>
                );
            },
        },
        {
            label: "Change",
            cellClassName: "text-muted-foreground text-sm",
            render: (audit) => getLaundryAuditDisplay(audit).changeText,
        },
        {
            label: "User",
            cellClassName: "text-muted-foreground whitespace-nowrap",
            render: (audit) => getLaundryAuditDisplay(audit).userLabel,
        },
        {
            label: "Date",
            cellClassName: "text-muted-foreground whitespace-nowrap text-xs",
            render: (audit) => getLaundryAuditDisplay(audit).dateLabel,
        },
    ], []);

    const laundryOrderColumns = useMemo<ColumnDef<LaundryOrder>[]>(() => [
        {
            label: "Order ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (order: LaundryOrder) => (
                <a
                    href={buildLaundryOrderSummaryUrl(order, selectedPropertyId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                >
                    {formatLaundryOrderDisplayId(order.id)}
                </a>
            ),
        },
        {
            label: "Room No",
            headClassName: "text-center",
            cellClassName: "text-center font-medium whitespace-nowrap",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).roomNo,
        },
        {
            label: "Guest Name",
            cellClassName: "whitespace-nowrap max-w-[150px] truncate",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).guestName,
        },
        {
            label: "Items",
            cellClassName: "whitespace-nowrap max-w-[180px] truncate",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).itemLabel,
        },
        {
            label: "Total",
            cellClassName: "font-semibold text-primary whitespace-nowrap",
            render: (order: LaundryOrder) => formatLaundryAmount(getLaundryOrderTotalAmount(order)),
        },
        {
            label: "Pickup",
            cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).pickupDateLabel,
        },
        {
            label: "Delivery",
            cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).deliveryDateLabel,
        },
        {
            label: "Laundry Status",
            headClassName: "text-center",
            cellClassName: "text-center whitespace-nowrap",
            render: (order: LaundryOrder) => (
                <GridBadge status={order.laundry_status} statusType="laundry">
                    {getLaundryOrderDisplay(order, vendors).laundryStatusLabel}
                </GridBadge>
            ),
        },
        {
            label: "Vendor Status",
            headClassName: "text-center",
            cellClassName: "text-center whitespace-nowrap",
            render: (order: LaundryOrder) => (
                <GridBadge
                    status={getLaundryOrderDisplay(order, vendors).vendorStatus}
                    statusType="vendor"
                >
                    {getLaundryOrderDisplay(order, vendors).vendorStatusLabel}
                </GridBadge>
            ),
        },
    ], [vendors]);

    const resetFiltersHandler = () => {
        if (myProperties?.properties?.[0]?.id) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
        setOrdersPage(1);
        setAuditPage(1);

        if (activeTab === "orders") {
            setSearchInput("");
            setSearchQuery("");
            setLaundryStatusFilter("");
            setVendorStatusFilter("");
            return;
        }

        setAuditSearchInput("");
        setAuditSearchQuery("");
        setAuditActionFilter("");
    };

    const refreshTable = async () => {
        if (activeTab === "orders" && laundryFetching) return;
        if (activeTab === "audit" && logsFetching) return;

        const toastId = toast.loading("Refreshing data...");

        try {
            if (activeTab === "orders") {
                await refetchLaundry();
            } else {
                await refetchLogs();
            }

            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh");
        }
    };

    const exportLaundryOrdersSheet = async () => {
        if (!selectedPropertyId || exportingLaundryOrders) return;

        const totalRecords =
            laundryData?.pagination?.totalItems ??
            laundryData?.pagination?.total ??
            (laundryData?.data?.length || 0);

        if (!totalRecords) {
            toast.info("No laundry orders to export");
            return;
        }

        const toastId = toast.loading("Preparing laundry orders export...");

        try {
            const res = await getAllLaundryOrders({
                propertyId: selectedPropertyId,
                status: laundryStatusFilter || undefined,
                vendor_status: vendorStatusFilter || undefined,
                search: searchQuery,
            }).unwrap();

            const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

            if (!rows.length) {
                toast.dismiss(toastId);
                toast.info("No laundry orders to export");
                return;
            }

            const formatted = rows.map((order: LaundryOrder) => {
                const displayOrder = getLaundryOrderDisplay(order, vendors);

                return {
                    "Laundry ID": formatLaundryOrderDisplayId(order.id),
                    "Item Name": displayOrder.itemLabel,
                    "No. of Items": displayOrder.itemCountLabel,
                    "Pickup Date": displayOrder.pickupDateLabel,
                    "Delivery Date": displayOrder.deliveryDateLabel,
                    "Laundry Status": displayOrder.laundryStatusLabel,
                    "Vendor Status": displayOrder.vendorStatusLabel,
                    Vendor: displayOrder.vendorName,
                };
            });

            exportToExcel(formatted, "LaundryOrders.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export laundry orders");
        }
    };

    const exportAuditLogsSheet = () => {
        if (!filteredAuditLogs.length) {
            toast.info("No audit logs to export");
            return;
        }

        const formatted = filteredAuditLogs.map((audit) => {
            const displayAudit = getLaundryAuditDisplay(audit);

            return {
                Order: displayAudit.orderLabel,
                Action: displayAudit.actionLabel,
                Change: displayAudit.changeText,
                User: displayAudit.userLabel,
                Date: displayAudit.dateLabel,
            };
        });
        exportToExcel(formatted, "LaundryAuditLogs.xlsx");
        toast.success("Export completed");
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="flex flex-col bg-background">
            <section className="flex flex-col p-6 lg:p-8 gap-6">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold leading-tight">Laundry Orders</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage hotel laundry operations, vendors, and audit logs.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {isMultiProperty && (
                                <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                    <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                        Property
                                    </span>
                                    <div className="flex-1 min-w-0 h-full">
                                        <MenuItemSelect
                                            value={selectedPropertyId}
                                            items={myProperties?.properties?.map((p: any) => ({ id: p.id, label: p.brand_name })) || []}
                                            onSelect={(val) => setSelectedPropertyId(val as string)}
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
                                    onClick={() => {
                                        setSheetOpen(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4" /> Add Laundry Order
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="border-b border-border flex shrink-0">
                        <div
                            onClick={() => setActiveTab("orders")}
                            className={cn(
                                "px-4 py-3 text-sm font-medium cursor-pointer border-b-2 transition",
                                activeTab === "orders"
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Orders
                        </div>
                        <div
                            onClick={() => setActiveTab("audit")}
                            className={cn(
                                "px-4 py-3 text-sm font-medium cursor-pointer border-b-2 transition",
                                activeTab === "audit"
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            History
                        </div>
                    </div>

                {activeTab === "orders" && (
                    <div>
                        <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={searchInput}
                                        onChange={(value) => {
                                            setSearchInput(value);
                                            if (!value.trim()) {
                                                setSearchQuery("");
                                                setOrdersPage(1);
                                            }
                                        }}
                                        onSearch={() => {
                                            setSearchQuery(searchInput.trim());
                                            setOrdersPage(1);
                                        }}
                                    />

                                    <GridToolbarSelect
                                        label="Vendor"
                                        value={vendorStatusFilter}
                                        onChange={(value) => {
                                            setVendorStatusFilter(value);
                                            setOrdersPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            ...VENDOR_STATUSES.map((status) => ({
                                                label: formatDisplayStatus(status),
                                                value: status,
                                            })),
                                        ]}
                                    />

                                    <GridToolbarSelect
                                        label="Status"
                                        value={laundryStatusFilter}
                                        onChange={(value) => {
                                            setLaundryStatusFilter(value);
                                            setOrdersPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            ...LAUNDRY_STATUSES.map((status) => ({
                                                label: formatDisplayStatus(status),
                                                value: status,
                                            })),
                                        ]}
                                    />

                                    <GridToolbarActions
                                        className="gap-1 justify-end"
                                        actions={[
                                            {
                                                key: "export",
                                                label: "Export Laundry Orders",
                                                icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: exportLaundryOrdersSheet,
                                                disabled: !selectedPropertyId || exportingLaundryOrders,
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
                                                disabled: laundryFetching,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>

                        <div className="px-2 pb-2">
                            <AppDataGrid
                                density="compact"
                                scrollable={false}
                                columns={laundryOrderColumns}
                                data={filteredOrders}
                                loading={laundryLoading || laundryFetching || isInitializing}
                                emptyText="No laundry orders found"
                                minWidth="1080px"
                                actionClassName="text-center w-[60px]"
                                className="mt-0"
                                actions={(order: LaundryOrder) => (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 bg-primary hover:bg-primary/80 text-primary-foreground transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                onClick={() => {
                                                    setEditOrder(order);
                                                    setViewItemsModal({
                                                        open: true,
                                                        editMode: true,
                                                        order,
                                                    });
                                                }}
                                            >
                                                <Pencil className="w-3.5 h-3.5 mx-auto" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Update Order</TooltipContent>
                                    </Tooltip>
                                )}
                                enablePagination={!!laundryData?.pagination}
                                paginationProps={{
                                    page: ordersPage,
                                    totalPages: laundryData?.pagination?.totalPages ?? 1,
                                    setPage: setOrdersPage,
                                    totalRecords: laundryData?.pagination?.totalItems ?? laundryData?.pagination?.total ?? laundryData?.data?.length ?? 0,
                                    limit: ordersLimit,
                                    onLimitChange: (value) => {
                                        setOrdersLimit(value);
                                        setOrdersPage(1);
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

                {activeTab === "audit" && (
                    <div>
                        <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={auditSearchInput}
                                        onChange={setAuditSearchInput}
                                        onSearch={() => {
                                            setAuditSearchQuery(auditSearchInput.trim());
                                            setAuditPage(1);
                                        }}
                                    />

                                    <GridToolbarSelect
                                        label="Action"
                                        value={auditActionFilter}
                                        onChange={(value) => {
                                            setAuditActionFilter(value);
                                            setAuditPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            ...AUDIT_ACTIONS.map((action) => ({
                                                label: formatDisplayStatus(action),
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
                                                onClick: exportAuditLogsSheet,
                                                disabled: filteredAuditLogs.length === 0,
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
                                                disabled: logsFetching,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>

                        <div className="px-2 pb-2">
                            <AppDataGrid
                                scrollable={false}
                                columns={laundryAuditColumns}
                                data={paginatedAuditLogs}
                                loading={logsFetching}
                                emptyText="No audit logs found"
                                minWidth="1080px"
                                className="mt-0"
                                enablePagination
                                paginationProps={{
                                    page: auditPage,
                                    totalPages: auditTotalPages,
                                    setPage: setAuditPage,
                                    totalRecords: auditTotalRecords,
                                    limit: auditLimit,
                                    onLimitChange: (value) => {
                                        setAuditLimit(value);
                                        setAuditPage(1);
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}




            </section>

            {/* Create Order Sheet */}
            <Sheet open={sheetOpen} onOpenChange={(open) => {
                if (!open) handleCloseSheet();
                else setSheetOpen(true);
            }}>
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl flex flex-col p-0 bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <SheetHeader className="px-6 py-4 border-b">
                            <SheetTitle className="text-[#444444]">Add Laundry Order Items</SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
                            <div className="space-y-4">
                                {isMultiProperty && (
                                    <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-3">
                                        <Label>Property</Label>
                                        <NativeSelect
                                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={selectedPropertyId ?? ""}
                                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                                        >
                                            <option value="" disabled>Select Property</option>
                                            {myProperties?.properties?.map((property: any) => (
                                                <option key={property.id} value={property.id}>
                                                    {property.brand_name}
                                                </option>
                                            ))}
                                        </NativeSelect>
                                    </div>
                                )}

                        {/* ================= HEADER SECTION ================= */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Vendor */}
                            <div className="space-y-1">
                                <Label>Vendor</Label>
                                <MenuItemSelect
                                    value={form.vendorId || ""}
                                    items={(vendors || []).map(v => ({ id: v.id, label: v.name }))}
                                    onSelect={(id) =>
                                        setForm({ ...form, vendorId: id ? Number(id) : "" })
                                    }
                                    placeholder="--Please Select--"
                                    extraClasses="h-10 bg-background/50"
                                />
                            </div>

                            {/* Vendor Status */}
                            <div className="space-y-1">
                                <Label>Vendor Status</Label>
                                <NativeSelect
                                    className="w-full h-10 border rounded px-3 text-sm bg-background/50"
                                    value={form.vendorStatus}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            vendorStatus: e.target.value as VendorStatus
                                        })
                                    }
                                >
                                    {(["NOT_ALLOTTED", "PICKED_UP", "RECEIVED"] as VendorStatus[]).map(s => (
                                        <option key={s} value={s}>
                                            {formatDisplayStatus(s)}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>

                            {/* Pickup Date */}
                            <div className="space-y-1">
                                <Label>Pickup Date & Time*</Label>
                                <div>
                                    <ResponsiveDatePicker
                                        value={parseDate(form.pickupDate)}
                                        onChange={(date) =>
                                            setForm(prev => ({
                                                ...prev,
                                                pickupDate: formatDate(date)
                                            }))
                                        }
                                        showTime
                                        minDate={now}
                                        placeholder="Select date & time"
                                        label="Pickup Information"
                                        className="bg-background/50"
                                    />
                                </div>
                            </div>

                            {/* Delivery Date */}
                            <div className="space-y-1">
                                <Label>Expected Delivery</Label>
                                <div>
                                    <ResponsiveDatePicker
                                        value={parseDate(form.deliveryDate)}
                                        onChange={(date) =>
                                            setForm(prev => ({
                                                ...prev,
                                                deliveryDate: formatDate(date)
                                            }))
                                        }
                                        showTime
                                        minDate={form.pickupDate ? parseDate(form.pickupDate) : now}
                                        placeholder="Select date & time"
                                        label="Delivery Information"
                                        className="bg-background/50"
                                    />
                                </div>
                            </div>

                            {/* Room */}
                            <div className="space-y-1">
                                <Label>Room Number</Label>
                                <MenuItemSelect
                                    value={form.bookingId && form.roomNo ? `${form.bookingId}:${form.roomNo}` : ""}
                                    items={[
                                        { id: "", label: "No Room (Hotel Laundry)" },
                                        ...displayedRoomOptions.map((option) => ({
                                            id: option.value,
                                            label: option.roomNo
                                        }))
                                    ]}
                                    onSelect={(value) => {
                                        const selectedOption = displayedRoomOptions.find(
                                            (option) => option.value === value
                                        );

                                        setForm((prev) => ({
                                            ...prev,
                                            bookingId: selectedOption?.bookingId || "",
                                            roomNo: selectedOption?.roomNo || "",
                                            items: prev.items.map((item) => ({
                                                ...item,
                                                roomNo: selectedOption?.roomNo || "",
                                            })),
                                        }));
                                    }}
                                    placeholder="--Please Select--"
                                    extraClasses="h-10 bg-background/50"
                                />
                            </div>

                            {/* Guest Name */}
                            <div className="space-y-1">
                                <Label>Guest Name</Label>
                                <div className={cn("flex h-10 items-center text-sm font-medium cursor-default select-none", (!form.bookingId || !primaryGuest?.first_name) ? "text-muted-foreground" : "text-foreground")}>
                                    {(form.bookingId && primaryGuest) ? `${primaryGuest.first_name} ${primaryGuest.last_name || ""}`.trim() : "—"}
                                </div>
                            </div>

                            {/* Guest Mobile */}
                            <div className="space-y-1">
                                <Label>Guest Mobile</Label>
                                <div className={cn("flex h-10 items-center text-sm font-medium cursor-default select-none", (!form.bookingId || !primaryGuest?.phone) ? "text-muted-foreground" : "text-foreground")}>
                                    {(form.bookingId && primaryGuest?.phone) ? [primaryGuest.country_code, primaryGuest.phone].filter(Boolean).join(" ") : "—"}
                                </div>
                            </div>

                            {/* Booking Id */}
                            <div className="space-y-1">
                                <Label>Booking Id</Label>
                                <div className={cn("flex h-10 items-center text-sm font-medium cursor-default select-none", !form.bookingId ? "text-muted-foreground" : "text-foreground")}>
                                    {form.bookingId ? formatModuleDisplayId("booking", form.bookingId) : "—"}
                                </div>
                            </div>

                            <div className="space-y-1 col-span-1 sm:col-span-2">
                                <Label>Special Instructions (Order Level)</Label>
                                <textarea
                                    className="w-full min-h-[60px] rounded-[3px] border border-input bg-background/50 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="Add any general notes for this order..."
                                    value={form.comments || ""}
                                    onChange={(e) => setForm(prev => ({ ...prev, comments: e.target.value }))}
                                />
                            </div>

                        </div>

                        {/* ================= ITEMS TABLE ================= */}

                        <div className="editable-grid-compact border rounded-[5px] overflow-hidden flex flex-col">
                            <div className="overflow-x-auto w-full bg-background border-b border-border">
                                <div className={cn("w-full", form.bookingId ? "min-w-[1150px]" : "min-w-[950px]")}>
                                    <DataGrid>
                                        <DataGridHeader>
                                            <tr>
                                                <DataGridHead>Item *</DataGridHead>
                                                {form.bookingId && (
                                                    <DataGridHead className="w-40">Booking ID</DataGridHead>
                                                )}
                                                <DataGridHead className="w-28 text-center">Qty *</DataGridHead>
                                                <DataGridHead className="flex-1">Item Notes (e.g. stains, starch)</DataGridHead>
                                                {form.items.length > 1 && (
                                                    <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                                )}
                                            </tr>
                                        </DataGridHeader>

                                        <tbody>
                                            {form.items.map((row, index) => {
                                                const error = showErrors
                                                    ? getRowError(row, form.items, form.bookingId)
                                                    : "";

                                                return (
                                                    <DataGridRow key={row.id}>
                                                        <DataGridCell>
                                                            <ValidationTooltip
                                                                isValid={!((showErrors || row.touched?.laundryId) && (error && (!row.laundryId || error === "Duplicate item selected")))}
                                                                message={error === "Duplicate item selected" ? "Duplicate item selected" : "Required field"}
                                                            >
                                                                <MenuItemSelect
                                                                    value={row.laundryId || null}
                                                                    items={laundryPricingItems}
                                                                    disabledIds={form.items.map(item => item.laundryId).filter(Boolean)}
                                                                    itemName="item_name"
                                                                    forceNative={true}
                                                                    extraClasses={cn(
                                                                        "h-9 w-full rounded-[3px] border border-input bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                        (showErrors || row.touched?.laundryId) && (error && (!row.laundryId || error === "Duplicate item selected")) && "border-red-500"
                                                                    )}
                                                                    onSelect={(id) =>
                                                                        updateItem(index, {
                                                                            laundryId: id,
                                                                            touched: { ...row.touched, laundryId: true }
                                                                        })
                                                                    }
                                                                    placeholder="--Please Select--"
                                                                />
                                                            </ValidationTooltip>
                                                        </DataGridCell>

                                                        {form.bookingId && (
                                                            <DataGridCell>
                                                                <div className="flex h-9 items-center rounded-[3px] border border-input bg-background px-3 text-sm">
                                                                    {formatModuleDisplayId("booking", form.bookingId)}
                                                                </div>
                                                            </DataGridCell>
                                                        )}

                                                        <DataGridCell>
                                                            <ValidationTooltip
                                                                isValid={!((showErrors || row.touched?.itemCount) && (error && !row.itemCount))}
                                                                message="Required field"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    name={`laundry_item_count_${index}`}
                                                                    className={cn(
                                                                        "w-full h-9 rounded-[3px] border border-input bg-background px-3 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary text-center",
                                                                        (showErrors || row.touched?.itemCount) && (error && !row.itemCount) && "border-red-500"
                                                                    )}
                                                                    value={row.itemCount}
                                                                    onChange={(e) =>
                                                                        updateItem(index, {
                                                                            itemCount: +normalizeNumberInput(e.target.value)
                                                                        })
                                                                    }
                                                                    onBlur={() => updateItem(index, { touched: { ...row.touched, itemCount: true } })}
                                                                />
                                                            </ValidationTooltip>
                                                        </DataGridCell>

                                                        <DataGridCell>
                                                            <input
                                                                type="text"
                                                                className="w-full h-9 rounded-[3px] border border-input bg-background px-3 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary"
                                                                placeholder="Optional item notes..."
                                                                value={row.notes || ""}
                                                                onChange={(e) => updateItem(index, { notes: e.target.value })}
                                                            />
                                                        </DataGridCell>

                                                        {form.items.length > 1 && (
                                                            <DataGridCell className="text-center">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors mx-auto"
                                                                    onClick={() => removeRow(row.id)}
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </Button>
                                                            </DataGridCell>
                                                        )}
                                                    </DataGridRow>
                                                );
                                            })}
                                        </tbody>
                                    </DataGrid>
                                </div>
                            </div>
                            <div className="editable-grid-footer p-3 bg-muted/10">
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                    onClick={addRow}
                                >
                                    <PlusCircle className="w-4 h-4" /> Add New Order Item(s)
                                </button>
                            </div>
                        </div>

                            </div>
                        </div>

                        <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
                            <Button
                                variant="heroOutline"
                                onClick={handleCloseSheet}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                className="min-w-[140px]"
                                onClick={handleCreateOrder}
                            >
                                Create Order
                            </Button>
                        </div>
                </motion.div>
            </SheetContent>
        </Sheet>

            {/* View / Edit Items Modal */}
            {/* View / Edit Items Sheet */}
            <Sheet
                open={viewItemsModal.open}
                onOpenChange={() =>
                    setViewItemsModal({ open: false, editMode: false, order: null })
                }
            >
                <SheetContent side="right" className="w-full lg:max-w-4xl sm:max-w-3xl overflow-y-auto bg-background border-l border-border/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="border-b border-border/50 pb-3 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                    {viewItemsModal.editMode ? <Pencil className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                                </div>
                                <div className="space-y-0.5">
                                    <SheetTitle className="text-lg font-bold text-foreground">
                                        {viewItemsModal.editMode ? `Update Laundry Order [${viewItemsModal.order?.id ? `#${formatLaundryOrderDisplayId(viewItemsModal.order.id)}` : "..."}]` : `Laundry Order [${viewItemsModal.order?.id ? `#${formatLaundryOrderDisplayId(viewItemsModal.order.id)}` : "..."}]`}
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground font-medium  tracking-wider">
                                        {viewItemsModal.editMode
                                            ? "Update existing laundry order details"
                                            : `Laundry order details`}
                                    </p>
                                </div>
                            </div>
                        </SheetHeader>

                        <div>
                            {viewItemsModal.order && (() => {
                                const order = viewItemsModal.order;
                                const displayOrder = getLaundryOrderDisplay(order, vendors);
                                const displayId = formatLaundryOrderDisplayId(order.id);
                                const orderItems = Array.isArray(order.items) ? order.items : [];

                                return (
                                    <div className="space-y-6">
                                        {/* Sheet Tabs */}
                                        <div className="border-b border-border flex">
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
                                                    "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
                                                    sheetTab === "history"
                                                        ? "border-primary text-primary"
                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                History
                                            </button>
                                        </div>

                                        {sheetTab === "summary" && (
                                            <div className="space-y-5">
                                      

                                        {!viewItemsModal.editMode ? (
                                            <div className="space-y-4">
                                                <PropertyViewSection title="Order Overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                                                    <ViewField label="Vendor" value={displayOrder.vendorName} />
                                                    <ViewField label="Vendor Status" value={<GridBadge status={displayOrder.vendorStatus} statusType="vendor" className="h-6 px-2 text-[10px]">{displayOrder.vendorStatusLabel}</GridBadge>} />
                                                    <ViewField label="Laundry Status" value={<GridBadge status={order.laundry_status} statusType="laundry" className="h-6 px-2 text-[10px]">{displayOrder.laundryStatusLabel}</GridBadge>} />
                                                    <ViewField label="Pickup Date" value={formatDateTime(order.pickup_date)} />
                                                    <ViewField label="Delivery Date" value={formatDateTime(order.delivery_date)} />
                                                    <ViewField label="Total Amount" value={formatLaundryAmount(getLaundryOrderTotalAmount(order))} className="font-semibold text-primary" />
                                                </PropertyViewSection>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-sm">
                                            <div className="bg-accent border border-primary/10 rounded-lg p-3 space-y-3 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-primary border border-primary/5">
                                                        <Truck className="w-3.5 h-3.5" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-primary">Order Assignment</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vendor</Label>
                                                        {viewItemsModal.editMode ? (
                                                            <NativeSelect
                                                                className="w-full h-9 border border-primary/20 bg-background rounded-md px-3 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                                                                value={editOrder?.vendor_id || ""}
                                                                onChange={(e) =>
                                                                    setEditOrder(prev => ({
                                                                        ...prev,
                                                                        vendor_id: e.target.value ? Number(e.target.value) : null
                                                                    }))
                                                                }
                                                            >
                                                                <option value="">Select Vendor</option>
                                                                {vendors?.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                                ))}
                                                            </NativeSelect>
                                                        ) : (
                                                            <p className="mt-1 text-sm font-semibold text-foreground">
                                                                {displayOrder.vendorName}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vendor Status</Label>
                                                        {viewItemsModal.editMode ? (
                                                            <NativeSelect
                                                                className="w-full h-9 border border-primary/20 bg-background rounded-md px-3 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                                                                value={editOrder?.vendor_status || editOrder?.vendorStatus}
                                                                onChange={(e) =>
                                                                    setEditOrder(prev => ({
                                                                        ...prev,
                                                                        vendor_status: e.target.value
                                                                    }))
                                                                }
                                                            >
                                                                {VENDOR_STATUSES.map(s => (
                                                                    <option key={s} value={s}>{formatDisplayStatus(s)}</option>
                                                                ))}
                                                            </NativeSelect>
                                                        ) : (
                                                            <div className="mt-1">
                                                                <GridBadge status={displayOrder.vendorStatus} statusType="vendor">
                                                                    {displayOrder.vendorStatusLabel}
                                                                </GridBadge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-accent border border-primary/10 rounded-lg p-3 space-y-3 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-primary border border-primary/5">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-primary/90">Status & Delivery</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Laundry Status</Label>
                                                        {viewItemsModal.editMode ? (
                                                            <NativeSelect
                                                                className="w-full h-9 border border-primary/20 bg-background rounded-md px-3 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                                                                value={editOrder?.laundry_status}
                                                                onChange={(e) =>
                                                                    setEditOrder(prev => ({
                                                                        ...prev,
                                                                        laundry_status: e.target.value
                                                                    }))
                                                                }
                                                            >
                                                                {LAUNDRY_STATUSES.map(s => (
                                                                    <option key={s} value={s}>{formatDisplayStatus(s)}</option>
                                                                ))}
                                                            </NativeSelect>
                                                        ) : (
                                                            <div className="mt-1">
                                                                <GridBadge status={order.laundry_status} statusType="laundry">
                                                                    {displayOrder.laundryStatusLabel}
                                                                </GridBadge>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Delivery Date</Label>
                                                        {viewItemsModal.editMode ? (
                                                            <DatePicker
                                                                selected={parseDate(editOrder?.delivery_date || order.delivery_date)}
                                                                onChange={(date) =>
                                                                    setEditOrder(prev => ({
                                                                        ...prev,
                                                                        delivery_date: formatDate(date)
                                                                    }))
                                                                }
                                                                showTimeSelect
                                                                timeIntervals={15}
                                                                minDate={now}
                                                                minTime={
                                                                    parseDate(form.pickupDate)?.toDateString() === now.toDateString()
                                                                        ? now
                                                                        : new Date(new Date().setHours(0, 0, 0, 0))
                                                                }
                                                                maxTime={new Date(new Date().setHours(23, 59, 59, 999))}
                                                                dateFormat="dd/MM/yy HH:mm"
                                                                wrapperClassName="block w-full"
                                                                className="w-full h-9 border border-primary/20 bg-background rounded-md px-3 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary mt-1"
                                                            />
                                                        ) : (
                                                            <p className="mt-1 text-sm font-semibold text-foreground">
                                                                {formatDateTime(order.delivery_date)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pickup Date</Label>
                                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                                            {formatDateTime(order.pickup_date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                                        )}

                                        <PropertyViewSection title="Order Items" className="mt-0">
                                            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                                <AppDataGrid
                                                    density="compact"
                                                    scrollable={false}
                                                    tableClassName="w-full"
                                                    columns={[
                                                        {
                                                            label: "Item",
                                                            className: "w-[46%]",
                                                            cellClassName: "font-medium text-foreground",
                                                            render: (item: any) => item.item_name || "--",
                                                        },
                                                        {
                                                            label: "Room",
                                                            className: "w-[18%]",
                                                            headClassName: "text-center",
                                                            cellClassName: "text-center text-muted-foreground",
                                                            render: (item: any) => item.room_no || "--",
                                                        },
                                                        {
                                                            label: "Qty",
                                                            className: "w-[12%]",
                                                            headClassName: "text-center",
                                                            cellClassName: "text-center font-medium",
                                                            render: (item: any) => item.item_count ?? "--",
                                                        },
                                                        {
                                                            label: "Amount",
                                                            className: "w-[24%]",
                                                            headClassName: "text-right",
                                                            cellClassName: "text-right font-medium",
                                                            render: (item: any) => formatLaundryAmount(item.amount),
                                                        },
                                                    ] as ColumnDef[]}
                                                    data={orderItems}
                                                    rowKey={(_, index) => index}
                                                    emptyText="No laundry items found"
                                                    minWidth="500px"
                                                    showActions={false}
                                                    className="mt-0 border-0"
                                                />
                                            </div>
                                        </PropertyViewSection>
                                            </div>
                                        )}

                                        {sheetTab === "history" && (
                                            <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                                <p className="text-sm text-muted-foreground text-center">No history logs available yet.</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {viewItemsModal.order && (
                            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
                                {!viewItemsModal.editMode ? (
                                    <Button
                                        variant="heroOutline"
                                        onClick={() => setViewItemsModal({ open: false, editMode: false, order: null })}
                                    >
                                        Close
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="heroOutline"
                                            onClick={() => setViewItemsModal({ open: false, editMode: false, order: null })}
                                        >
                                            Cancel
                                        </Button>
                                        <Button variant="hero" onClick={updateOrder}>
                                            Save Changes
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </motion.div>
                </SheetContent>
            </Sheet>


            {/* Status Confirm Modal */}
            <Dialog
                open={statusModal.open}
                onOpenChange={() => setStatusModal({ open: false })}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirm Status Update</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">

                        {statusModal.type === "vendorAssign"
                            ? "Are you sure you want to change vendor?"
                            : `Are you sure you want to update ${statusModal.type} status to `}

                        {statusModal.status && (
                            <strong> {formatDisplayStatus(statusModal.status)}</strong>
                        )}

                    </p>


                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="heroOutline"
                            onClick={() => setStatusModal({ open: false })}
                        >
                            Cancel
                        </Button>
                        <Button variant="hero" onClick={handleStatusUpdate}>
                            Update
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>


            <Sheet
                open={historyModal.open}
                onOpenChange={() => setHistoryModal({ open: false, order: null })}
            >
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <SheetTitle>Laundry Order History</SheetTitle>
                        </SheetHeader>

                        {/* ================= CONTENT ================= */}

                        <div className="mt-6 space-y-4">

                            {singleLog?.data?.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-10 bg-muted/5 border rounded-lg italic">
                                    No history found for this order.
                                </p>
                            )}

                            {singleLog?.data?.map(log => {
                                const changes = getLaundryAuditChanges(log);

                                return (
                                    <div key={log.id} className="border rounded-lg p-5 space-y-4 bg-muted/5">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="font-bold text-primary uppercase text-xs tracking-wider">
                                                    {formatDisplayStatus(log.task_name || log.event_type)}
                                                </div>
                                                <div className="text-sm font-medium">
                                                    {log.user_first_name} {log.user_last_name}
                                                </div>
                                            </div>

                                            <div className="text-muted-foreground text-xs font-medium bg-background border px-2 py-1 rounded">
                                                {formatDateTime(log.created_on)}
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-border/50">
                                            {changes.map((c, i) => (
                                                <div key={i} className="text-sm flex items-center gap-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                                    {c}
                                                </div>
                                            ))}
                                            {changes.length === 0 && (
                                                <div className="text-sm text-muted-foreground italic">No data changes recorded.</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

        </div>
    );
}
