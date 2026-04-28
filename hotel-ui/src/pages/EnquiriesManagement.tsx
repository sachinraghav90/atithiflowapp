import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { NativeSelect } from "@/components/ui/native-select";
import {
    useGetPropertyEnquiriesQuery,
    useLazyExportPropertyEnquiriesQuery,
    useUpdateEnquiryMutation,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { formatReadableLabel } from "@/utils/formatString";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, Plus, RefreshCcw } from "lucide-react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { exportToExcel } from "@/utils/exportToExcel";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { GridBadge } from "@/components/ui/grid-badge";

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

const ENQUIRY_STATUS_OPTIONS: Array<{ label: string; value: EnquiryStatus }> = [
    { label: "Open", value: "open" },
    { label: "Follow Up", value: "follow_up" },
    { label: "Reserved", value: "reserved" },
    { label: "Booked", value: "booked" },
    { label: "Closed", value: "closed" },
    { label: "Cancelled", value: "cancelled" },
];

function formatEnquiryStatus(status?: string | null) {
    return formatReadableLabel(status) || "—";
}

function formatEnquiryDate(value?: string | null) {
    return value ? new Date(value).toLocaleDateString() : "—";
}

function formatEnquiryCurrency(value?: string | null) {
    return value ? `₹${value}` : "—";
}

function getEnquiryDisplay(enquiry: Enquiry) {
    return {
        primaryLabel: enquiry.guest_name || enquiry.mobile || enquiry.email || enquiry.id,
        contactLabel: enquiry.mobile || "--",
        cityLabel: enquiry.city || "--",
        offerAmountLabel: formatEnquiryCurrency(enquiry.offer_amount),
        checkInLabel: formatEnquiryDate(enquiry.check_in),
        checkOutLabel: formatEnquiryDate(enquiry.check_out),
        statusLabel: formatEnquiryStatus(enquiry.status),
        followUpLabel: formatEnquiryDate(enquiry.follow_up_date),
    };
}

