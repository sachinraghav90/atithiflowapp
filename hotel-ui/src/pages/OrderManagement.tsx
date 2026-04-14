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
    usePrefetch
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { OrderItemsModal } from "./OrderItemsModal";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DeliveryPartnerManager from "./DeliveryPartnerManager";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { useGridPagination } from "@/hooks/useGridPagination";

const ORDER_STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

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
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [paymentFilter, setPaymentFilter] = useState<string>("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [itemsOpen, setItemsOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

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

    const {
        myProperties,
        isMultiProperty
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const [getAllOrders, { reset, isFetching: exportingOrders }] = useLazyExportPropertyOrdersQuery();

    /* ============================
       ORDERS QUERY (PAGINATED)
    ============================ */
  const { data, isLoading, isFetching: ordersFetching, refetch } = useGetPropertyOrdersQuery(
    {
        propertyId: selectedPropertyId,
        page,
        limit,        // ← dynamic now
        status: statusFilter || undefined
    },
    { skip: !isLoggedIn || !selectedPropertyId }
);


    /* ============================
       GLOBAL SEARCH FILTER
    ============================ */
    const filteredOrders = useMemo(() => {
        if (!data?.data) return [];

        const query = searchQuery.toLowerCase();
        return data.data.filter((order) => {
            const matchesPayment = !paymentFilter || order.payment_status === paymentFilter;

            if (!matchesPayment) return false;

            const searchFields = [
                order.id.toString(),
                order.guest_name || "",
                order.guest_mobile || "",
                order.room_no || "",
                order.table_no || "",
                order.order_status || "",
                order.payment_status || "",
                new Date(order.order_date).toLocaleString(),
            ];

            return searchFields.some(field =>
                field.toLowerCase().includes(query)
            );
        });
    }, [data?.data, paymentFilter, searchQuery]);

    // ################# Export Orders to Sheet #################
    // Function to handle export
    const exportOrdersSheet = async () => {
        if (exportingOrders) return;

        const toastId = toast.loading("Preparing orders export...");

        try {
            const res = await getAllOrders({
                propertyId: selectedPropertyId,
                reset: reset,
            }).unwrap();

            const formatted = res.data.map(order => ({
                ORDER_ID: order.id,
                GUEST_NAME: order.guest_name,
                ROOM_TABLE: order.room_no || order.table_no,
                TIME: new Date(order.order_date).toLocaleString(),
                STATUS: order.order_status,
                PAYMENT: order.payment_status,
            }));

            exportToExcel(formatted, "Orders.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export orders");
        }
    };

    // ############### Reset Filters & Search ###############
    const resetFiltersHandler = () => {
        resetPage();
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        setPaymentFilter("");
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


    const orderColumns = useMemo<ColumnDef<Order>[]>(() => [
        {
            label: "",
            headClassName: "w-[60px] text-center",
            cellClassName: "text-center",
            render: (order) => (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                            aria-label={`View and edit details for order #${order.id}`}
                            onMouseEnter={() => prefetchOrder(order.id)}
                            onFocus={() => prefetchOrder(order.id)}
                            onClick={() => {
                                setSelectedOrderId(order.id);
                                setItemsOpen(true);
                            }}
                        >
                            <Pencil className="w-4 h-4 mx-auto" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>View / Edit Details</TooltipContent>
                </Tooltip>
            ),
        },
        {
            label: "Order",
            cellClassName: "text-center",
            render: (order) => `#${order.id}`,
        },
        {
            label: "Guest",
            render: (order) => order.guest_name || "—",
        },
        {
            label: "Room/Table",
            headClassName: "text-center",
            cellClassName: "text-center font-medium",
            render: (order) => order.room_no || order.table_no || "—",
        },
        {
            label: "Delivery Time",
            cellClassName: "text-xs",
            render: (order) => new Date(order.expected_delivery_time).toLocaleString(),
        },
        {
            label: "Status",
            render: (order) => (
                <span
                    className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-[3px]",
                        getStatusColor(order.order_status, "order")
                    )}
                >
                    {order.order_status}
                </span>
            ),
        },
        {
            label: "Payment",
            render: (order) => (
                <span
                    className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-[3px]",
                        getStatusColor(order.payment_status, "payment")
                    )}
                >
                    {order.payment_status}
                </span>
            ),
        },
        {
            label: "Order Time",
            cellClassName: "text-xs",
            render: (order) => new Date(order.order_date).toLocaleString(),
        },
    ], [prefetchOrder]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
            {/* LEFT — TITLE */}
            <div className="flex items-center justify-between w-full">

                {/* LEFT — TITLE */}
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold leading-tight">Orders</h1>
                    <p className="text-sm text-muted-foreground">
                        Restaurant & room service orders
                    </p>
                </div>

                {/* RIGHT — BUTTONS */}
                <div className="flex items-center gap-3 ml-auto">

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
                        <Button
                            variant="hero"
                            className="h-10"
                            onClick={() => setCreateOpen(true)}
                        >
                            + Delivery Partner
                        </Button>
                    )}

                    {canCreateOrders && (
                        <Button
                            variant="heroOutline"
                            className="h-10"
                            onClick={() => navigate("/create-order")}
                        >
                            New Order
                        </Button>
                    )}

                </div>

            </div>

            <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                <div className="w-full">
                    <GridToolbar>
                        <GridToolbarRow className={isMultiProperty ? "md:grid-cols-[repeat(4,1fr)_auto]" : "md:grid-cols-[repeat(3,1fr)_auto]"}>
                            {isMultiProperty && (
                                <GridToolbarSelect
                                    label="PROPERTY"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(value) => setSelectedPropertyId(Number(value) || null)}
                                    options={myProperties?.properties?.map((property: { id: number; brand_name: string }) => ({
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
                                    resetPage();
                                }}
                                placeholder="Search Orders..."
                            />

                            <GridToolbarSelect
                                label="PAYMENT"
                                value={paymentFilter}
                                onChange={setPaymentFilter}
                                options={[
                                    { label: "Any", value: "" },
                                    ...PAYMENT_STATUSES.map((s) => ({ label: s, value: s })),
                                ]}
                            />

                            <GridToolbarSelect
                                label="STATUS"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { label: "Any", value: "" },
                                    ...ORDER_STATUSES.map((s) => ({ label: s, value: s })),
                                ]}
                            />

                            <GridToolbarActions
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

                <AppDataGrid
                    columns={orderColumns}
                    data={filteredOrders}
                    rowKey={(order) => order.id}
                    loading={isLoading}
                    emptyText="No orders found"
                    enablePagination={Boolean(data?.pagination)}
                    paginationProps={data?.pagination ? {
                        page,
                        totalPages: data.pagination.totalPages,
                        setPage,
                        totalRecords: data.pagination.totalItems ?? data.pagination.total ?? data.data?.length ?? 0,
                        limit,
                        onLimitChange: handleLimitChange,
                    } : undefined}
                />
            </div>
            </section>
            <OrderItemsModal
                orderId={selectedOrderId}
                open={itemsOpen}
                onClose={() => {
                    setItemsOpen(false);
                    setSelectedOrderId(null);
                }}
            />

            <DeliveryPartnerManager
                sheetOpen={sheetOpen}
                setSheetOpen={setSheetOpen}
                createOpen={createOpen}
                setCreateOpen={setCreateOpen}
                propertyId={selectedPropertyId}
            />
        </div>
    );
}
