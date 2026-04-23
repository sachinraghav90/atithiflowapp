import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarRangePicker, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

import { toast } from "react-toastify";
import {
    useCancelBookingMutation,
    useGetAllRoomsMetaQuery,
    useGetBookingByIdQuery,
    useGetBookingsQuery,
    useGetMyPropertiesQuery,
    useLazyExportBookingsQuery,
    useUpdateBookingMutation,
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useNavigate } from "react-router-dom";
import GuestsEmbedded from "@/components/layout/GuestsEmbedded";
import VehiclesEmbedded from "@/components/layout/VehiclesEmbedded";
import PaymentsEmbedded from "@/components/layout/PaymentEmbedded";
import { formatToDDMMYYYY } from "@/utils/formatToDDMMYYYY";
import LaundryEmbedded from "@/components/layout/LaundryEmbedded";
import BookingLogsEmbedded from "@/components/layout/BookingLogsEmbedded";
import RestaurantOrdersEmbedded from "@/components/layout/RestaurantOrdersEmbedded";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download, Eye, FilterX, Pencil, Plus, RefreshCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

const REQUIRED_SCOPE_BY_STATUS: Record<string, "upcoming" | "past" | "all"> = {
    CONFIRMED: "upcoming",
    CHECKED_IN: "upcoming",
    CHECKED_OUT: "past",
    CANCELLED: "all",
    NO_SHOW: "all",
};

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


const parseDate = (value?: string) =>
    value ? new Date(value) : null;

const formatDate = (date: Date | null) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;   // local timezone safe
};

