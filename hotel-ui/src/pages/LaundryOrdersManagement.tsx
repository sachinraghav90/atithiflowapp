import { useEffect, useMemo, useState } from "react";
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
import { useCreateLaundryOrderMutation, useGetAllPropertyVendorsQuery, useGetBookingByIdQuery, useGetLogsByTableQuery, useGetLogsQuery, useGetPropertyLaundryOrdersQuery, useGetPropertyLaundryPricingQuery, useLazyExportPropertyLaundryOrdersQuery, useTodayInHouseBookingIdsQuery, useUpdateLaundryOrderMutation } from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Download, FilterX, Pencil, RefreshCcw, Trash2, Plus, PlusCircle } from "lucide-react";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
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
    // item_name: string;
    // item_count: number;
    // item_rate: string;
    amount: string;
    laundry_status: LaundryStatus;
    vendor_id?: string;
    pickup_date: string;
    delivery_date?: string | null;
    vendor_status?: VendorStatus;
    vendorStatus?: VendorStatus; // Handle both cases for safety
    items?: any[]
};

type LaundryItemRow = {
    id: string; // frontend only
    laundryId: number | "";
    roomNo?: string;
    itemCount: number | "";
    touched?: {
        laundryId?: boolean;
        roomNo?: boolean;
        itemCount?: boolean;
    };
};

type CreateLaundryOrderForm = {
    bookingId?: number | "";
    vendorId: number | "";
    pickupDate: string | Date;
    vendorStatus: VendorStatus;

    items: LaundryItemRow[];
};

/* ---------------- Helpers ---------------- */
function buildCreateLaundryOrderPayload(
    propertyId: number,
    form: CreateLaundryOrderForm
) {
    return {
        property_id: propertyId,
        booking_id: form.bookingId ? Number(form.bookingId) : null,
        vendor_id: form.vendorId ? Number(form.vendorId) : null,
        pickup_date: typeof form.pickupDate === "string"
            ? form.pickupDate
            : form.pickupDate.toISOString(),
        vendor_status: form.vendorStatus,
        items: form.items.map(i => ({
            laundry_id: Number(i.laundryId),
            item_count: Number(i.itemCount),
            room_no: i.roomNo || null
        }))
    };
}

function buildLaundryStatusPayload(status: LaundryStatus) {
    return {
        laundryStatus: status,
    };
}

function parseDate(value?: string | Date) {
    return value ? new Date(value) : null;
}

function formatDate(date?: Date | null) {
    return date ? date.toISOString() : "";
}

function formatDateTime(value?: string | null) {
    return value ? new Date(value).toLocaleString() : "--";
}

