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
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { Eye, FilterX, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";

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
    return `${y}-${m}-${d}`;
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

    const { myProperties } = useAutoPropertySelect(propertyId, setPropertyId);

    /* Payments */
    const { data: payments, isLoading: paymentsLoading, isFetching: paymentsFetching, refetch } = useGetPaymentsByPropertyQuery({
        page,
        limit,
        propertyId,
        bookingId,
        method,
        status
    }, {
        skip: !isLoggedIn || !propertyId || isNaN(Number(propertyId))
    });

    const { data: selectedPaymentData } = useGetPaymentsByIdQuery({ paymentId: selectedPayment?.id }, {
        skip: !isLoggedIn || !selectedPayment?.id
    }) as { data?: PaymentDetails }

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
            (payment: PaymentRow) => payment.id,
            (payment: PaymentRow) => payment.booking_id,
            (payment: PaymentRow) => payment.payment_method,
            (payment: PaymentRow) => payment.payment_status,
            (payment: PaymentRow) => payment.paid_amount,
            (payment: PaymentRow) => formatDate(payment.payment_date),
        ]);
    }, [payments?.data, searchQuery]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
        <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Payments</h1>
                    <p className="text-sm text-muted-foreground">
                        View payment transactions for your property
                    </p>
                </div>
            </div>

            <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                <GridToolbar className="mb-2">
                    <GridToolbarSelect
                        label="PROPERTY"
                        value={propertyId ?? ""}
                        onChange={(value) => setPropertyId(value ? Number(value) : undefined)}
                        className="min-w-[220px] flex-1"
                        options={[
                            { label: "Select Property", value: "", disabled: true },
                            ...(myProperties?.properties?.map((p: PropertyOption) => ({
                                label: p.brand_name,
                                value: p.id,
                            })) ?? []),
                        ]}
                    />

                    <GridToolbarSearch
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search payments..."
                    />

                    <GridToolbarSelect
                        label="METHOD"
                        value={method}
                        onChange={setMethod}
                        className="min-w-[220px] flex-1"
                        options={[
                            { label: "All", value: "" },
                            { label: "Cash", value: "Cash" },
                            { label: "Card", value: "Card" },
                            { label: "UPI", value: "UPI" },
                            { label: "Net Banking", value: "Net Banking" },
                        ]}
                    />

                    <GridToolbarSelect
                        label="STATUS"
                        value={status}
                        onChange={setStatus}
                        className="min-w-[220px] flex-1"
                        options={[
                            { label: "All", value: "" },
                            { label: "Pending", value: "PENDING" },
                            { label: "Paid", value: "PAID" },
                            { label: "Failed", value: "FAILED" },
                            { label: "Refunded", value: "REFUNDED" },
                        ]}
                    />

                    <GridToolbarActions
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
                </GridToolbar>

                <AppDataGrid
                columns={[
                    {
                        label: "Date",
                        render: (p: PaymentRow) => formatDate(p.payment_date)
                    },
                    {
                        label: "Amount",
                        cellClassName: "font-semibold text-primary",
                        render: (p: PaymentRow) => `₹ ${p.paid_amount}`
                    },
                    {
                        label: "Method",
                        render: (p: PaymentRow) => p.payment_method
                    },
                    {
                        label: "Status",
                        render: (p: PaymentRow) => (
                            <span
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-[3px]",
                                    getStatusColor(p.payment_status, "payment")
                                )}
                            >
                                {p.payment_status}
                            </span>
                        )
                    }
                ] as ColumnDef[]}
                data={filteredPayments}
                loading={paymentsLoading}
                emptyText="No payments found"
                minWidth="800px"
                actionLabel=""
                actionClassName="text-center w-[72px]"
                actions={(p: PaymentRow) => (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                aria-label={`View details for payment ${p.id}`}
                                onClick={() => {
                                    setSelectedPayment(p);
                                    setDetailsOpen(true);
                                }}
                            >
                                <Eye className="w-4 h-4 mx-auto" />
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
                    onLimitChange: handleLimitChange
                }}
                />
            </div>

            {/* Payment Details */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent side="right" className="sm:max-w-lg">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Payment Details</SheetTitle>
                    </SheetHeader>

                    {selectedPayment && (
                        <div className="space-y-6">
                            <div className="bg-muted/30 p-4 rounded-lg space-y-4 text-sm">
                                <Detail label="Booking ID" value={`#${selectedPayment.booking_id}`} />
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
