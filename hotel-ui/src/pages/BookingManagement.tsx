import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import { useGridPagination } from "@/hooks/useGridPagination";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useNavigate } from "react-router-dom";
import GuestsEmbedded from "@/components/layout/GuestsEmbedded";
import VehiclesEmbedded from "@/components/layout/VehiclesEmbedded";
import PaymentsEmbedded from "@/components/layout/PaymentEmbedded";
import { formatToDDMMYY } from "@/utils/formatToDDMMYY";
import LaundryEmbedded from "@/components/layout/LaundryEmbedded";
import BookingLogsEmbedded from "@/components/layout/BookingLogsEmbedded";
import RestaurantOrdersEmbedded from "@/components/layout/RestaurantOrdersEmbedded";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download, Eye, FilterX, Pencil, Plus, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { formatAppDate, parseAppDate, toISODateOnly } from "@/utils/dateFormat";
import { formatReadableLabel } from "@/utils/formatString";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";

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
    parseAppDate(value);

const formatDate = (date: Date | null) => {
    return toISODateOnly(date);
};

const SUMMARY_TABS = [
    { id: "summary", label: "Summary" },
    { id: "rooms", label: "Rooms" },
    { id: "guests", label: "Guests" },
    { id: "vehicles", label: "Vehicles" },
    { id: "payments", label: "Payments" },
    { id: "laundry", label: "Laundry" },
    { id: "orders", label: "Restaurant Orders" },
    { id: "logs", label: "Logs" },
];