function formatDisplayStatus(value?: string | null) {
    return value ? value.replace(/_/g, " ") : "--";
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
        orderLabel: `#${audit.event_id}`,
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
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [sheetOpen, setSheetOpen] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [viewItemsModal, setViewItemsModal] = useState({
        open: false,
        editMode: false,
        order: null as LaundryOrder | null
    });


    const [statusModal, setStatusModal] = useState<{
        open: boolean;
        orderId?: string;
        status?: string;
        vendorId?: number | null;
        type?: 'laundry' | 'vendor' | 'vendorAssign';
    }>({ open: false });

    const [form, setForm] = useState<CreateLaundryOrderForm>({
        vendorId: "",
        pickupDate: new Date(),
        vendorStatus: "NOT_ALLOTTED",
        items: [
            {
                id: crypto.randomUUID(),
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
    const [ordersLimit, setOrdersLimit] = useState(5);
    const [auditLimit, setAuditLimit] = useState(5);

    const [editOrder, setEditOrder] = useState<any>(null);
    const [historyModal, setHistoryModal] = useState({
        open: false,
        order: null as LaundryOrder | null
    });
    const [prefillApplied, setPrefillApplied] = useState(false);
    const prefilledBookingId = location.state?.bookingId;
    const prefilledPropertyId = location.state?.propertyId;
    const prefilledBookingStatus = location.state?.bookingStatus;


    const { myProperties, isMultiProperty, isInitializing } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data, isLoading: ordersLoading, isFetching: ordersFetching, refetch: refetchOrders } = useGetPropertyLaundryOrdersQuery({ propertyId: selectedPropertyId, page: ordersPage, limit: ordersLimit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    const [getAllLaundryOrders, { isFetching: exportingLaundryOrders }] = useLazyExportPropertyLaundryOrdersQuery()

    const { data: laundryTypes } = useGetPropertyLaundryPricingQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: vendors } = useGetAllPropertyVendorsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: bookingIds } = useTodayInHouseBookingIdsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: bookingData } = useGetBookingByIdQuery(form.bookingId, {
        skip: !isLoggedIn || !form.bookingId
    })

    const { data: logs, isFetching: logsFetching, refetch: refetchLogs } = useGetLogsByTableQuery({ tableName: "laundry_orders", propertyId: selectedPropertyId, page: auditPage, limit: auditLimit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    const { data: singleLog } = useGetLogsQuery({ tableName: "laundry_orders", eventId: historyModal.order?.id }, {
        skip: !isLoggedIn || !historyModal.order?.id
    })
    const [createLaundryOrder] = useCreateLaundryOrderMutation()
    const [updateLaundryOrder] = useUpdateLaundryOrderMutation()

    useEffect(() => {
        if (selectedPropertyId) {
            setOrdersPage(1);
            setAuditPage(1);
        }
    }, [selectedPropertyId]);

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
            form
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

            /* ✅ RESET FORM — NEW STRUCTURE */
            setForm({
                vendorId: "",
                pickupDate: new Date(),
                vendorStatus: "NOT_ALLOTTED",
                bookingId: "",
                items: [
                    {
                        id: crypto.randomUUID(),
                        laundryId: "",
                        roomNo: "",
                        itemCount: ""
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
                    id: crypto.randomUUID(),
                    laundryId: "",
                    roomNo: "",
                    itemCount: "",
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

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const filteredOrders = useMemo(() => {
        if (!data?.data) return [];

        const query = searchQuery.trim().toLowerCase();

        return data.data.filter((order) => {
            const displayOrder = getLaundryOrderDisplay(order, vendors);
            const matchesLaundryStatus = !laundryStatusFilter || order.laundry_status === laundryStatusFilter;
            const matchesVendorStatus = !vendorStatusFilter || displayOrder.vendorStatus === vendorStatusFilter;

            if (!matchesLaundryStatus || !matchesVendorStatus) {
                return false;
            }

            if (!query) {
                return true;
            }

            const searchFields = [
                order.id?.toString() || "",
                displayOrder.itemLabel,
                displayOrder.itemCountLabel,
                displayOrder.pickupDateLabel,
                displayOrder.deliveryDateLabel,
                displayOrder.laundryStatusLabel,
                displayOrder.vendorStatusLabel,
                displayOrder.vendorName,
                order.amount || "",
            ];

            return searchFields.some((field) =>
                field.toLowerCase().includes(query)
            );
        });
    }, [data?.data, laundryStatusFilter, searchQuery, vendorStatusFilter, vendors]);

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
            label: "Laundry ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (order: LaundryOrder) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() =>
                        setViewItemsModal({
                            open: true,
                            editMode: false,
                            order,
                        })
                    }
                    aria-label={`Open summary view for laundry order ${formatModuleDisplayId("laundry_order", order.id)}`}
                >
                    {formatModuleDisplayId("laundry_order", order.id)}
                </button>
            ),
        },
        {
            label: "Item Name",
            cellClassName: "whitespace-nowrap max-w-[200px] truncate",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).itemLabel,
        },
        {
            label: "No. of Items",
            headClassName: "text-center",
            cellClassName: "text-center font-medium whitespace-nowrap",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).itemCountLabel,
        },
        {
            label: "Pickup Date",
            cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).pickupDateLabel,
        },
        {
            label: "Delivery Date",
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
        {
            label: "Vendor",
            cellClassName: "text-muted-foreground whitespace-nowrap text-sm",
            render: (order: LaundryOrder) => getLaundryOrderDisplay(order, vendors).vendorName,
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
        if (activeTab === "orders" && ordersFetching) return;
        if (activeTab === "audit" && logsFetching) return;

        if (activeTab === "orders") {
            await refetchOrders();
            return;
        }

        await refetchLogs();
    };

    const exportLaundryOrdersSheet = async () => {
        if (!selectedPropertyId || exportingLaundryOrders) return;

        const toastId = toast.loading("Preparing laundry orders export...");

        try {
            const res = await getAllLaundryOrders({
                propertyId: selectedPropertyId,
            }).unwrap();

            const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

            const formatted = rows.map((order: LaundryOrder) => {
                const displayOrder = getLaundryOrderDisplay(order, vendors);

                return {
                    "Laundry ID": formatModuleDisplayId("laundry_order", order.id),
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
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">
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
                                    <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                        Property
                                    </span>
                                    <NativeSelect
                                        className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                        value={selectedPropertyId}
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
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={searchInput}
                                        onChange={setSearchInput}
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
                                                label: status.replace(/_/g, " "),
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
                                                label: status.replace(/_/g, " "),
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
                                                disabled: ordersFetching,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>

                        <div className="px-2 pb-2">
                            <AppDataGrid
                                columns={laundryOrderColumns}
                                data={filteredOrders}
                                loading={ordersLoading || isInitializing}
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
                                                className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                onClick={() => {
                                                    setEditOrder(order);
                                                    setViewItemsModal({
                                                        open: true,
                                                        editMode: true,
                                                        order,
                                                    });
                                                }}
                                            >
                                                <Pencil className="w-4 h-4 mx-auto" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit Order</TooltipContent>
                                    </Tooltip>
                                )}
                                enablePagination={!!data?.pagination}
                                paginationProps={{
                                    page: ordersPage,
                                    totalPages: data?.pagination?.totalPages ?? 1,
                                    setPage: setOrdersPage,
                                    totalRecords: data?.pagination?.totalItems ?? data?.pagination?.total ?? data?.data?.length ?? 0,
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
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
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
                                columns={laundryAuditColumns}
                                data={filteredAuditLogs}
                                loading={logsFetching}
                                emptyText="No audit logs found"
                                minWidth="1080px"
                                className="mt-0"
                                enablePagination={!!logs?.pagination}
                                paginationProps={{
                                    page: auditPage,
                                    totalPages: logs?.pagination?.totalPages ?? 1,
                                    setPage: setAuditPage,
                                    totalRecords: logs?.pagination?.totalItems ?? logs?.pagination?.total ?? logs?.data?.length ?? 0,
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
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-4xl h-full overflow-y-auto bg-background">

                    <SheetHeader>
                        <SheetTitle>Add Laundry Order Items</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-3">

                        {/* ================= HEADER SECTION ================= */}

                        <div className="grid grid-cols-4 gap-4">

                            {/* Vendor */}
                            <div className="space-y-1">
                                <Label>Vendor</Label>
                                <NativeSelect
                                    className="w-full h-10 border rounded px-3 text-sm bg-background/50"
                                    value={form.vendorId}
                                    onChange={(e) =>
                                        setForm({ ...form, vendorId: Number(e.target.value) })
                                    }
                                >
                                    <option value="">-- Please Select --</option>
                                    {vendors?.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </NativeSelect>
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
                                            {s.replace(/_/g, " ")}
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

                            {/* Booking */}
                            <div className="space-y-1">
                                <Label>Booking ID</Label>
                                <NativeSelect
                                    className="w-full h-10 border rounded px-3 text-sm bg-background/50"
                                    value={form.bookingId}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            bookingId: e.target.value
                                                ? Number(e.target.value)
                                                : ""
                                        })
                                    }
                                >
                                    <option value="">No Booking (Hotel Laundry)</option>
                                    {bookingIds?.map(id => (
                                        <option key={id} value={id}>#{id}</option>
                                    ))}
                                </NativeSelect>
                            </div>


                        </div>

                        {/* ================= ITEMS TABLE ================= */}

                        <div className="overflow-hidden rounded-[5px] border border-border bg-background">

                            {/* HEADER */}
                            <div
                                className={cn(
                                    "grid bg-primary text-primary-foreground font-semibold border-b border-border",
                                    form.bookingId
                                        ? form.items.length > 1
                                            ? "grid-cols-[2fr_1fr_1fr_88px]"
                                            : "grid-cols-[2fr_1fr_1fr]"
                                        : form.items.length > 1
                                            ? "grid-cols-[2fr_1fr_88px]"
                                            : "grid-cols-[2fr_1fr]"
                                )}
                            >
                                <div className="px-5 py-2">Item *</div>

                                {form.bookingId && (
                                    <div className="px-5 py-2">Room</div>
                                )}

                                <div className="px-5 py-2">Quantity *</div>

                                {form.items.length > 1 && (
                                    <div className="px-3 py-2 text-center">Action</div>
                                )}
                            </div>

                            {/* ROWS */}
                            {form.items.map((row, index) => {

                                const error = showErrors
                                    ? getRowError(row, form.items, form.bookingId)
                                    : "";

                                return (
                                    <div
                                        key={row.id}
                                        className={cn(
                                            "grid border-b border-border last:border-b-0",
                                            form.bookingId
                                                ? form.items.length > 1
                                                    ? "grid-cols-[2fr_1fr_1fr_88px]"
                                                    : "grid-cols-[2fr_1fr_1fr]"
                                                : form.items.length > 1
                                                    ? "grid-cols-[2fr_1fr_88px]"
                                                    : "grid-cols-[2fr_1fr]"
                                        )}
                                    >

                                        {/* ITEM */}
                                        <div className="border-r border-border p-1.5">
                                            <ValidationTooltip
                                                isValid={!((showErrors || row.touched?.laundryId) && (error && (!row.laundryId || error === "Duplicate item selected")))}
                                                message={error === "Duplicate item selected" ? "Duplicate item selected" : "Required field"}
                                            >
                                                <MenuItemSelect
                                                    value={row.laundryId || null}
                                                    items={laundryTypes?.data || []}
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
                                        </div>


                                        {/* ROOM */}
                                        {form.bookingId && (
                                            <div className="border-r border-border p-1.5">
                                                <ValidationTooltip
                                                    isValid={!((showErrors || row.touched?.roomNo) && (error && !row.roomNo))}
                                                    message="Required field"
                                                >
                                                    <NativeSelect
                                                        className={cn(
                                                            "w-full h-9 rounded-[3px] border border-input bg-background px-3 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary",
                                                            (showErrors || row.touched?.roomNo) && (error && !row.roomNo) && "border-red-500"
                                                        )}
                                                        value={row.roomNo || ""}
                                                        onChange={(e) =>
                                                            updateItem(index, { 
                                                                roomNo: e.target.value,
                                                                touched: { ...row.touched, roomNo: true }
                                                            })
                                                        }
                                                    >
                                                        <option value="">--Please Select--</option>

                                                        {bookingData?.booking?.rooms?.map(room => (
                                                            <option key={room.room_no} value={room.room_no}>
                                                                {room.room_no}
                                                            </option>
                                                        ))}
                                                    </NativeSelect>
                                                </ValidationTooltip>
                                            </div>
                                        )}


                                        {/* QTY */}
                                        <div className="border-r border-border p-1.5">
                                            <ValidationTooltip
                                                isValid={!((showErrors || row.touched?.itemCount) && (error && !row.itemCount))}
                                                message="Required field"
                                            >
                                                <input
                                                    type="text"
                                                    name={`laundry_item_count_${index}`}
                                                    className={cn(
                                                        "w-full h-9 rounded-[3px] border border-input bg-background px-3 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary",
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
                                        </div>

                                        {/* REMOVE ACTION */}
                                        {form.items.length > 1 && (
                                            <div className="flex items-center justify-center px-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-10 w-10 text-destructive hover:text-destructive/80 transition-colors"
                                                    onClick={() => removeRow(row.id)}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="p-3 bg-muted/10">
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                    onClick={addRow}
                                >
                                    <PlusCircle className="w-4 h-4" /> Add New Order Item(s)
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setSheetOpen(false)}
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

                    </div>

                </SheetContent>
            </Sheet>

            {/* View / Edit Items Modal */}
            <Dialog
                open={viewItemsModal.open}
                onOpenChange={() =>
                    setViewItemsModal({ open: false, editMode: false, order: null })
                }
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Laundry Order Details</DialogTitle>
                    </DialogHeader>

                    {viewItemsModal.order && (
                        <div className="space-y-6 mt-4">
                            {/* ===== HEADER DETAILS ===== */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label>Vendor</Label>
                                    {viewItemsModal.editMode ? (
                                        <NativeSelect
                                            className="w-full h-9 border rounded px-2"
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
                                        <p className="mt-1 font-medium">
                                            {getLaundryVendorName(viewItemsModal.order, vendors)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label>Laundry Status</Label>
                                    {viewItemsModal.editMode ? (
                                        <NativeSelect
                                            className="w-full h-9 border rounded px-2"
                                            value={editOrder?.laundry_status}
                                            onChange={(e) =>
                                                setEditOrder(prev => ({
                                                    ...prev,
                                                    laundry_status: e.target.value
                                                }))
                                            }
                                        >
                                            {(["PENDING", "PICKED_UP", "IN_PROCESS", "DELIVERED", "CANCELLED"] as LaundryStatus[]).map(s => (
                                                <option key={s} value={s}>{formatDisplayStatus(s)}</option>
                                            ))}
                                        </NativeSelect>
                                    ) : (
                                        <p className="mt-1 font-medium">
                                            {formatDisplayStatus(viewItemsModal.order.laundry_status)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label>Vendor Status</Label>
                                    {viewItemsModal.editMode ? (
                                        <NativeSelect
                                            className="w-full h-9 border rounded px-2"
                                            value={editOrder?.vendor_status || editOrder?.vendorStatus}
                                            onChange={(e) =>
                                                setEditOrder(prev => ({
                                                    ...prev,
                                                    vendor_status: e.target.value
                                                }))
                                            }
                                        >
                                            {(["NOT_ALLOTTED", "PICKED_UP", "RECEIVED"] as VendorStatus[]).map(s => (
                                                <option key={s} value={s}>{formatDisplayStatus(s)}</option>
                                            ))}
                                        </NativeSelect>
                                    ) : (
                                        <p className="mt-1 font-medium">
                                            {formatDisplayStatus(viewItemsModal.order.vendor_status || viewItemsModal.order.vendorStatus)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label>Delivery Date</Label>
                                    {viewItemsModal.editMode ? (
                                        <DatePicker
                                            selected={parseDate(editOrder?.delivery_date || viewItemsModal.order.delivery_date)}
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
                                            dateFormat="dd/MM/yyyy HH:mm"
                                            className="w-full h-9 border rounded px-2"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">
                                            {formatDateTime(viewItemsModal.order.delivery_date)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="border rounded overflow-hidden">
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] text-xs font-medium bg-muted/30 border-b">
                                    <div className="px-3 py-2 border-r">Item</div>
                                    <div className="px-3 py-2 border-r">Room</div>
                                    <div className="px-3 py-2 border-r">Qty</div>
                                    <div className="px-3 py-2">Amount</div>
                                </div>
                                {viewItemsModal.order.items?.map((i, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-[2fr_1fr_1fr_1fr] text-sm border-b last:border-b-0"
                                    >
                                        <div className="px-3 py-2 border-r">{i.item_name}</div>
                                        <div className="px-3 py-2 border-r">{i.room_no || "--"}</div>
                                        <div className="px-3 py-2 border-r">{i.item_count}</div>
                                        <div className="px-3 py-2">₹{i.amount}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-2">
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>


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
                            <strong> {statusModal.status.replace(/_/g, " ")}</strong>
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


            <Dialog
                open={historyModal.open}
                onOpenChange={() => setHistoryModal({ open: false, order: null })}
            >
                <DialogContent className="max-w-3xl">

                    <DialogHeader>
                        <DialogTitle>Laundry Order History</DialogTitle>
                    </DialogHeader>

                    {/* ================= CONTENT ================= */}

                    <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4">

                        {singleLog?.data?.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No history found.
                            </p>
                        )}

                        {singleLog?.data?.map(log => {

                            const changes = getLaundryAuditChanges(log);

                            return (

                                <div key={log.id} className="border rounded-md p-4 space-y-2">

                                    <div className="flex justify-between text-sm">

                                        <div className="font-medium">
                                            {formatDisplayStatus(log.task_name || log.event_type)}
                                        </div>

                                        <div className="text-muted-foreground text-xs">
                                            {formatDateTime(log.created_on)}
                                        </div>

                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        {log.user_first_name} {log.user_last_name}
                                    </div>

                                    <div className="space-y-1 text-sm">
                                        {changes.map((c, i) => (
                                            <div key={i}>{c}</div>
                                        ))}
                                    </div>

                                </div>

                            );
                        })}

                    </div>


                </DialogContent>
            </Dialog>

        </div>
    );
}
