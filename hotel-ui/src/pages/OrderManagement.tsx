import "../index.css";
import { useEffect, useState, useMemo } from "react";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download, RefreshCcw, FilterX, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { useAppSelector } from "@/redux/hook";
import { selectCanAccessDeliveryFeatures, selectCanCreateOrders } from "@/redux/selectors/auth.selectors";
import {
    useLazyExportPropertyOrdersQuery,
    useGetPropertyOrdersQuery,
    usePrefetch,
    useGetLogsByTableQuery
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { OrderItemsModal } from "./OrderItemsModal";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DeliveryPartnerManager from "./DeliveryPartnerManager";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { useGridPagination } from "@/hooks/useGridPagination";
import { NativeSelect } from "@/components/ui/native-select";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { GridBadge } from "@/components/ui/grid-badge";
import { formatAppDateTime } from "@/utils/dateFormat";
import { getFormattedAuditChanges, getAuditActionBadge, getAuditChangePlainText } from "@/utils/auditUtils";

const parseAuditDetails = (details: any) => {
    if (!details) return null;
    if (typeof details === "string") {
        try { return JSON.parse(details); } catch { return null; }
    }
    return details;
};

const ORDER_STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

const formatOrderDisplayId = (orderId: string | number) =>
    formatModuleDisplayId("order", orderId);

const getOrderRoomTableDisplayValue = (order: Order) =>
    order.room_no || order.table_no || "—";

const formatOrderDateTime = (value: string | null | undefined) =>
    formatAppDateTime(value);

type Order = {
    id: string;
    property_id: string;
    table_no: string;
    guest_id: string | null;
    room_id: string | null;
    booking_id: string | null;
    order_date: string;
    total_amount: string;
    order_status: string;
    payment_status: string;
    waiter_staff_id: string;
    expected_delivery_time: string;
    room_no: string;
    guest_name: string | null;
    guest_mobile: string | null;
};

export function OrdersManagement() {
    const location = useLocation();
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [paymentFilter, setPaymentFilter] = useState<string>("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [itemsOpen, setItemsOpen] = useState(false);
    const [openOrderInEditMode, setOpenOrderInEditMode] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [activeTab, setActiveTab] = useState<"Orders" | "History">("Orders");
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");

    const { page: historyPage, limit: historyLimit, setPage: setHistoryPage, handleLimitChange: handleHistoryLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, historySearchQuery, historyActionFilter],
    });

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, statusFilter, paymentFilter, searchQuery],
    });
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const canAccessDeliveryFeatures = useAppSelector(selectCanAccessDeliveryFeatures);
    const canCreateOrders = useAppSelector(selectCanCreateOrders);

    const prefetchOrder = usePrefetch('getOrderById');

    const navigate = useNavigate()
    const summaryOrderId = useMemo(() => {
        return new URLSearchParams(location.search).get("summaryOrderId");
    }, [location.search]);

    const {
        myProperties,
        isMultiProperty,
        isInitializing
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const [getAllOrders, { reset, isFetching: exportingOrders }] = useLazyExportPropertyOrdersQuery();

    /* ============================
       ORDERS QUERY (PAGINATED)
    ============================ */
    const { data, isLoading, isFetching: ordersFetching, refetch } = useGetPropertyOrdersQuery(
        {
            propertyId: selectedPropertyId,
            page,
            limit,
            status: statusFilter || undefined,
            payment_status: paymentFilter || undefined,
            search: searchQuery
        },
        { skip: !isLoggedIn || !selectedPropertyId }
    );

    /* ============================
       AUDIT LOGS QUERY
    ============================ */
    const { data: auditLogs, isLoading: logsLoading, isFetching: logsFetching, refetch: refetchAuditLogs } = useGetLogsByTableQuery({
        tableName: "restaurant_orders",
        propertyId: selectedPropertyId,
        page: historyPage,
        limit: historyLimit,
        action: historyActionFilter || undefined,
        search: historySearchQuery || undefined
    }, {
        skip: activeTab !== "History" || !selectedPropertyId,
    });
    const filteredAuditLogs = useMemo(() => {
        let rows = auditLogs?.data ?? [];
        if (historySearchQuery) {
            const query = historySearchQuery.toLowerCase();
            rows = rows.filter((log: any) => {
                const searchFields = [
                    log.event_id?.toString() || "",
                    log.event_id ? formatModuleDisplayId("or", log.event_id) : "",
                    log.event_type || "",
                    `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || "System"
                ];
                return searchFields.some((field) => field.toLowerCase().includes(query));
            });
        }
        return rows;
    }, [auditLogs?.data, historySearchQuery]);



    /* ============================
       GLOBAL SEARCH FILTER
    ============================ */
    const filteredOrders = useMemo(() => {
        return data?.data ?? [];
    }, [data?.data]);

    useEffect(() => {
        if (!summaryOrderId) return;

        setOpenOrderInEditMode(false);
        setSelectedOrderId(summaryOrderId);
        setItemsOpen(true);
    }, [summaryOrderId]);

    // ################# Export Orders to Sheet #################
    const exportOrdersSheet = async () => {
        if (exportingOrders) return;

        const totalRecords = data?.pagination?.totalItems ?? data?.pagination?.total ?? (data?.data?.length || 0);
        if (!totalRecords) {
            toast.info("No orders to export");
            return;
        }

        const toastId = toast.loading("Preparing orders export...");

        try {
            const res = await getAllOrders({
                propertyId: selectedPropertyId,
                status: statusFilter || undefined,
                payment_status: paymentFilter || undefined,
                search: searchQuery,
            }).unwrap();

            if (!res?.data?.length) {
                toast.dismiss(toastId);
                toast.info("No orders to export");
                return;
            }


            const formatted = res.data.map(order => ({
                "Order ID": formatOrderDisplayId(order.id),
                "Guest": order.guest_name || "—",
                "Room/Table": getOrderRoomTableDisplayValue(order),
                "Delivery Time": formatOrderDateTime(order.expected_delivery_time),
                "Status": order.order_status || "—",
                "Payment": order.payment_status || "—",
                "Order Time": formatOrderDateTime(order.order_date),
            }));

            exportToExcel(formatted, "Orders.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export orders");
        }
    };

    const exportHistoryLogs = () => {
        if (!auditLogs?.data?.length) return toast.info("No history rows to export");
        const formatted = auditLogs.data.map((audit: any) => {
            const details = parseAuditDetails(audit.details);
            return {
                "Order ID": audit.event_id ? formatOrderDisplayId(audit.event_id) : "—",
                ACTION: audit.event_type,
                CHANGE: getAuditChangePlainText(details),
                USER: `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim(),
                DATE: formatAppDateTime(audit.created_on),
            };
        });
        exportToExcel(formatted, "Restaurant-Orders-History.xlsx");
        toast.success("Export completed");
    };

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId, statusFilter, paymentFilter, searchQuery]);

    // ############### Reset Filters & Search ###############
    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        setPaymentFilter("");
        resetPage();
    };

    const refreshTable = async () => {
        if (ordersFetching) return;
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

    const refreshHistoryTable = async () => {
        if (logsFetching) return;
        const toastId = toast.loading("Refreshing history...");
        try {
            await refetchAuditLogs();
            toast.dismiss(toastId);
            toast.success("History refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh history");
        }
    };


    const orderColumns = useMemo<ColumnDef<Order>[]>(() => [
        {
            label: "Order ID",
            headClassName: "text-center w-[120px]",
            cellClassName: "text-center font-medium text-primary min-w-[120px]",
            render: (order) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onMouseEnter={() => prefetchOrder(order.id)}
                    onFocus={() => prefetchOrder(order.id)}
                    onClick={() => {
                        setOpenOrderInEditMode(false);
                        setSelectedOrderId(order.id);
                        setItemsOpen(true);
                    }}
                    aria-label={`Open summary view for order ${formatOrderDisplayId(order.id)}`}
                >
                    {formatOrderDisplayId(order.id)}
                </button>
            ),
        },
        {
            label: "Guest",
            render: (order) => order.guest_name || "—",
        },
        {
            label: "Room/Table",
            headClassName: "text-center",
            cellClassName: "text-center font-medium",
            render: (order) => getOrderRoomTableDisplayValue(order),
        },
        {
            label: "Delivery Time",
            cellClassName: "text-xs",
            render: (order) => formatOrderDateTime(order.expected_delivery_time),
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (order) => (
                <GridBadge status={order.order_status} statusType="order">
                    {order.order_status}
                </GridBadge>
            ),
        },
        {
            label: "Payment",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (order) => (
                <GridBadge status={order.payment_status} statusType="payment">
                    {order.payment_status}
                </GridBadge>
            ),
        },
        {
            label: "Order Time",
            cellClassName: "text-xs text-muted-foreground",
            render: (order) => formatOrderDateTime(order.order_date),
        },
    ], [prefetchOrder]);

    const historyColumns = useMemo<ColumnDef<any>[]>(() => [
        {
            label: "Order ID",
            headClassName: "text-center w-[120px]",
            cellClassName: "text-center font-medium text-primary min-w-[120px]",
            render: (audit: any) => audit.event_id ? formatOrderDisplayId(audit.event_id) : "—",
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
            render: (audit: any) => getFormattedAuditChanges(parseAuditDetails(audit.details)),
        },
        {
            label: "User",
            headClassName: "w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
            render: (audit: any) => `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim(),
        },
        {
            label: "Date & Time",
            headClassName: "text-white w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
            render: (audit: any) => formatAppDateTime(audit.created_on),
        },
    ], []);

    return (
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Restaurant Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            Restaurant & room service orders
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
                                        value={selectedPropertyId ?? ""}
                                        items={myProperties?.properties?.map((p: any) => ({ id: p.id, label: p.brand_name })) || []}
                                        onSelect={(val) => {
                                            setSelectedPropertyId(Number(val) || null);
                                            resetPage();
                                        }}
                                        itemName="label"
                                        placeholder="Select Property"
                                        extraClasses="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2"
                                    />
                                </div>
                            </div>
                        )}

                        {canAccessDeliveryFeatures && (
                            <Button
                                variant="heroOutline"
                                className="h-10"
                                onClick={() => setSheetOpen(true)}
                            >
                                Manage Delivery Partners
                            </Button>
                        )}

                        {canAccessDeliveryFeatures && (
                            <div className="flex gap-2">
                                <Button
                                    variant="hero"
                                    className="h-10"
                                    onClick={() => setCreateOpen(true)}
                                >
                                    + Delivery Partner
                                </Button>
                            </div>
                        )}

                        {canCreateOrders && (
                            <Button
                                variant="hero"
                                className="h-10"
                                onClick={() => navigate("/create-order")}
                            >
                                New Order
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border flex">
                    <button
                        onClick={() => setActiveTab("Orders")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            activeTab === "Orders"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab("History")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            activeTab === "History"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        History
                    </button>
                </div>

                {activeTab === "Orders" && (
                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchInput}
                                    onChange={setSearchInput}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        resetPage();
                                    }}
                                />

                                <GridToolbarSelect
                                    label="Payment"
                                    value={paymentFilter}
                                    onChange={setPaymentFilter}
                                    options={[
                                        { label: "All", value: "" },
                                        ...PAYMENT_STATUSES.map((s) => ({ label: s, value: s })),
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    options={[
                                        { label: "All", value: "" },
                                        ...ORDER_STATUSES.map((s) => ({ label: s, value: s })),
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Orders",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportOrdersSheet,
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
                            density="compact"
                            columns={orderColumns}
                            data={filteredOrders}
                            rowKey={(order) => order.id}
                            loading={isLoading || ordersFetching || isInitializing}
                            emptyText="No orders found"
                            actionClassName="text-center w-[60px]"
                            actions={(order) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            aria-label={`View and edit details for order ${formatOrderDisplayId(order.id)}`}
                                            onMouseEnter={() => prefetchOrder(order.id)}
                                            onFocus={() => prefetchOrder(order.id)}
                                            onClick={() => {
                                                setOpenOrderInEditMode(true);
                                                setSelectedOrderId(order.id);
                                                setItemsOpen(true);
                                            }}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View / Edit Details</TooltipContent>
                                </Tooltip>
                            )}
                            enablePagination={Boolean(data?.pagination)}
                            paginationProps={data?.pagination ? {
                                page,
                                totalPages: data.pagination.totalPages,
                                setPage,
                                disabled: ordersFetching,
                                totalRecords: data.pagination.totalItems ?? data.pagination.total ?? data.data?.length ?? 0,
                                limit,
                                onLimitChange: handleLimitChange,
                            } : undefined}
                        />
                    </div>
                </div>
                )}

                {activeTab === "History" && (
                    <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={historySearchInput}
                                        onChange={(val) => {
                                            setHistorySearchInput(val);
                                            if (!val.trim()) setHistorySearchQuery("");
                                        }}
                                        onSearch={() => {
                                            setHistorySearchQuery(historySearchInput.trim());
                                            setHistoryPage(1);
                                        }}
                                    />
                                    <GridToolbarSelect
                                        label="Action"
                                        value={historyActionFilter}
                                        onChange={(val) => {
                                            setHistoryActionFilter(val);
                                            setHistoryPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            { label: "Create", value: "CREATE" },
                                            { label: "Update", value: "UPDATE" },
                                            { label: "Delete", value: "DELETE" },
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
                                                onClick: () => {
                                                    setHistorySearchInput("");
                                                    setHistorySearchQuery("");
                                                    setHistoryActionFilter("");
                                                    setHistoryPage(1);
                                                },
                                            },
                                            {
                                                key: "refresh",
                                                label: "Refresh Data",
                                                icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: refreshHistoryTable,
                                                disabled: logsFetching,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>
                        <div className="px-2 pb-2">
                            <AppDataGrid
                                density="compact"
                                columns={historyColumns}
                                data={filteredAuditLogs}
                                rowKey={(log: any) => log.id}
                                loading={logsLoading || logsFetching || isInitializing}
                                emptyText="No audit logs found"
                                minWidth="860px"
                                enablePagination={Boolean(auditLogs?.pagination)}
                                paginationProps={auditLogs?.pagination ? {
                                    page: historyPage,
                                    totalPages: auditLogs.pagination.totalPages,
                                    setPage: setHistoryPage,
                                    disabled: logsFetching,
                                    totalRecords: auditLogs.pagination.totalItems ?? auditLogs.data?.length ?? 0,
                                    limit: historyLimit,
                                    onLimitChange: handleHistoryLimitChange,
                                } : undefined}
                            />
                        </div>
                    </div>
                )}
            </section>

            <OrderItemsModal
                orderId={selectedOrderId}
                open={itemsOpen}
                defaultEditMode={openOrderInEditMode}
                onClose={() => {
                    setItemsOpen(false);
                    setOpenOrderInEditMode(false);
                    setSelectedOrderId(null);
                }}
            />

            <DeliveryPartnerManager
                sheetOpen={sheetOpen}
                setSheetOpen={setSheetOpen}
                createOpen={createOpen}
                setCreateOpen={setCreateOpen}
                propertyId={selectedPropertyId}
                setSelectedPropertyId={setSelectedPropertyId}
            />
        </div>
    );
}