export default function EnquiriesManagement() {
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selected, setSelected] = useState<Enquiry | null>(null);

    const [status, setStatus] = useState<EnquiryStatus>("open");
    const [followUpDate, setFollowUpDate] = useState("");
    const [comment, setComment] = useState("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "">("");

    const navigate = useNavigate()

    const openManage = (enquiry: Enquiry, isEdit: boolean = true) => {
        setSelected(enquiry);
        setStatus(enquiry.status);
        setFollowUpDate(enquiry.follow_up_date?.slice(0, 16) ?? "");
        setComment(enquiry.comment ?? "");
        setEditMode(isEdit);
        setOpen(true);
    };
    const { myProperties, isMultiProperty, isInitializing } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const cleanSearchQuery = useMemo(() => {
        if (!searchQuery) return "";
        const statusLabels = ENQUIRY_STATUS_OPTIONS.map(opt => opt.label.toLowerCase());
        const filterKeywords = [...statusLabels];
        return filterKeywords
            .sort((left, right) => right.length - left.length)
            .reduce((query, keyword) => {
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return query.replace(new RegExp(`\\b${escapedKeyword}\\b`, "gi"), " ");
            }, searchQuery)
            .replace(/\s+/g, " ")
            .trim();
    }, [searchQuery]);

    const { data: enquiries, isLoading: enquiryLoading, refetch } = useGetPropertyEnquiriesQuery({
        propertyId: selectedPropertyId,
        page,
        limit,
        search: cleanSearchQuery,
        status: statusFilter
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [getAllEnquiries, { isFetching: exportingEnquiries }] = useLazyExportPropertyEnquiriesQuery()
    const [updateEnquiry] = useUpdateEnquiryMutation()

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId, searchQuery, statusFilter]);

    const exportEnquiriesSheet = async () => {
        if (exportingEnquiries) return;

        const totalRecords = enquiries?.pagination?.totalItems ?? enquiries?.pagination?.total ?? (enquiries?.data?.length || 0);
        if (!totalRecords) {
            toast.info("No enquiries to export");
            return;
        }

        const toastId = toast.loading("Preparing enquiries export...");

        try {
            const res = await getAllEnquiries({
                propertyId: selectedPropertyId,
                status: statusFilter,
                search: cleanSearchQuery,
            }).unwrap();

            if (!res?.data?.length) {
                toast.dismiss(toastId);
                toast.info("No enquiries to export");
                return;
            }

            const formatted = res.data.map((enquiry: Enquiry) => {
                const displayEnquiry = getEnquiryDisplay(enquiry);

                return {
                    "Enquiry ID": formatModuleDisplayId("enquiry", enquiry.id),
                    Name: displayEnquiry.primaryLabel,
                    Contact: displayEnquiry.contactLabel,
                    City: displayEnquiry.cityLabel,
                    "Offer Amount": displayEnquiry.offerAmountLabel,
                    "Check In": displayEnquiry.checkInLabel,
                    "Check Out": displayEnquiry.checkOutLabel,
                    Status: displayEnquiry.statusLabel,
                    "Follow Up": displayEnquiry.followUpLabel,
                };
            });

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
        if (enquiryLoading) return;
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

    const filteredEnquiries = useMemo(() => {
        const rows = enquiries?.data ?? [];
        const query = cleanSearchQuery.toLowerCase();

        if (!query) return rows;

        return rows.filter((enquiry: Enquiry) => {
            const displayId = formatModuleDisplayId("enquiry", enquiry.id).toLowerCase();
            const searchableFields = [
                displayId,
                enquiry.guest_name,
                enquiry.mobile,
                enquiry.email,
                enquiry.city,
                enquiry.source,
                enquiry.enquiry_type,
                enquiry.agent_name,
            ];

            return searchableFields.some(field => 
                String(field ?? "").toLowerCase().includes(query)
            );
        });
    }, [enquiries?.data, cleanSearchQuery]);

    const enquiryColumns = useMemo<ColumnDef<Enquiry>[]>(() => [
        {
            label: "Enquiry ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (enquiry) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => openManage(enquiry, false)}
                    aria-label={`Open summary view for enquiry ${formatModuleDisplayId("enquiry", enquiry.id)}`}
                >
                    {formatModuleDisplayId("enquiry", enquiry.id)}
                </button>
            ),
        },
        {
            label: "Name",
            cellClassName: "font-medium whitespace-nowrap max-w-[150px] truncate",
            render: (enquiry) => getEnquiryDisplay(enquiry).primaryLabel,
        },
        {
            label: "Contact",
            cellClassName: "font-medium whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).contactLabel,
        },
        {
            label: "City",
            cellClassName: "text-muted-foreground whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).cityLabel,
        },
        {
            label: "Offer Amount",
            headClassName: "text-center",
            cellClassName: "text-center font-medium whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).offerAmountLabel,
        },
        {
            label: "Check In",
            headClassName: "text-center",
            cellClassName: "text-center text-xs text-muted-foreground whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).checkInLabel,
        },
        {
            label: "Check Out",
            headClassName: "text-center",
            cellClassName: "text-center text-xs text-muted-foreground whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).checkOutLabel,
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center whitespace-nowrap",
            render: (enquiry) => (
                <GridBadge status={enquiry.status} statusType="enquiry">
                    {getEnquiryDisplay(enquiry).statusLabel}
                </GridBadge>
            ),
        },
        {
            label: "Follow Up",
            headClassName: "text-center",
            cellClassName: "text-center text-xs text-muted-foreground whitespace-nowrap",
            render: (enquiry) => getEnquiryDisplay(enquiry).followUpLabel,
        },
    ], []);

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
                                variant="hero"
                                className="h-10 px-4 flex items-center gap-2"
                                onClick={() => navigate("/create-enquiry")}
                            >
                                <Plus className="w-4 h-4" /> New Enquiry
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
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value as EnquiryStatus | "");
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...ENQUIRY_STATUS_OPTIONS,
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
                            density="compact"
                            columns={enquiryColumns}
                            data={filteredEnquiries}
                            loading={enquiryLoading || isInitializing}
                            emptyText="No enquiries found"
                            minWidth="1080px"
                            actionClassName="text-center w-[60px]"
                            className="mt-0"
                            actions={(enquiry) => {
                                return (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                onClick={() => openManage(enquiry, true)}
                                                aria-label={`Manage enquiry ${enquiry.id}`}
                                            >
                                                <Pencil className="w-3.5 h-3.5 mx-auto" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Manage Enquiry</TooltipContent>
                                    </Tooltip>
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

            {/* Manage Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <SheetTitle>{editMode ? "Manage Enquiry" : "Enquiry Summary"}</SheetTitle>
                        </SheetHeader>

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

                            {/* RIGHT — EDITABLE / READ-ONLY */}
                            <div className="space-y-4 border-l pl-6 border-border">
                                <div>
                                    <Label className={editMode ? "text-primary font-bold" : "text-muted-foreground"}>
                                        {editMode ? "Update Lead Status" : "Lead Status"}
                                    </Label>
                                    {!editMode ? (
                                        <p className="font-medium mt-1 text-sm uppercase">
                                            {status.replace("_", " ")}
                                        </p>
                                    ) : (
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
                                    )}
                                </div>

                                {status === "follow_up" && (
                                    <div className="animate-in fade-in duration-300">
                                        <Label className="text-muted-foreground">Follow-up Date</Label>
                                        {!editMode ? (
                                            <p className="font-medium mt-1 text-sm">
                                                {followUpDate ? new Date(followUpDate).toLocaleString() : "—"}
                                            </p>
                                        ) : (
                                            <Input
                                                type="datetime-local"
                                                className="mt-1 h-10 rounded-[3px]"
                                                value={followUpDate}
                                                onChange={(e) => setFollowUpDate(e.target.value)}
                                            />
                                        )}
                                    </div>
                                )}

                                <div>
                                    <Label className="text-muted-foreground">Internal Notes</Label>
                                    {!editMode ? (
                                        <p className="font-medium mt-1 text-sm whitespace-pre-wrap">
                                            {comment || "—"}
                                        </p>
                                    ) : (
                                        <textarea
                                            className="w-full min-h-[120px] rounded-[3px] border px-3 py-2 text-sm mt-1 focus:ring-1 focus:ring-primary outline-none transition-all"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Add a reason or next steps..."
                                        />
                                    )}
                                </div>

                                {editMode && (
                                    <div className="space-y-2 pt-2">
                                        <Button
                                            variant="hero"
                                            className="w-full h-11"
                                            onClick={handleUpdate}
                                        >
                                            Update Enquiry
                                        </Button>

                                        {bookingPermission?.can_create && !selected.is_reserved && (
                                            <Button
                                                variant="heroOutline"
                                                className="w-full h-11"
                                                onClick={() => handleBook(selected)}
                                            >
                                                Book Enquiry
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