export default function BookingsManagement() {

    const todayISO = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return toISODateOnly(d);
    };

    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return toISODateOnly(d);
    };

    const [propertyId, setPropertyId] = useState<number | undefined>();
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [arrivalFrom, setArrivalFrom] = useState<string>("");
    const [arrivalTo, setArrivalTo] = useState<string>("");
    const [departureFrom, setDepartureFrom] = useState<string>("");
    const [departureTo, setDepartureTo] = useState<string>("");
    const [scope, setScope] = useState("");
    const [status, setStatus] = useState("");

    const { page, limit, setPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [propertyId, searchQuery, arrivalFrom, arrivalTo, departureFrom, departureTo, scope, status],
    });

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState("summary");

    const [cancelFee, setCancelFee] = useState("0");
    const [cancelComment, setCancelComment] = useState("");
    const [cancelOpen, setCancelOpen] = useState(false);
    const [bookingId, setBookingId] = useState("");

    const [updatedStatus, setUpdatedStatus] = useState<string>("");

    const memoizedArrivalFrom = useMemo(() => (arrivalFrom ? new Date(arrivalFrom) : null), [arrivalFrom]);
    const memoizedArrivalTo = useMemo(() => (arrivalTo ? new Date(arrivalTo) : null), [arrivalTo]);
    const memoizedDepartureFrom = useMemo(() => (departureFrom ? new Date(departureFrom) : null), [departureFrom]);
    const memoizedDepartureTo = useMemo(() => (departureTo ? new Date(departureTo) : null), [departureTo]);



    const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)

    const navigate = useNavigate()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const { myProperties, isMultiProperty, isOwner, isSuperAdmin, isInitializing } = useAutoPropertySelect(propertyId, setPropertyId);






















    const { data: bookingsData, isLoading: bookingsLoading, isFetching: bookingsFetching, isUninitialized: bookingsUninitialized, refetch: refetchBookings } = useGetBookingsQuery({
        propertyId,
        page,
        arrivalFrom,
        arrivalTo,
        departureFrom,
        departureTo,
        scope,
        status: status || undefined,
        search: searchQuery,
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
    const [getAllBookings, { isFetching: exportingBookings }] = useLazyExportBookingsQuery()

    async function handleManage(id: string, isEdit: boolean = true) {
        setBookingId(id)
        setEditMode(isEdit);
        setDetailsOpen(true);
        setActiveTab("summary");
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

    async function exportBookingsSheet() {
        if (exportingBookings) return;

        const totalRecords = bookingsData?.pagination?.totalItems ?? bookingsData?.pagination?.total ?? (bookingsData?.bookings?.length || 0);
        if (!totalRecords) {
            toast.info("No bookings to export");
            return;
        }

        const toastId = toast.loading("Preparing bookings export...");

        try {
            const res = await getAllBookings({
                propertyId,
                arrivalFrom,
                arrivalTo,
                departureFrom,
                departureTo,
                scope: scope || undefined,
                status: status || undefined,
                search: searchQuery.trim(),
            }).unwrap();

            const rows = Array.isArray(res?.bookings) ? res.bookings : Array.isArray(res) ? res : [];

            if (!rows.length) {
                toast.dismiss(toastId);
                toast.info("No bookings to export");
                return;
            }

            const formatted = rows.map((b: any) => ({
                "Booking": formatModuleDisplayId("booking", b.id),
                "Status": b.booking_status?.replace("_", " "),
                "Arrival": formatToDDMMYY(b.estimated_arrival),
                "Departure": formatToDDMMYY(b.estimated_departure),
                "Amount": `₹ ${b.final_amount}`,
                "Room number(s)": Array.isArray(b.room_numbers) ? b.room_numbers.join(", ") : (b.room_numbers?.toString() || "-"),
                "Pickup / Drop": `${b.pickup ? "Yes" : "No"} / ${b.drop ? "Yes" : "No"}`,
            }));

            exportToExcel(formatted, "bookings.xlsx");
            toast.dismiss(toastId);
            toast.success("Bookings exported successfully");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export bookings");
        }
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
        setArrivalFrom("");
        setArrivalTo("");
        setDepartureFrom("");
        setDepartureTo("");
        setPage(1);
    };

    const refreshTable = async () => {
        if (bookingsFetching) return;
        await refetchBookings();
    };

    const bookingRows = useMemo(() => {
        const rows = (!bookingsLoading && !bookingsUninitialized && bookingsData?.bookings)
            ? [...bookingsData.bookings]
            : [];
        
        // Sort by ID descending (Latest created on top)
        return rows.sort((a, b) => Number(b.id) - Number(a.id));
    }, [bookingsData?.bookings, bookingsLoading, bookingsUninitialized]);


    function BookingSummaryTab({ booking }: any) {
        const finalAmt = +(booking?.final_amount || 0);
        const restTotal = +(booking?.restaurant_total_amount || 0);
        const totalAmt = finalAmt + restTotal;

        const paidAmt = +(booking?.paid_amount || 0);
        const restPaid = +(booking?.restaurant_paid_amount || 0);
        const totalPaid = paidAmt + restPaid;

        const remaining = totalAmt - totalPaid;

        return (
            <div className="space-y-4">
                <PropertyViewSection title="Financial Overview" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <ViewField label="Total Amount" value={`₹ ${totalAmt}`} />
                    <ViewField label="Paid Amount" value={`₹ ${totalPaid}`} />
                    <ViewField label="Remaining Balance" value={`₹ ${remaining}`} />
                    <ViewField label="Discount" value={`₹ ${booking?.discount_amount || 0}`} />
                </PropertyViewSection>

                <PropertyViewSection title="Booking Information" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <ViewField label="Arrival Date" value={formatToDDMMYY(booking?.estimated_arrival)} />
                    <ViewField label="Departure Date" value={formatToDDMMYY(booking?.estimated_departure)} />
                    <ViewField label="Total Nights" value={booking?.booking_nights || 0} />
                    <ViewField label="Booking Type" value={formatReadableLabel(booking?.booking_type) || "—"} />
                    <ViewField label="Status" value={formatReadableLabel(booking?.booking_status) || "—"} />
                    <ViewField label="Booking Date" value={formatToDDMMYY(booking?.booking_date)} />
                </PropertyViewSection>

                <PropertyViewSection title="Guest Details" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <ViewField label="Total Guests" value={`${(booking?.adult || 0) + (booking?.child || 0)} Guests (${booking?.adult || 0}A, ${booking?.child || 0}C)`} />
                    <ViewField label="Rooms Booked" value={booking?.rooms?.length || 0} />
                </PropertyViewSection>

                <PropertyViewSection title="Additional Notes" className="grid grid-cols-1 gap-y-4">
                    <ViewField label="Comments" value={booking?.comments || "No comments"} />
                </PropertyViewSection>
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
                            className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-2 transition-all hover:border-primary"
                        >

                            <p className="text-xs text-muted-foreground">
                                {ui.floorName}
                            </p>

                            <div className="flex justify-center items-center">
                                <p className="text-2xl font-semibold">
                                    {ui.roomNo}
                                </p>
                            </div>

                            <p className="text-xs text-muted-foreground">
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
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage bookings and reservation details
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {(isSuperAdmin || isOwner) && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border tracking-wide">
                                    Property
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
                                    onChange={(val) => {
                                        setSearchInput(val);
                                        if (!val.trim()) {
                                            setSearchQuery("");
                                            setPage(1);
                                        }
                                    }}
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
                                        startDate={memoizedArrivalFrom}
                                        endDate={memoizedArrivalTo}
                                        startLabel="Arrival"
                                        endLabel="Arrival To"
                                        displayFormat="dd/MM/yy"
                                        startPlaceholder="DD/MM/YY"
                                        endPlaceholder="DD/MM/YY"
                                        onChange={([start, end]) => {
                                            setPage(1);
                                            setArrivalFrom(start ? formatDate(start) : "");
                                            setArrivalTo(end ? formatDate(end) : "");
                                        }}
                                    />

                                    <GridToolbarRangePicker
                                        startDate={memoizedDepartureFrom}
                                        endDate={memoizedDepartureTo}
                                        startLabel="Departure"
                                        endLabel="Departure To"
                                        displayFormat="dd/MM/yy"
                                        startPlaceholder="DD/MM/YY"
                                        endPlaceholder="DD/MM/YY"
                                        minDate={memoizedArrivalFrom || undefined}
                                        onChange={([start, end]) => {
                                            setPage(1);
                                            setDepartureFrom(start ? formatDate(start) : "");
                                            setDepartureTo(end ? formatDate(end) : "");
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
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium",
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
                                        <GridBadge status={b.booking_status} statusType="booking">
                                            {b.booking_status?.replace("_", " ")}
                                        </GridBadge>
                                    )
                                },
                                {
                                    label: "Arrival",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium text-xs whitespace-nowrap",
                                    render: (b: any) => formatToDDMMYY(b.estimated_arrival)
                                },
                                {
                                    label: "Departure",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium text-xs whitespace-nowrap",
                                    render: (b: any) => formatToDDMMYY(b.estimated_departure)
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
                            data={bookingRows}
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
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            onClick={() => handleManage(b.id, true)}
                                            aria-label={`Manage booking ${b.id}`}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Manage Booking</TooltipContent>
                                </Tooltip>
                            )}
                            enablePagination={!!bookingsData?.pagination}
                            paginationProps={{
                                page,
                                totalPages: bookingsData?.pagination?.totalPages ?? 1,
                                setPage,
                                disabled: bookingsLoading,
                                totalRecords: bookingsData?.pagination?.totalItems ?? bookingsData?.pagination?.total ?? bookingsData?.bookings?.length ?? 0,
                                limit,
                                onLimitChange: (value) => {
                                    handleLimitChange(value);
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

                    className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    Booking [#{formatModuleDisplayId("booking", bookingId)}]
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wider">
                                    {editMode ? "Manage Booking Details" : "Booking Related Details"}
                                </p>
                            </div>
                        </SheetHeader>

                        {/* Status Update */}
                        {editMode && (
                            <div className="space-y-6 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-primary/90 mb-3">
                                    Update Booking Status
                                </h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground tracking-wide">Booking Status *</Label>
                                    <NativeSelect
                                        className="h-11 border border-primary/20 bg-background rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full shadow-none"
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
                                </div>
                            </div>
                        )}


                    {/* Tabs */}
                    <div className="space-y-6">
                        {/* Tabs Header */}
                        <div className="border-b border-border flex items-center">
                            {SUMMARY_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-4 py-2 text-[11px] font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
                                        activeTab === tab.id
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="">
                            {activeTab === "summary" && (
                                <BookingSummaryTab booking={selectedBooking?.booking} />
                            )}
                            {activeTab === "rooms" && (
                                <BookingRoomsTab booking={selectedBooking?.booking} />
                            )}
                            {activeTab === "guests" && (
                                <BookingGuestsTab bookingId={selectedBooking?.booking.id} guestCount={selectedBooking?.adult} />
                            )}
                            {activeTab === "vehicles" && (
                                <BookingVehiclesTab bookingId={selectedBooking?.booking.id} rooms={selectedBooking?.booking.rooms} />
                            )}
                            {activeTab === "payments" && (
                                <BookingPaymentsTab bookingId={selectedBooking?.booking.id} propertyId={selectedBooking?.booking?.property_id} />
                            )}
                            {activeTab === "laundry" && (
                                <BookingLaundryTab
                                    bookingId={selectedBooking?.booking.id}
                                    propertyId={selectedBooking?.booking?.property_id}
                                    bookingStatus={selectedBooking?.booking?.booking_status}
                                />
                            )}
                            {activeTab === "orders" && (
                                <BookingRestaurantOrderTab
                                    bookingId={selectedBooking?.booking.id}
                                    propertyId={selectedBooking?.booking?.property_id}
                                    bookingStatus={selectedBooking?.booking?.booking_status}
                                />
                            )}
                            {activeTab === "logs" && (
                                <BookingLogsTab bookingId={selectedBooking?.booking.id} />
                            )}
                        </div>
                    </div>

                    </motion.div>
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
            <p className="font-medium">{value ?? "\u2014"}</p>
        </div>
    );
}

function Price({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span>\u20b9 {value}</span>
        </div>
    );
}

function formatDateDisplay(date?: string) {
    if (!date) return "\u2014";
    return formatAppDate(date);
}