export default function BookingsManagement() {

    const todayISO = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    };

    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    };

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(5);
    const [propertyId, setPropertyId] = useState<number | undefined>();
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [cancelFee, setCancelFee] = useState("0");
    const [cancelComment, setCancelComment] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [bookingId, setBookingId] = useState("");

    const [updatedStatus, setUpdatedStatus] = useState<string>("");

    const [scope, setScope] = useState("")
    const [status, setStatus] = useState("")

    const memoizedFromDate = useMemo(() => parseDate(fromDate), [fromDate]);
    const memoizedToDate = useMemo(() => parseDate(toDate), [toDate]);

    const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)

    const navigate = useNavigate()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const { myProperties, isMultiProperty, isOwner, isSuperAdmin, isInitializing } = useAutoPropertySelect(propertyId, setPropertyId);

    const { data: bookings, isLoading: bookingsLoading, isFetching: bookingsFetching, isUninitialized: bookingsUninitialized, refetch: refetchBookings } = useGetBookingsQuery({
        propertyId,
        page,
        fromDate,
        toDate,
        scope,
        status,
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

    const [cancelBooking] = useCancelBookingMutation()
    const [updateBooking, { error }] = useUpdateBookingMutation()
    const [updateBookingStatus] = useUpdateBookingMutation()
    const [getAllBookings, { data: exportedData, reset, isFetching: gettingAllBookings }] = useLazyExportBookingsQuery()

    async function handleManage(id: string, isEdit: boolean = true) {
        setBookingId(id)
        setEditMode(isEdit);
        setDetailsOpen(true);
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

    function exportBookingsSheet() {
        if (!filteredBookings || filteredBookings.length === 0) {
            toast.info("No bookings found to export");
            return;
        }

        const formatted = filteredBookings.map(b => ({
            "Booking": formatModuleDisplayId("booking", b.id),
            "Status": b.booking_status?.replace("_", " "),
            "Arrival": formatToDDMMYYYY(b.estimated_arrival),
            "Departure": formatToDDMMYYYY(b.estimated_departure),
            "Amount": `₹ ${b.final_amount}`,
            "Room number(s)": Array.isArray(b.room_numbers) ? b.room_numbers.join(", ") : (b.room_numbers?.toString() || "-"),
            "Pickup / Drop": `${b.pickup ? "Yes" : "No"} / ${b.drop ? "Yes" : "No"}`,
        }));

        exportToExcel(formatted, "bookings.xlsx");
        toast.success("Bookings exported successfully");
    }

    async function handleUpdateBooking() {
        if (!selectedBooking) return;

        const promise = updateBooking({ booking_id: selectedBooking?.booking?.id, status: updatedStatus }).unwrap();

        await toast.promise(promise, {
            pending: "Updating booking...",
            success: "Booking updated successfully",
            error: {
                render({ data }: { data: any }) {
                    return data?.data?.message || data?.message || "Failed to update booking";
                }
            }
        });

        setConfirmStatusOpen(false);
        setDetailsOpen(false);

    }


    useEffect(() => {
        const requiredScope = REQUIRED_SCOPE_BY_STATUS[status];

        if (requiredScope && scope !== requiredScope) {
            setScope(requiredScope);
            setPage(1);
        }
    }, [status]);

    useEffect(() => {
        if (scope === "upcoming" && !["CONFIRMED", "CHECKED_IN"].includes(status)) {
            setStatus("CONFIRMED");
            setPage(1);
        }

        if (scope === "past" && status !== "CHECKED_OUT") {
            setStatus("CHECKED_OUT");
            setPage(1);
        }

    }, [scope]);

    const resetFiltersHandler = () => {
        if (myProperties?.properties?.[0]?.id) {
            setPropertyId(Number(myProperties.properties[0].id));
        }
        setSearchQuery("");
        setScope("");
        setStatus("");
        setFromDate("");
        setToDate("");
        setPage(1);
    };

    const refreshTable = async () => {
        if (bookingsFetching) return;
        await refetchBookings();
    };

    const filteredBookings = useMemo(() => {
        const rows = (!bookingsLoading && !bookingsUninitialized && bookings?.bookings) ? bookings.bookings : [];
        return filterGridRowsByQuery(rows, searchQuery, [
            (booking: any) => booking.id?.toString?.() ?? "",
            (booking: any) => booking.booking_status ?? "",
            (booking: any) => booking.estimated_arrival ? formatToDDMMYYYY(booking.estimated_arrival) : "",
            (booking: any) => booking.estimated_departure ? formatToDDMMYYYY(booking.estimated_departure) : "",
            (booking: any) => Array.isArray(booking.room_numbers) ? booking.room_numbers.join(", ") : booking.room_numbers?.toString?.() ?? "",
            (booking: any) => `${booking.pickup ? "Yes" : "No"} / ${booking.drop ? "Yes" : "No"}`,
        ]);
    }, [bookings?.bookings, bookingsLoading, bookingsUninitialized, searchQuery]);


    function BookingSummaryTab({ booking }: any) {
        const finalAmt = +(booking?.final_amount || 0);
        const restTotal = +(booking?.restaurant_total_amount || 0);
        const totalAmt = finalAmt + restTotal;

        const paidAmt = +(booking?.paid_amount || 0);
        const restPaid = +(booking?.restaurant_paid_amount || 0);
        const totalPaid = paidAmt + restPaid;

        const remaining = totalAmt - totalPaid;

        return (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Stats */}
                    <div className="space-y-4">
                        <SummaryCard label="Final Amount" value={`₹ ${totalAmt}`} />
                        <SummaryCard label="Paid Amount" value={`₹ ${totalPaid}`} />
                        <SummaryCard
                            label="Remaining Amount"
                            value={`₹ ${remaining}`}
                        // highlight
                        />
                    </div>

                    {/* Center */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard label="Estimated Arrival" value={formatToDDMMYYYY(booking?.estimated_arrival)} />
                        <InfoCard label="Estimated Departure" value={formatToDDMMYYYY(booking?.estimated_departure)} />
                        <InfoCard label="Nights" value={booking?.booking_nights || 0} />
                        <InfoCard label="Booking Type" value={booking?.booking_type || "-"} />
                        <InfoCard label="Booking Status" value={booking?.booking_status || "-"} />
                        <InfoCard label="Discount" value={`₹ ${booking?.discount_amount || 0}`} />
                    </div>

                    {/* Right Stats */}
                    <div className="space-y-4">
                        <SummaryCard label="Total Guests" value={(booking?.adult || 0) + (booking?.child || 0)} />
                        <SummaryCard label="Rooms Booked" value={booking?.rooms?.length || 0} />
                        <SummaryCard label="Booking Date" value={formatToDDMMYYYY(booking?.booking_date)} />
                    </div>
                </div>
                <div className="mt-4">
                    <InfoCard label="Comments" value={(booking?.comments || "No comments")} />
                </div>
            </>
        );
    }

    function SummaryCard({ label, value, highlight }: any) {
        return (
            <div
                className={`rounded-[3px] p-4 text-white ${highlight ? "bg-destructive" : "bg-primary"
                    }`}
            >
                <p className="text-sm opacity-90">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
            </div>
        );
    }

    function InfoCard({ label, value }: any) {
        return (
            <div className="rounded-[3px] border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium mt-1">{value}</p>
            </div>
        );
    }

    function getRoomDisplayData(roomNo: any) {

        const room = allRoomsMeta.find(r => r.room_no === roomNo)

        return {
            roomNo: room.room_no ?? "-",

            floorName: room.floor_number
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

        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">

                {booking.rooms.map((room: any) => {

                    const ui = getRoomDisplayData(room.room_no);

                    return (

                        <div
                            key={room.room_id}
                            className="rounded-[3px] border p-3 space-y-2 bg-card border-border transition"
                        >

                            <p className="text-xs text-muted-foreground">
                                {ui.floorName}
                            </p>

                            <div className="flex justify-center items-center">
                                <p className="text-2xl font-semibold">
                                    {ui.roomNo}
                                </p>
                            </div>

                            <p className="text-xs text-muted-foreground ">
                                {ui.bedType} | {ui.category}
                            </p>

                        </div>
                    );
                })}


            </div>
        );
    }
    function BookingGuestsTab({ bookingId, guestCount }: { bookingId: string, guestCount: number }) {
        return <GuestsEmbedded bookingId={bookingId} guestCount={guestCount} />;
    }

    function BookingVehiclesTab({ bookingId, rooms }: any) {
        return <VehiclesEmbedded bookingId={bookingId} rooms={rooms} />;
    }

    function BookingPaymentsTab({ bookingId, propertyId }: any) {
        return <PaymentsEmbedded bookingId={bookingId} propertyId={propertyId} />;
    }

    function BookingLaundryTab({ bookingId, propertyId, bookingStatus }: any) {
        return (
            <LaundryEmbedded
                bookingId={bookingId}
                propertyId={propertyId}
                bookingStatus={bookingStatus}
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
        return <BookingLogsEmbedded bookingId={bookingId} />;
    }

    function ComingSoon({ label }: { label: string }) {
        return (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
                {label} module coming soon
            </div>
        );
    }




    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between gap-4">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-2xl font-bold">Bookings</h1>
                        <p className="text-sm text-muted-foreground">
                            Add, View and Manage bookings
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {(isSuperAdmin || isOwner) && (
                            <div className="flex items-center h-9 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    PROPERTY
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={propertyId ?? ""}
                                    onChange={(e) => {
                                        setPropertyId(e.target.value ? Number(e.target.value) : undefined);
                                        setPage(1);
                                    }}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {myProperties?.properties?.map((p: any) => (
                                        <option key={p.id} value={p.id}>
                                            {p.brand_name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>
                        )}

                        <Button
                            variant="hero"
                            className="h-10 px-4 flex items-center gap-2"
                            onClick={() => navigate("/reservation")}
                        >
                            <Plus className="w-4 h-4" /> New Booking
                        </Button>
                    </div>
                </div>

                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="flex flex-col border-b-0">
                            {/* Row 1 */}
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
                                    className="md:col-span-2"
                                    startDate={memoizedFromDate}
                                    endDate={memoizedToDate}
                                    startLabel="From"
                                    endLabel="To"
                                    onChange={([start, end]) => {
                                        setPage(1);
                                        setFromDate(start ? formatDate(start) : "");
                                        setToDate(end ? formatDate(end) : "");
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
                                    cellClassName: "font-medium",
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
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-[3px] text-xs font-semibold uppercase tracking-wider",
                                            getStatusColor(b.booking_status, "booking")
                                        )}>
                                            {b.booking_status?.replace("_", " ")}
                                        </span>
                                    )
                                },
                                {
                                    label: "Arrival",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium text-xs whitespace-nowrap",
                                    render: (b: any) => formatToDDMMYYYY(b.estimated_arrival)
                                },
                                {
                                    label: "Departure",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium text-xs whitespace-nowrap",
                                    render: (b: any) => formatToDDMMYYYY(b.estimated_departure)
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
                            data={filteredBookings}
                            loading={bookingsLoading || isInitializing}
                            emptyText="No bookings found"
                            minWidth="800px"
                            actionLabel=""
                            actionClassName="text-center w-[60px]"
                            actions={(b: any) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            onClick={() => handleManage(b.id, true)}
                                            aria-label={`Manage booking ${b.id}`}
                                        >
                                            <Pencil className="w-4 h-4 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Manage Booking</TooltipContent>
                                </Tooltip>
                            )}
                            enablePagination={!!bookings?.pagination}
                            paginationProps={{
                                page,
                                totalPages: bookings?.pagination?.totalPages ?? 1,
                                setPage: (p: any) => setPage(p),
                                disabled: bookingsLoading,
                                totalRecords: bookings?.pagination?.totalItems ?? bookings?.pagination?.total ?? bookings?.bookings?.length ?? 0,
                                limit,
                                onLimitChange: (value) => {
                                    setLimit(value);
                                    setPage(1);
                                }
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* Booking Details (Read-only) */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-5xl p-0 overflow-hidden"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>
                            {editMode ? "Manage Booking" : "Booking Summary"} ({formatModuleDisplayId("booking", bookingId)})
                        </SheetTitle>
                    </SheetHeader>

                    {/* Header */}
                    <div className="h-14 border-b border-border flex items-center justify-between px-6">
                        <div>
                            <h2 className="text-lg font-semibold">
                                {editMode ? "Manage Booking" : "Booking Summary"} ({formatModuleDisplayId("booking", bookingId)})
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDetailsOpen(false)}
                                className="h-9 w-9 rounded-full hover:bg-slate-100"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* Status Update */}
                        {editMode && (
                            <div className="flex items-center gap-3 me-8">
                                <NativeSelect
                                    className="h-9 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={updatedStatus || selectedBooking?.booking.booking_status || ""}
                                    onChange={(e) => setUpdatedStatus(e.target.value)}
                                    disabled={selectedBooking?.booking.booking_status === "CANCELLED"}
                                >
                                    <option value={""} disabled>Select status</option>
                                    {BOOKING_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s.replace("_", " ")}
                                        </option>
                                    ))}
                                </NativeSelect>

                                <Button
                                    size="sm"
                                    variant="hero"
                                    disabled={
                                        !updatedStatus ||
                                        updatedStatus === selectedBooking?.booking.booking_status
                                    }
                                    onClick={() => setConfirmStatusOpen(true)}
                                >
                                    Update
                                </Button>
                            </div>
                        )}
                    </div>


                    {/* Tabs */}
                    <Tabs defaultValue="summary" className="h-full">
                        {/* Tabs Header */}
                        <div className="border-b border-border px-6">
                            <TabsList className="h-12 bg-transparent p-0 gap-6">
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="rooms">Rooms</TabsTrigger>
                                <TabsTrigger value="guests">Guests</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                                <TabsTrigger value="payments">Payments</TabsTrigger>
                                <TabsTrigger value="laundry">Laundry</TabsTrigger>
                                <TabsTrigger value="orders">Restaurant Orders</TabsTrigger>
                                <TabsTrigger value="logs">Logs</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Scrollable Content */}
                        <div className="h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide px-6 py-6">
                            <TabsContent value="summary">
                                <BookingSummaryTab booking={selectedBooking?.booking} />
                            </TabsContent>

                            <TabsContent value="rooms">
                                <BookingRoomsTab booking={selectedBooking?.booking} />
                            </TabsContent>

                            <TabsContent value="guests">
                                <BookingGuestsTab bookingId={selectedBooking?.booking.id} guestCount={selectedBooking?.adult} />
                            </TabsContent>

                            <TabsContent value="vehicles">
                                <BookingVehiclesTab bookingId={selectedBooking?.booking.id} rooms={selectedBooking?.booking.rooms} />
                            </TabsContent>

                            <TabsContent value="payments">
                                <BookingPaymentsTab bookingId={selectedBooking?.booking.id} propertyId={selectedBooking?.booking?.property_id} />
                            </TabsContent>

                            <TabsContent value="laundry">
                                <BookingLaundryTab
                                    bookingId={selectedBooking?.booking.id}
                                    propertyId={selectedBooking?.booking?.property_id}
                                    bookingStatus={selectedBooking?.booking?.booking_status}
                                />
                            </TabsContent>

                            <TabsContent value="orders">
                                <BookingRestaurantOrderTab
                                    bookingId={selectedBooking?.booking.id}
                                    propertyId={selectedBooking?.booking?.property_id}
                                    bookingStatus={selectedBooking?.booking?.booking_status}
                                />
                            </TabsContent>

                            <TabsContent value="logs">
                                <BookingLogsTab bookingId={selectedBooking?.booking.id} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </SheetContent>
            </Sheet>

            <Dialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Status Change</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-sm">
                        <p>
                            You are about to change booking status from{" "}
                            <strong>{selectedBooking?.booking.booking_status}</strong> to{" "}
                            <strong>{updatedStatus}</strong>.
                        </p>

                        <p className="text-muted-foreground">
                            This action may affect availability, billing, and reports.
                        </p>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="heroOutline"
                                onClick={() => setConfirmStatusOpen(false)}
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
                </DialogContent>
            </Dialog>

        </div>
    );
}

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div className="space-y-1">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? "—"}</p>
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
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
}
