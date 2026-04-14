import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
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
import DatePicker from "react-datepicker";
import PaymentsEmbedded from "@/components/layout/PaymentEmbedded";
import { formatToDDMMYYYY } from "@/utils/formatToDDMMYYYY";
import LaundryEmbedded from "@/components/layout/LaundryEmbedded";
import BookingLogsEmbedded from "@/components/layout/BookingLogsEmbedded";
import RestaurantOrdersEmbedded from "@/components/layout/RestaurantOrdersEmbedded";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download, FilterX, Pencil, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
const REQUIRED_SCOPE_BY_STATUS: Record<string, "upcoming" | "past" | "all"> = {
    CONFIRMED: "upcoming",
    CHECKED_IN: "upcoming",

    CHECKED_OUT: "past",

    CANCELLED: "all",
    NO_SHOW: "all",
    // RESERVED: "all",
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
    const [limit, setLimit] = useState(10);
    const [propertyId, setPropertyId] = useState<number | undefined>();
    const [searchQuery, setSearchQuery] = useState("");

    const [fromDate, setFromDate] = useState<string>(todayISO());
    const [toDate, setToDate] = useState<string>(tomorrowISO());

    const [detailsOpen, setDetailsOpen] = useState(false);

    const [cancelFee, setCancelFee] = useState("0");
    const [cancelComment, setCancelComment] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [bookingId, setBookingId] = useState("");

    const [updatedStatus, setUpdatedStatus] = useState<string>("");

    const [scope, setScope] = useState("upcoming")
    const [status, setStatus] = useState("CONFIRMED")

    const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)

    const navigate = useNavigate()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const { myProperties, isMultiProperty, isOwner, isSuperAdmin } = useAutoPropertySelect(propertyId, setPropertyId);

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

    async function handleManage(id: string) {
        setBookingId(id)
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
        if (!fromDate || !toDate) {
            toast.error("Please select From Date & To Date to export bookings")
            return
        }

        const promise = getAllBookings({ propertyId, fromDate, toDate }).unwrap()
        toast.promise(
            promise.then((data) => {
                if (!data || data.length === 0) {
                    throw new Error("NO_DATA");
                }

            }),
            {
                pending: "Preparing bookings export...",
                success: "Bookings exported successfully",
                error: {
                    render({ data }) {
                        if (data instanceof Error && data?.message === "NO_DATA") {
                            return "No bookings found for the selected dates";
                        }
                        return "Failed to export bookings";
                    },
                },
            }
        );
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
        if (!exportedData) return

        const formatted = exportedData.map(b => ({
            Booking_ID: b.id,
            Booking_Status: b.booking_status,
            Booking_Date: new Date(b.booking_date).toLocaleDateString(),
            Estimated_Arrival: new Date(b.estimated_arrival).toLocaleDateString(),
            Estimated_Departure: new Date(b.estimated_departure).toLocaleDateString(),
            Booking_Nights: b.booking_nights,
            Final_Amount: b.final_amount,
            Room_Numbers: b.room_numbers.toString()
        }));

        exportToExcel(formatted, "bookings.xlsx")
        reset()
    }, [exportedData])

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
        setScope("upcoming");
        setStatus("CONFIRMED");
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

    // const today = () => {
    //     const d = new Date();
    //     d.setHours(0, 0, 0, 0);
    //     return d;
    // };

    // const to = (dateStr?: string) => {
    //     if (!dateStr) return null;
    //     const d = new Date(dateStr);
    //     d.setHours(0, 0, 0, 0);
    //     return d;
    // };

    // const bookingArrival = to(selectedBooking?.booking?.estimated_arrival);
    // const bookingDeparture = to(selectedBooking?.booking?.estimated_departure);

    // const canCheckIn =
    //     bookingArrival &&
    //     today() >= bookingArrival;

    // const canCheckOut =
    //     selectedBooking?.booking?.booking_status === "CHECKED_IN";

    // const canNoShow =
    //     bookingDeparture &&
    //     today() > bookingDeparture;

    // const canCancel =
    //     bookingDeparture &&
    //     today() < bookingDeparture;


    function BookingSummaryTab({ booking }: any) {
        return (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Stats */}
                    <div className="space-y-4">
                        <SummaryCard label="Final Amount" value={`₹ ${+(booking?.final_amount || 0) + +(booking?.restaurant_total_amount || 0)}`} />
                        <SummaryCard label="Paid Amount" value={`₹ ${+(booking?.paid_amount ?? 0) + +(booking?.restaurant_paid_amount || 0)}`} />
                        <SummaryCard
                            label="Remaining Amount"
                            value={`₹ ${(+(booking?.final_amount || 0) + +(booking?.restaurant_total_amount || 0)) - (+(booking?.paid_amount ?? 0) + +(booking?.restaurant_paid_amount || 0)) || 0}`}
                        // highlight
                        />
                    </div>

                    {/* Center */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard label="Estimated Arrival" value={formatToDDMMYYYY(booking?.estimated_arrival)} />
                        <InfoCard label="Estimated Departure" value={formatToDDMMYYYY(booking?.estimated_departure)} />
                        <InfoCard label="Nights" value={booking?.booking_nights} />
                        <InfoCard label="Booking Type" value={booking?.booking_type} />
                        <InfoCard label="Booking Status" value={booking?.booking_status} />
                        <InfoCard label="Discount" value={`₹ ${booking?.discount_amount}`} />
                    </div>

                    {/* Right Stats */}
                    <div className="space-y-4">
                        {/* <SummaryCard label="Laundry Amount" value="₹ 250" /> */}
                        <SummaryCard label="Total Guests" value={booking?.adult + booking?.child} />
                        <SummaryCard label="Rooms Booked" value={booking?.rooms.length} />
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

    const parseDate = (value?: string) =>
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;   // local timezone safe
    };



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
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            size="sm"
                            variant="heroOutline"
                            onClick={() => navigate("/reservation")}
                        >
                            + New Booking
                        </Button>
                    </div>
                </div>

                <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                    <GridToolbar className="mb-3">
                        <GridToolbarSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search Bookings..."
                        />

                        <GridToolbarSelect
                            label="SCOPE"
                            value={scope}
                            onChange={(value) => {
                                setScope(value);
                                setPage(1);
                            }}
                            className="min-w-[180px]"
                            options={[
                                { label: "Upcoming", value: "upcoming" },
                                { label: "Past", value: "past" },
                                { label: "All", value: "all" },
                            ]}
                        />

                        <GridToolbarSelect
                            label="STATUS"
                            value={status}
                            onChange={(value) => {
                                setStatus(value);
                                setPage(1);
                            }}
                            className="min-w-[180px]"
                            options={[
                                { label: "CONFIRMED", value: "CONFIRMED" },
                                { label: "CHECKED IN", value: "CHECKED_IN" },
                                { label: "CHECKED OUT", value: "CHECKED_OUT" },
                                { label: "CANCELLED", value: "CANCELLED" },
                                { label: "NO SHOW", value: "NO_SHOW" },
                            ]}
                        />

                        <GridToolbarActions
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
                    </GridToolbar>

                    <div className="flex flex-wrap items-center gap-3 w-full mb-2">
                        {(isSuperAdmin || isOwner) && (
                            <div className="flex items-center h-8 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[220px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border">
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

                        <div className="flex items-center h-8 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[200px]">
                            <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border">
                                FROM
                            </span>
                            <DatePicker
                                selected={parseDate(fromDate)}
                                placeholderText="dd-mm-yyyy"
                                onChange={(date) => {
                                    setPage(1);
                                    setFromDate(formatDate(date));
                                }}
                                dateFormat="dd-MM-yyyy"
                                customInput={
                                    <Input
                                        readOnly
                                        className="h-8 border-0 rounded-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                                    />
                                }
                            />
                        </div>

                        <div className="flex items-center h-8 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[200px]">
                            <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border">
                                TO
                            </span>
                            <DatePicker
                                selected={parseDate(toDate)}
                                placeholderText="dd-mm-yyyy"
                                onChange={(date) => {
                                    setPage(1);
                                    setToDate(formatDate(date));
                                }}
                                dateFormat="dd-MM-yyyy"
                                minDate={fromDate ? new Date(fromDate) : undefined}
                                disabled={!fromDate}
                                customInput={
                                    <Input
                                        readOnly
                                        className="h-8 border-0 rounded-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                                    />
                                }
                            />
                        </div>
                    </div>

                    <AppDataGrid
                    columns={[
                        {
                            label: "Status",
                            render: (b: any) => (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    getStatusColor(b.booking_status, "booking")
                                )}>
                                    {b.booking_status?.replace("_", " ")}
                                </span>
                            )
                        },
                        {
                            label: "Arrival",
                            cellClassName: "font-medium",
                            render: (b: any) => formatToDDMMYYYY(b.estimated_arrival)
                        },
                        {
                            label: "Departure",
                            cellClassName: "font-medium",
                            render: (b: any) => formatToDDMMYYYY(b.estimated_departure)
                        },
                        {
                            label: "Room number(s)",
                            render: (b: any) => (
                                <div className="max-w-[150px] truncate" title={b.room_numbers.toString()}>
                                    {b.room_numbers.slice(0, 4).toString()}{b.room_numbers.length > 4 ? "..." : ""}
                                </div>
                            )
                        },
                        {
                            label: "Pickup / Drop",
                            render: (b: any) => `${b.pickup ? "Yes" : "No"} / ${b.drop ? "Yes" : "No"}`
                        }
                    ] as ColumnDef<any>[]}
                    data={filteredBookings}
                    loading={bookingsLoading}
                    emptyText="No bookings found"
                    minWidth="800px"
                    actionLabel=""
                    actionClassName="text-center w-[72px]"
                    actions={(b: any) => (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                    onClick={() => handleManage(b.id)}
                                    aria-label={`View booking ${b.id}`}
                                >
                                    <Pencil className="w-4 h-4 mx-auto" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View / Edit Details</TooltipContent>
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
            </section>

            {/* Booking Details (Read-only) */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-5xl p-0 overflow-hidden"
                >
                    {/* Header */}
                    <div className="h-14 border-b border-border flex items-center justify-between px-6">
                        <div>
                            <h2 className="text-lg font-semibold">Booking (#{bookingId})</h2>
                            {/* <p className="text-xs text-muted-foreground">
                                Booking ID: {selectedBooking?.booking.id}
                            </p> */}
                        </div>

                        {/* Status Update */}
                        <div className="flex items-center gap-3 me-8">
                            <NativeSelect
                                className="h-9 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={updatedStatus || selectedBooking?.booking.booking_status}
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

function formatDate(date?: string) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
}

