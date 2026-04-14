import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
    useGetPropertyEnquiriesQuery,
    useLazyExportPropertyEnquiriesQuery,
    useUpdateEnquiryMutation,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarCheck2, Download, FilterX, Pencil, RefreshCcw } from "lucide-react";
import { exportToExcel } from "@/utils/exportToExcel";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";

type EnquiryStatus =
    | "open"
    | "follow_up"
    | "reserved"
    | "booked"
    | "closed"
    | "cancelled";

type Enquiry = {
    id: string;
    property_id: string;
    booking_id: string | null;

    guest_name: string;
    mobile: string;
    email: string;

    source: string;
    enquiry_type: string;
    status: EnquiryStatus;

    agent_name?: string | null;
    agent_type?: string | null;

    contact_method?: string | null;
    city?: string | null;
    nationality?: string | null;
    plan?: string | null;

    total_members?: string | null;
    senior_citizens?: string | null;
    child?: string | null;
    specially_abled?: string | null;

    room_details?: {
        room_type: string;
        no_of_rooms: number;
    }[];

    room_type?: string | null;
    no_of_rooms?: number | null;

    check_in?: string | null;
    check_out?: string | null;

    booked_by?: string | null;
    comment?: string | null;
    follow_up_date?: string | null;

    quote_amount?: string | null;
    offer_amount?: string | null;

    is_reserved: boolean;
    is_active: boolean;

    created_by?: string;
    created_on?: string;
    updated_by?: string | null;
    updated_on?: string | null;
};

