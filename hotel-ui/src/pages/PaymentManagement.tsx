import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    useGetPaymentsByPropertyQuery,
    useGetPaymentsByIdQuery
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { Eye, FilterX, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { GridBadge } from "@/components/ui/grid-badge";
import { formatReadableLabel } from "@/utils/formatString";

type PropertyOption = {
    id: number;
    brand_name: string;
};

type PaymentRow = {
    id: number;
    booking_id: number;
    payment_date: string;
    paid_amount: string;
    payment_method: string;
    payment_status: string;
};

type PaymentDetails = {
    property_name?: string;
    payment_type?: string;
};

/* ---------------- Helpers ---------------- */
const formatDate = (date: string | number | Date | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

/* ---------------- Component ---------------- */
export default function PaymentsManagement() {
    const isLoggedIn = useAppSelector((s) => s.isLoggedIn.value);

    const [propertyId, setPropertyId] = useState<number | undefined>();
    const [bookingId] = useState("");
    const [method, setMethod] = useState("");
    const [status, setStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [propertyId, method, status, searchQuery],
    });

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);

    const { 
        myProperties, 
        isInitializing 
    } = useAutoPropertySelect(propertyId, setPropertyId);

    /* Payments */
    const {
        data: payments,
        isLoading: paymentsLoading,
        isFetching: paymentsFetching,
        refetch
    } = useGetPaymentsByPropertyQuery({
        page, limit, propertyId, bookingId, method, status
    }, {
        skip: !isLoggedIn || !propertyId || isNaN(Number(propertyId))
    });

    const { data: selectedPaymentData } = useGetPaymentsByIdQuery(
        { paymentId: selectedPayment?.id },
        { skip: !isLoggedIn || !selectedPayment?.id }
    ) as { data?: PaymentDetails };

    const resetFiltersHandler = () => {
        resetPage();
        setMethod("");
        setStatus("");
        setSearchQuery("");
    };

    const refreshTable = async () => {
        if (paymentsFetching) return;
        await refetch();
    };

    const filteredPayments = useMemo(() => {
        const baseRows = payments?.data || [];
        return filterGridRowsByQuery(baseRows, searchQuery, [
            (p: PaymentRow) => p.id,
            (p: PaymentRow) => p.booking_id,
            (p: PaymentRow) => p.payment_method,
            (p: PaymentRow) => p.payment_status,
            (p: PaymentRow) => p.paid_amount,
            (p: PaymentRow) => formatDate(p.payment_date),
        ]);
    }, [payments?.data, searchQuery]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Payments</h1>
                        <p className="text-sm text-muted-foreground">
                            View payment transactions for your property
                        </p>
                    </div>
                </div>

                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="flex flex-col border-b-0">

                            {/* Row 1 */}
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    placeholder="Search payments..."
                                />
                                <GridToolbarSelect
                                    label="Method"
                                    value={method}
                                    onChange={setMethod}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "CASH", value: "CASH" },
                                        { label: "CARD", value: "CARD" },
                                        { label: "UPI", value: "UPI" },
                                        { label: "NET_BANKING", value: "NET_BANKING" },
                                    ]}
                                />
                                <GridToolbarSelect
                                    label="Status"
                                    value={status}
                                    onChange={setStatus}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Pending", value: "PENDING" },
                                        { label: "Paid", value: "PAID" },
                                        { label: "Failed", value: "FAILED" },
                                        { label: "Refunded", value: "REFUNDED" },
                                    ]}
                                />
                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
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
                                            disabled: paymentsFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>

                            {/* Row 2 */}
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSelect
                                    label="Property"
                                    value={propertyId ?? ""}
                                    onChange={(value) => setPropertyId(value ? Number(value) : undefined)}
                                    options={[
                                        { label: "Select Property", value: "", disabled: true },
                                        ...(myProperties?.properties?.map((p: PropertyOption) => ({
                                            label: p.brand_name,
                                            value: p.id,
                                        })) ?? []),
                                    ]}
                                />
                                <GridToolbarSpacer />
                                <GridToolbarSpacer />
                                <GridToolbarSpacer type="actions" />
                            </GridToolbarRow>

                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={[
                                {
                                    label: "Payment ID",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium min-w-[90px]",
                                    render: (p: PaymentRow) => (
                                        <button
                                            type="button"
                                            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                            onClick={() => { setSelectedPayment(p); setDetailsOpen(true); }}
                                            aria-label={`View details for payment ${formatModuleDisplayId("payment", p.id)}`}
                                        >
                                            {formatModuleDisplayId("payment", p.id)}
                                        </button>
                                    ),
                                },
                                {
                                    label: "Booking ID",
                                    cellClassName: "text-muted-foreground font-medium whitespace-nowrap",
                                    render: (p: PaymentRow) => formatModuleDisplayId("booking", p.booking_id),
                                },
                                {
                                    label: "Date",
                                    cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
                                    render: (p: PaymentRow) => formatDate(p.payment_date),
                                },
                                {
                                    label: "Amount",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-semibold text-primary whitespace-nowrap",
                                    render: (p: PaymentRow) => `₹ ${p.paid_amount}`,
                                },
                                {
                                    label: "Method",
                                    cellClassName: "text-muted-foreground whitespace-nowrap",
                                    render: (p: PaymentRow) => formatReadableLabel(p.payment_method) || "—",
                                },
                                {
                                    label: "Status",
                                    headClassName: "text-center",
                                    cellClassName: "text-center whitespace-nowrap",
                                    render: (p: PaymentRow) => (
                                        <GridBadge status={p.payment_status} statusType="payment">
                                            {p.payment_status}
                                        </GridBadge>
                                    ),
                                },
                            ] as ColumnDef[]}
                            data={filteredPayments}
                            loading={paymentsLoading || isInitializing}
                            emptyText="No payments found"
                            minWidth="860px"
                            actionLabel=""
                            actionClassName="text-center w-[60px]"
                            actions={(p: PaymentRow) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            aria-label={`View details for payment ${formatModuleDisplayId("payment", p.id)}`}
                                            onClick={() => { setSelectedPayment(p); setDetailsOpen(true); }}
                                        >
                                            <Eye className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                            )}
                            enablePagination={!!payments?.pagination}
                            paginationProps={{
                                page,
                                totalPages: payments?.pagination?.totalPages ?? 1,
                                setPage,
                                disabled: paymentsLoading || paymentsFetching,
                                totalRecords: payments?.pagination?.totalItems ?? payments?.pagination?.total ?? payments?.data?.length ?? 0,
                                limit,
                                onLimitChange: handleLimitChange,
                            }}
                        />
                    </div>
                </div>

                {/* Payment Details Sheet */}
                <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <SheetContent side="right" className="sm:max-w-lg">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Payment Details</SheetTitle>
                        </SheetHeader>

                        {selectedPayment && (
                            <div className="space-y-6">
                                <div className="bg-muted/30 p-4 rounded-lg space-y-4 text-sm">
                                    <Detail label="Payment ID" value={formatModuleDisplayId("payment", selectedPayment.id)} />
                                    <Detail label="Booking ID" value={formatModuleDisplayId("booking", selectedPayment.booking_id)} />
                                    <Detail label="Property Name" value={selectedPaymentData?.property_name} />
                                    <Detail label="Payment Date" value={formatDate(selectedPayment.payment_date)} />
                                    <Detail label="Paid Amount" value={`₹ ${selectedPayment.paid_amount}`} />
                                    <Detail label="Method" value={selectedPayment.payment_method} />
                                    <Detail label="Transaction Type" value={selectedPaymentData?.payment_type} />
                                    <Detail label="Status" value={selectedPayment.payment_status} />
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

            </section>
        </div>
    );
}

/* ---------------- Small UI ---------------- */
function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className="font-semibold">{value ?? "—"}</span>
        </div>
    );
}
