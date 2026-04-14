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
import { CalendarIcon, Download, FilterX, RefreshCcw } from "lucide-react";
import DatePicker from 'react-datepicker'
import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { extractApiErrorMessage } from "@/utils/apiError";
import { apiToast } from "@/utils/apiToastPromise";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { getStatusColor } from "@/constants/statusColors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";

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
    const [ordersLimit, setOrdersLimit] = useState(10);
    const [auditLimit, setAuditLimit] = useState(20);

    const [editOrder, setEditOrder] = useState<any>(null);
    const [historyModal, setHistoryModal] = useState({
        open: false,
        order: null as LaundryOrder | null
    });
    const [prefillApplied, setPrefillApplied] = useState(false);
    const prefilledBookingId = location.state?.bookingId;
    const prefilledPropertyId = location.state?.propertyId;
    const prefilledBookingStatus = location.state?.bookingStatus;


    const { 
        myProperties, 
        isMultiProperty, 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

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

            toast.error("Please fix errors before creating order");
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
                    itemCount: ""
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
            const normalizedVendorStatus = order.vendor_status || order.vendorStatus || "NOT_ALLOTTED";
            const vendorName = vendors?.find(v => v.id === order.vendor_id)?.name || "";
            const matchesLaundryStatus = !laundryStatusFilter || order.laundry_status === laundryStatusFilter;
            const matchesVendorStatus = !vendorStatusFilter || normalizedVendorStatus === vendorStatusFilter;

            if (!matchesLaundryStatus || !matchesVendorStatus) {
                return false;
            }

            if (!query) {
                return true;
            }

            const searchFields = [
                order.id?.toString() || "",
                `${order.items?.length ?? 0} item(s)`,
                order.pickup_date ? new Date(order.pickup_date).toLocaleString() : "",
                order.delivery_date ? new Date(order.delivery_date).toLocaleString() : "",
                order.laundry_status || "",
                normalizedVendorStatus,
                vendorName,
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

            const details = audit.details as Record<string, Record<string, string>> | undefined;
            const before = details?.before;
            const after = details?.after;

            const changes: string[] = [];
            if (audit.event_type === "CREATE") {
                changes.push("Order Created");
            } else {
                if (before?.laundry_status !== after?.laundry_status) {
                    changes.push(`Laundry: ${before?.laundry_status} -> ${after?.laundry_status}`);
                }
                if (before?.vendor_status !== after?.vendor_status) {
                    changes.push(`Vendor: ${before?.vendor_status} -> ${after?.vendor_status}`);
                }
                if (before?.vendor_id !== after?.vendor_id) {
                    changes.push("Vendor Assigned");
                }
                if (before?.delivery_date !== after?.delivery_date) {
                    changes.push("Delivery Date Updated");
                }
            }

            if (!query) {
                return true;
            }

            const searchFields = [
                audit.event_id?.toString() || "",
                audit.event_type || "",
                changes.join(", "),
                `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim(),
                audit.created_on ? new Date(audit.created_on as string).toLocaleString() : "",
            ];

            return searchFields.some((field) => field.toLowerCase().includes(query));
        });
    }, [auditActionFilter, auditSearchQuery, logs?.data]);

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
                const normalizedVendorStatus = order.vendor_status || order.vendorStatus || "NOT_ALLOTTED";
                const vendorName = vendors?.find(v => v.id === order.vendor_id)?.name || "--";

                return {
                    ORDER_ID: order.id,
                    ITEM_COUNT: order.items?.length ?? 0,
                    PICKUP_DATE: order.pickup_date ? new Date(order.pickup_date).toLocaleString() : "--",
                    DELIVERY_DATE: order.delivery_date ? new Date(order.delivery_date).toLocaleString() : "--",
                    LAUNDRY_STATUS: order.laundry_status,
                    VENDOR_STATUS: normalizedVendorStatus,
                    VENDOR_NAME: vendorName,
                    AMOUNT: order.amount,
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
            const details = audit.details as Record<string, Record<string, string>> | undefined;
            const before = details?.before;
            const after = details?.after;

            const changes: string[] = [];
            if (audit.event_type === "CREATE") {
                changes.push("Order Created");
            } else {
                if (before?.laundry_status !== after?.laundry_status) {
                    changes.push(`Laundry: ${before?.laundry_status} -> ${after?.laundry_status}`);
                }
                if (before?.vendor_status !== after?.vendor_status) {
                    changes.push(`Vendor: ${before?.vendor_status} -> ${after?.vendor_status}`);
                }
                if (before?.vendor_id !== after?.vendor_id) {
                    changes.push("Vendor Assigned");
                }
                if (before?.delivery_date !== after?.delivery_date) {
                    changes.push("Delivery Date Updated");
                }
            }

            return {
                ORDER_ID: audit.event_id,
                ACTION: audit.event_type,
                CHANGE: changes.join(", "),
                USER: `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim(),
                DATE: audit.created_on ? new Date(audit.created_on as string).toLocaleString() : "--",
            };
        });

        exportToExcel(formatted, "LaundryOrderHistory.xlsx");
        toast.success("Export completed");
    };

    return (
        <>
            <section className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Laundry Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            Track & manage laundry processing
                        </p>
                    </div>

                    {permission?.can_create && <Button variant="hero" onClick={() => setSheetOpen(true)}>
                        Create Order
                    </Button>}
                </div>

                <div className="border-b border-border flex">

                    <div
                        onClick={() => setActiveTab("orders")}
                        className={cn(
                            "px-4 py-3 text-sm font-medium cursor-pointer border-b-2 transition",
                            activeTab === "orders"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Laundry Orders
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
                    <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className={isMultiProperty ? "md:grid-cols-[repeat(4,1fr)_auto]" : "md:grid-cols-[repeat(3,1fr)_auto]"}>
                                    {isMultiProperty && (
                                        <GridToolbarSelect
                                            label="PROPERTY"
                                            value={selectedPropertyId}
                                            onChange={(value) => {
                                                setSelectedPropertyId(value);
                                                setOrdersPage(1);
                                                setAuditPage(1);
                                            }}
                                            options={myProperties?.properties?.map((property) => ({
                                                label: property.brand_name,
                                                value: property.id,
                                            })) ?? []}
                                        />
                                    )}

                                    <GridToolbarSearch
                                        value={searchInput}
                                        onChange={setSearchInput}
                                        onSearch={() => {
                                            setSearchQuery(searchInput.trim());
                                            setOrdersPage(1);
                                        }}
                                        placeholder="Search Laundry Orders..."
                                    />

                                    <GridToolbarSelect
                                        label="VENDOR"
                                        value={vendorStatusFilter}
                                        onChange={(value) => {
                                            setVendorStatusFilter(value);
                                            setOrdersPage(1);
                                        }}
                                        options={[
                                            { label: "Any", value: "" },
                                            ...VENDOR_STATUSES.map((status) => ({
                                                label: status.replace(/_/g, " "),
                                                value: status,
                                            })),
                                        ]}
                                    />

                                    <GridToolbarSelect
                                        label="STATUS"
                                        value={laundryStatusFilter}
                                        onChange={(value) => {
                                            setLaundryStatusFilter(value);
                                            setOrdersPage(1);
                                        }}
                                        options={[
                                            { label: "Any", value: "" },
                                            ...LAUNDRY_STATUSES.map((status) => ({
                                                label: status.replace(/_/g, " "),
                                                value: status,
                                            })),
                                        ]}
                                    />

                                    <GridToolbarActions
                                        className="gap-1"
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
                                columns={[
                                    {
                                        label: "#Id",
                                        cellClassName: "font-medium",
                                        render: (order: LaundryOrder) => `#${order.id}`,
                                    },
                                    {
                                        label: "No. of Items",
                                        cellClassName: "font-medium",
                                        render: (order: LaundryOrder) => `${order.items?.length ?? 0} item(s)`,
                                    },
                                    {
                                        label: "Pickup Date",
                                        cellClassName: "text-xs text-muted-foreground",
                                        render: (order: LaundryOrder) => new Date(order.pickup_date).toLocaleString(),
                                    },
                                    {
                                        label: "Laundry Status",
                                        render: (order: LaundryOrder) => (
                                            <span
                                                className={cn(
                                                    "px-2 py-1 rounded text-xs font-medium",
                                                    getStatusColor(order.laundry_status, "laundry")
                                                )}
                                            >
                                                {order.laundry_status.replace(/_/g, " ")}
                                            </span>
                                        ),
                                    },
                                    {
                                        label: "Vendor Status",
                                        render: (order: LaundryOrder) => (
                                            <span
                                                className={cn(
                                                    "px-2 py-1 rounded text-xs font-medium",
                                                    getStatusColor(
                                                        order.vendor_status ||
                                                        order.vendorStatus ||
                                                        "NOT_ALLOTTED",
                                                        "vendor"
                                                    )
                                                )}
                                            >
                                                {(order.vendor_status || order.vendorStatus || "NOT_ALLOTTED")
                                                    .replace(/_/g, " ")}
                                            </span>
                                        ),
                                    },
                                    {
                                        label: "Vendor",
                                        render: (order: LaundryOrder) => (
                                            <span className="text-sm">
                                                {vendors?.find(v => v.id === order.vendor_id)?.name || "--"}
                                            </span>
                                        ),
                                    },
                                ] as ColumnDef[]}
                                data={filteredOrders}
                                loading={ordersLoading}
                                emptyText="No laundry orders found"
                                minWidth="900px"
                                className="mt-0"
                                actions={(order: LaundryOrder) => (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="heroOutline"
                                            onClick={() =>
                                                setViewItemsModal({
                                                    open: true,
                                                    editMode: false,
                                                    order: order
                                                })
                                            }
                                        >
                                            Summary
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="heroOutline"
                                            onClick={() => {
                                                setHistoryModal({
                                                    open: true,
                                                    order
                                                });
                                            }}
                                        >
                                            History
                                        </Button>
                                    </div>
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
                )}

                {activeTab === "audit" && (
                    <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className={isMultiProperty ? "md:grid-cols-[repeat(4,1fr)_auto]" : "md:grid-cols-[repeat(3,1fr)_auto]"}>
                                    {isMultiProperty && (
                                        <GridToolbarSelect
                                            label="PROPERTY"
                                            value={selectedPropertyId}
                                            onChange={(value) => {
                                                setSelectedPropertyId(value);
                                                setOrdersPage(1);
                                                setAuditPage(1);
                                            }}
                                            options={myProperties?.properties?.map((property) => ({
                                                label: property.brand_name,
                                                value: property.id,
                                            })) ?? []}
                                        />
                                    )}

                                    <GridToolbarSearch
                                        value={auditSearchInput}
                                        onChange={setAuditSearchInput}
                                        onSearch={() => {
                                            setAuditSearchQuery(auditSearchInput.trim());
                                            setAuditPage(1);
                                        }}
                                        placeholder="Search History..."
                                    />

                                    <GridToolbarSelect
                                        label="ACTION"
                                        value={auditActionFilter}
                                        onChange={(value) => {
                                            setAuditActionFilter(value);
                                            setAuditPage(1);
                                        }}
                                        options={[
                                            { label: "Any", value: "" },
                                            ...AUDIT_ACTIONS.map((action) => ({
                                                label: action,
                                                value: action,
                                            })),
                                        ]}
                                    />

                                    <GridToolbarActions
                                        className="gap-1"
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
                                columns={[
                                    {
                                        label: "Order",
                                        cellClassName: "font-medium",
                                        render: (audit) => `#${audit.event_id}`,
                                    },
                                    {
                                        label: "Action",
                                        key: "event_type",
                                    },
                                    {
                                        label: "Change",
                                        render: (audit) => {
                                            const details = audit.details as Record<string, Record<string, string>> | undefined;
                                            const before = details?.before;
                                            const after = details?.after;

                                            if (audit.event_type === "CREATE") return "Order Created";

                                            const changes: string[] = [];
                                            if (before?.laundry_status !== after?.laundry_status)
                                                changes.push(`Laundry: ${before?.laundry_status} -> ${after?.laundry_status}`);
                                            if (before?.vendor_status !== after?.vendor_status)
                                                changes.push(`Vendor: ${before?.vendor_status} -> ${after?.vendor_status}`);
                                            if (before?.vendor_id !== after?.vendor_id)
                                                changes.push("Vendor Assigned");
                                            if (before?.delivery_date !== after?.delivery_date)
                                                changes.push("Delivery Date Updated");

                                            return changes.join(", ");
                                        },
                                    },
                                    {
                                        label: "User",
                                        cellClassName: "text-muted-foreground",
                                        render: (audit) => `${audit.user_first_name} ${audit.user_last_name}`,
                                    },
                                    {
                                        label: "Date",
                                        cellClassName: "text-muted-foreground",
                                        render: (audit) => new Date(audit.created_on as string).toLocaleString(),
                                    },
                                ] as ColumnDef[]}
                                data={filteredAuditLogs}
                                loading={logsFetching}
                                emptyText="No audit logs found"
                                minWidth="700px"
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
                )}




            </section>

            {/* Create Order Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-4xl h-full overflow-y-auto">

                    <SheetHeader>
                        <SheetTitle>Create Laundry Order</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6 mt-6">

                        {/* ================= HEADER SECTION ================= */}

                        <div className="grid grid-cols-4 gap-4">

                            {/* Vendor */}
                            <div className="space-y-1">
                                <Label>Vendor</Label>
                                <NativeSelect
                                    className="w-full h-10 border rounded px-3 text-sm"
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
                                    className="w-full h-10 border rounded px-3 text-sm"
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
                                    <DatePicker
                                        selected={parseDate(form.pickupDate)}
                                        onChange={(date) =>
                                            setForm(prev => ({
                                                ...prev,
                                                pickupDate: formatDate(date)
                                            }))
                                        }
                                        showTimeSelect
                                        timeIntervals={15}
                                        dateFormat="dd/MM/yyyy HH:mm"

                                        minDate={now}

                                        minTime={
                                            parseDate(form.pickupDate)?.toDateString() === now.toDateString()
                                                ? now
                                                : new Date(new Date().setHours(0, 0, 0, 0))
                                        }

                                        maxTime={new Date(new Date().setHours(23, 59, 59, 999))}

                                        className="w-full h-10 border rounded px-3 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Booking */}
                            <div className="space-y-1">
                                <Label>Booking ID</Label>
                                <NativeSelect
                                    className="w-full h-10 border rounded px-3 text-sm"
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

                        <div className="border rounded-md overflow-hidden">

                            {/* HEADER */}
                            <div
                                className={cn(
                                    "grid text-sm font-semibold border-b",
                                    form.bookingId
                                        ? "grid-cols-[2fr_1fr_1fr_40px]"
                                        : "grid-cols-[2fr_1fr_40px]"
                                )}
                            >
                                <div className="px-3 py-2 border-r">Item *</div>

                                {form.bookingId && (
                                    <div className="px-3 py-2 border-r">Room</div>
                                )}

                                <div className="px-3 py-2 border-r">Quantity *</div>

                                <div />
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
                                            "grid border-b last:border-b-0 hover:bg-muted/30",
                                            form.bookingId
                                                ? "grid-cols-[2fr_1fr_1fr_40px]"
                                                : "grid-cols-[2fr_1fr_40px]"
                                        )}
                                    >

                                        {/* ITEM */}
                                        <div className="border-r p-1">

                                            <MenuItemSelect
                                                value={row.laundryId || null}
                                                items={laundryTypes?.data || []}
                                                disabledIds={[]}   // or your duplicate prevention array
                                                itemName="item_name"
                                                extraClasses={cn(
                                                    "h-8 w-full",
                                                    error && "border-red-500"
                                                )}
                                                onSelect={(id) =>
                                                    updateItem(index, {
                                                        laundryId: id
                                                    })
                                                }
                                            />

                                        </div>


                                        {/* ROOM */}
                                        {form.bookingId && (
                                            <div className="border-r p-1">
                                                <NativeSelect
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border border-input bg-white outline-none focus:ring-1 focus:ring-primary",
                                                        error && !row.roomNo && "border-red-500 bg-red-50"
                                                    )}
                                                    value={row.roomNo || ""}
                                                    onChange={(e) =>
                                                        updateItem(index, { roomNo: e.target.value })
                                                    }
                                                >
                                                    <option value="">--</option>

                                                    {bookingData?.booking?.rooms?.map(room => (
                                                        <option key={room.room_no} value={room.room_no}>
                                                            {room.room_no}
                                                        </option>
                                                    ))}
                                                </NativeSelect>
                                            </div>
                                        )}


                                        {/* QTY */}
                                        <div className="border-r p-1">
                                            <input
                                                className={cn(
                                                    "w-full h-8 px-2 text-sm outline-none rounded border border-input bg-white",
                                                    error && "border-red-500 bg-red-50"
                                                )}
                                                value={row.itemCount}
                                                title={error || ""}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        itemCount: +normalizeNumberInput(e.target.value)
                                                    })
                                                }
                                            />
                                        </div>


                                        {/* REMOVE */}
                                        <div className="flex items-center justify-center">
                                            <button
                                                type="button"
                                                className="text-red-500 hover:text-red-700 text-sm"
                                                onClick={() => removeRow(row.id)}
                                            >
                                                ✕
                                            </button>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>


                        <Button variant="heroOutline" onClick={addRow}>
                            + Add Item
                        </Button>

                        {/* Submit */}
                        <Button
                            variant="hero"
                            className="w-full"
                            onClick={handleCreateOrder}
                        >
                            Create Order
                        </Button>

                    </div>

                </SheetContent>
            </Sheet>

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

                                {/* Vendor */}
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
                                            {vendors?.find(v => v.id === viewItemsModal.order.vendor_id)?.name || "--"}
                                        </p>
                                    )}

                                </div>

                                {/* Laundry Status */}
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
                                                <option key={s}>{s}</option>
                                            ))}
                                        </NativeSelect>
                                    ) : (
                                        <p className="mt-1 font-medium">
                                            {viewItemsModal.order.laundry_status}
                                        </p>
                                    )}
                                </div>

                                {/* Vendor Status */}
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
                                                <option key={s}>{s}</option>
                                            ))}
                                        </NativeSelect>
                                    ) : (
                                        <p className="mt-1 font-medium">
                                            {(viewItemsModal.order.vendor_status || viewItemsModal.order.vendorStatus)?.replace(/_/g, " ")}
                                        </p>
                                    )}
                                </div>

                                {/* Delivery Date */}
                                <div>
                                    <Label>Delivery Date</Label>

                                    {viewItemsModal.editMode ? (
                                        <div>
                                            <DatePicker
                                                selected={parseDate(viewItemsModal.order.delivery_date)}
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
                                        </div>
                                    ) : (
                                        <p className="mt-1 font-medium">
                                            {viewItemsModal.order.delivery_date
                                                ? new Date(viewItemsModal.order.delivery_date).toLocaleString()
                                                : "--"}
                                        </p>
                                    )}
                                </div>

                            </div>

                            {/* ===== ITEMS TABLE (READ ONLY ALWAYS) ===== */}

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

                            {/* ===== ACTIONS ===== */}

                            <div className="flex justify-end gap-2">

                                {!viewItemsModal.editMode ? (

                                    <Button
                                        variant="hero"
                                        onClick={() => {
                                            setEditOrder(viewItemsModal.order);
                                            setViewItemsModal(prev => ({ ...prev, editMode: true }))
                                        }}
                                    >
                                        Edit
                                    </Button>

                                ) : (

                                    <Button variant="hero" onClick={updateOrder}>
                                        Save Changes
                                    </Button>

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

                            const details = typeof log.details === "string"
                                ? JSON.parse(log.details)
                                : log.details;

                            const before = details?.before;
                            const after = details?.after;

                            const changes = [];

                            if (log.event_type === "CREATE") {
                                changes.push("Order Created");
                            }

                            if (before?.laundry_status !== after?.laundry_status) {
                                changes.push(`Laundry Status: ${before?.laundry_status} → ${after?.laundry_status}`);
                            }

                            if (before?.vendor_status !== after?.vendor_status) {
                                changes.push(`Vendor Status: ${before?.vendor_status} → ${after?.vendor_status}`);
                            }

                            if (before?.vendor_id !== after?.vendor_id) {
                                changes.push("Vendor Assigned");
                            }

                            if (before?.delivery_date !== after?.delivery_date) {
                                changes.push("Delivery Date Updated");
                            }

                            return (

                                <div key={log.id} className="border rounded-md p-4 space-y-2">

                                    <div className="flex justify-between text-sm">

                                        <div className="font-medium">
                                            {log.task_name || log.event_type}
                                        </div>

                                        <div className="text-muted-foreground text-xs">
                                            {new Date(log.created_on).toLocaleString()}
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

        </>
    );
}