export default function EnquiriesManagement() {
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Enquiry | null>(null);

    const [status, setStatus] = useState<EnquiryStatus>("open");
    const [followUpDate, setFollowUpDate] = useState("");
    const [comment, setComment] = useState("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "">("");

    const navigate = useNavigate()

    const openManage = (enquiry: Enquiry) => {
        setSelected(enquiry);
        setStatus(enquiry.status);
        setFollowUpDate(enquiry.follow_up_date?.slice(0, 16) ?? "");
        setComment(enquiry.comment ?? "");
        setOpen(true);
    };
    const { myProperties, isMultiProperty } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: enquiries, isLoading: enquiryLoading, refetch } = useGetPropertyEnquiriesQuery({ propertyId: selectedPropertyId, page, limit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [getAllEnquiries, { isFetching: exportingEnquiries }] = useLazyExportPropertyEnquiriesQuery()
    const [updateEnquiry] = useUpdateEnquiryMutation()

    const exportEnquiriesSheet = async () => {
        if (exportingEnquiries) return;

        const toastId = toast.loading("Preparing enquiries export...");

        try {
            const res = await getAllEnquiries({
                propertyId: selectedPropertyId,
            }).unwrap();

            const formatted = res.data.map((enquiry: any) => ({
                ID: enquiry.id,
                GUEST_NAME: enquiry.guest_name,
                MOBILE: enquiry.mobile,
                EMAIL: enquiry.email,
                STATUS: enquiry.status,
                CITY: enquiry.city,
                OFFER_AMOUNT: enquiry.offer_amount,
                QUOTE_AMOUNT: enquiry.quote_amount,
                CHECK_IN: enquiry.check_in,
                CHECK_OUT: enquiry.check_out,
                CREATED_ON: enquiry.created_on
            }));

            exportToExcel(formatted, "Enquiries.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export enquiries");
        }
    };

    const handleUpdate = async () => {
        if (!selected) return;

        const payload = {
            status,
            ...(followUpDate && { follow_up_date: followUpDate }),
            ...(comment && { comment }),
        };

        const promise = updateEnquiry({ id: selected.id, payload }).unwrap()

        await toast.promise(promise, {
            error: "Error updating enquiry",
            pending: "Updating please wait",
            success: "Enquiry updated successfully"
        })

        setOpen(false);
    };

    function handleBook(enquiry: Enquiry) {
        navigate("/reservation", {
            state: {
                fromEnquiry: true,
                enquiryId: enquiry.id,
                enquiry,
            },
        });
    }

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)
    const { permission: bookingPermission } = usePermission("/bookings", { autoRedirect: false })

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        setPage(1);
    };

    const refreshTable = async () => {
        await refetch();
    };

    const filteredEnquiries = useMemo(() => {
        const baseRows = enquiries?.data ?? [];
        const statusFiltered = statusFilter
            ? baseRows.filter((enquiry) => enquiry.status === statusFilter)
            : baseRows;

        return filterGridRowsByQuery(statusFiltered, searchQuery, [
            (enquiry) => enquiry.id,
            (enquiry) => enquiry.guest_name,
            (enquiry) => enquiry.mobile,
            (enquiry) => enquiry.email,
            (enquiry) => enquiry.city,
            (enquiry) => enquiry.status,
            (enquiry) => enquiry.offer_amount,
            (enquiry) => enquiry.quote_amount,
            (enquiry) => enquiry.check_in ? new Date(enquiry.check_in).toLocaleDateString() : "",
            (enquiry) => enquiry.check_out ? new Date(enquiry.check_out).toLocaleDateString() : "",
        ]);
    }, [enquiries?.data, searchQuery, statusFilter]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Enquiries</h1>
                        <p className="text-sm text-muted-foreground">
                            Track and manage customer enquiries
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isMultiProperty && (
                            <div className="flex items-center h-9 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => {
                                        setSelectedPropertyId(Number(e.target.value) || null);
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

                        {permission?.can_create && (
                            <Button
                                variant="heroOutline"
                                className="h-9"
                                onClick={() => navigate("/create-enquiry")}
                            >
                                + New Enquiry
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
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
                                    label="STATUS"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value as EnquiryStatus | "");
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "Any", value: "" },
                                        { label: "Open", value: "open" },
                                        { label: "Follow Up", value: "follow_up" },
                                        { label: "Reserved", value: "reserved" },
                                        { label: "Booked", value: "booked" },
                                        { label: "Closed", value: "closed" },
                                        { label: "Cancelled", value: "cancelled" },
                                    ]}
                                />

                                <div className="w-full" /> {/* Empty col 3 */}

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Enquiries",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportEnquiriesSheet,
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
                                    label: "Name",
                                    key: "guest_name",
                                    cellClassName: "font-medium",
                                },
                                {
                                    label: "Contact",
                                    key: "mobile",
                                    cellClassName: "font-semibold",
                                },
                                {
                                    label: "Offer Amount",
                                    key: "offer_amount",
                                    cellClassName: "font-medium",
                                },
                                {
                                    label: "Quote Amount",
                                    key: "quote_amount",
                                    cellClassName: "font-medium",
                                },
                                {
                                    label: "CheckIn",
                                    cellClassName: "font-medium",
                                    render: (e) => (e as Enquiry).check_in ? new Date((e as Enquiry).check_in as string).toLocaleDateString() : "-",
                                },
                                {
                                    label: "CheckOut",
                                    cellClassName: "font-medium",
                                    render: (e) => (e as Enquiry).check_out ? new Date((e as Enquiry).check_out as string).toLocaleDateString() : "-",
                                },
                                {
                                    label: "FollowUp",
                                    cellClassName: "font-medium",
                                    render: (e) => (e as Enquiry).follow_up_date ? new Date((e as Enquiry).follow_up_date as string).toLocaleDateString() : "",
                                },
                            ] as ColumnDef<Enquiry>[]}
                            data={filteredEnquiries}
                            loading={enquiryLoading}
                            actionClassName="text-center w-[90px]"
                            className="mt-0"
                            actions={(e) => {
                                const enquiry = e as Enquiry;
                                return (
                                    <div className="flex justify-center gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    onClick={() => openManage(enquiry)}
                                                    aria-label={`Manage enquiry ${enquiry.id}`}
                                                >
                                                    <Pencil className="w-4 h-4 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Manage Enquiry</TooltipContent>
                                        </Tooltip>

                                        {bookingPermission?.can_create && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                        disabled={enquiry.is_reserved}
                                                        onClick={() => handleBook(enquiry)}
                                                        aria-label={`Create booking from enquiry ${enquiry.id}`}
                                                    >
                                                        <CalendarCheck2 className="w-4 h-4 mx-auto" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Book Enquiry</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                );
                            }}
                            enablePagination={!!enquiries?.pagination}
                            paginationProps={{
                                page,
                                totalPages: enquiries?.pagination?.totalPages ?? 1,
                                setPage,
                                disabled: !enquiries,
                                totalRecords: enquiries?.pagination?.totalItems ?? enquiries?.pagination?.total ?? enquiries?.data?.length ?? 0,
                                limit,
                                onLimitChange: (value) => {
                                    setLimit(value);
                                    setPage(1);
                                },
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* Manage Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Manage Enquiry</DialogTitle>
                    </DialogHeader>

                    {selected && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">

                            {/* LEFT — READ ONLY DETAILS */}
                            <div className="space-y-5">
                                <div>
                                    <Label>Guest Info</Label>
                                    <p className="font-medium text-base">{selected.guest_name}</p>
                                    <p className="text-muted-foreground">
                                        {selected.mobile} • {selected.email || "No email"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {selected.city} • {selected.nationality?.toUpperCase()}
                                    </p>
                                </div>

                                <div>
                                    <Label>Stay Details</Label>
                                    <p className="font-medium">
                                        {selected.check_in
                                            ? new Date(selected.check_in).toLocaleDateString()
                                            : "—"}
                                        {" → "}
                                        {selected.check_out
                                            ? new Date(selected.check_out).toLocaleDateString()
                                            : "—"}
                                    </p>
                                    <p className="text-muted-foreground">
                                        Plan: {selected.plan || "—"}
                                    </p>
                                </div>

                                <div>
                                    <Label>Room Selection</Label>
                                    <div className="space-y-2 mt-1">
                                        {selected.room_details?.length ? (
                                            selected.room_details.map((room, i) => (
                                                <div
                                                    key={i}
                                                    className="flex justify-between border rounded p-2 bg-muted/20"
                                                >
                                                    <span>{room.room_type}</span>
                                                    <span className="font-medium">
                                                        {room.no_of_rooms} room
                                                        {room.no_of_rooms > 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted-foreground text-sm">No room selected</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label>Guest Composition</Label>
                                    <p className="text-muted-foreground border rounded p-2 bg-muted/20">
                                        Total: <span className="text-foreground font-medium">{selected.total_members || 0}</span> |
                                        Seniors: <span className="text-foreground font-medium">{selected.senior_citizens || 0}</span> |
                                        Children: <span className="text-foreground font-medium">{selected.child || 0}</span> |
                                        Specially Abled: <span className="text-foreground font-medium">{selected.specially_abled || 0}</span>
                                    </p>
                                </div>

                                <div>
                                    <Label>Pricing</Label>
                                    <div className="flex gap-4">
                                        <p>Quote: <span className="font-medium">{selected.quote_amount ? `₹${selected.quote_amount}` : "—"}</span></p>
                                        <p>Offer: <span className="font-medium text-primary">{selected.offer_amount ? `₹${selected.offer_amount}` : "—"}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT — EDITABLE */}
                            <div className="space-y-4 border-l pl-6 border-border">
                                <div>
                                    <Label className="text-primary font-bold">Update Lead Status</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border px-3 text-sm mt-1"
                                        value={status}
                                        onChange={(e) =>
                                            setStatus(e.target.value as EnquiryStatus)
                                        }
                                    >
                                        <option value="open">Open</option>
                                        <option value="follow_up">Follow Up</option>
                                        <option value="closed">Closed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </NativeSelect>
                                </div>

                                {status === "follow_up" && (
                                    <div className="animate-in fade-in duration-300">
                                        <Label>Follow-up Date</Label>
                                        <Input
                                            type="datetime-local"
                                            className="mt-1 h-10 rounded-[3px]"
                                            value={followUpDate}
                                            onChange={(e) => setFollowUpDate(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div>
                                    <Label>Internal Notes</Label>
                                    <textarea
                                        className="w-full min-h-[120px] rounded-[3px] border px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-primary outline-none transition-all"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Add a reason or next steps..."
                                    />
                                </div>

                                <Button
                                    variant="hero"
                                    className="w-full h-11"
                                    onClick={handleUpdate}
                                >
                                    Update Enquiry
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
