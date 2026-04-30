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
    useGetStaffByPropertyQuery,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { cn } from "@/lib/utils";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { formatReadableLabel } from "@/utils/formatString";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, Plus, RefreshCcw, User, Phone, MapPin, Calendar, Clock, ClipboardList, Info, Building2, Package, Globe, UserCheck, DollarSign, ListTodo, Activity } from "lucide-react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { exportToExcel } from "@/utils/exportToExcel";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { GridBadge } from "@/components/ui/grid-badge";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { formatAppDate, formatAppDateTime, parseAppDate, toDatetimeLocalValue } from "@/utils/dateFormat";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";

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
    return formatAppDate(value);
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
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    const [status, setStatus] = useState<EnquiryStatus>("open");
    const [followUpDate, setFollowUpDate] = useState("");
    const [comment, setComment] = useState("");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "">("");

    const { data: staffData } = useGetStaffByPropertyQuery({ 
        property_id: selectedPropertyId 
    }, { 
        skip: !isLoggedIn || !selectedPropertyId 
    });

    const staffMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (staffData?.data) {
            staffData.data.forEach((staff: any) => {
                const name = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();
                if (staff.user_id) {
                    map[staff.user_id] = name || staff.email || staff.user_id;
                }
            });
        }
        return map;
    }, [staffData]);

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
        <div className="flex flex-col">
            <section className="p-6 lg:p-8 space-y-6">
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
                <SheetContent side="right" className="w-full lg:max-w-3xl sm:max-w-2xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="pb-4">
                            <div className="space-y-0.5">
                                <SheetTitle className="text-xl font-bold text-foreground">
                                    {editMode ? "Update Enquiry" : "Enquiry Summary"}
                                    {selected?.id && <span className="ml-2 font-semibold">[#{formatModuleDisplayId("enquiry", selected.id)}]</span>}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {editMode 
                                        ? `Adjust lead lifecycle and internal notes for #${formatModuleDisplayId("enquiry", selected?.id || "")}.` 
                                        : `Comprehensive summary of lead configuration for #${formatModuleDisplayId("enquiry", selected?.id || "")}.`}
                                </p>
                            </div>
                        </SheetHeader>

                        {!editMode && (
                            <div className="border-b border-border flex mb-4">
                                <button
                                    onClick={() => setSheetTab("summary")}
                                    className={cn(
                                        "px-4 py-2 text-[11px] font-bold tracking-wide transition-all border-b-2 -mb-[2px]",
                                        sheetTab === "summary"
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setSheetTab("history")}
                                    className={cn(
                                        "px-4 py-2 text-[11px] font-bold tracking-wide transition-all border-b-2 -mb-[2px]",
                                        sheetTab === "history"
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    History
                                </button>
                            </div>
                        )}

                        {selected && !editMode && (
                            <div className="space-y-4">
                                {sheetTab === "summary" && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <PropertyViewSection title="Guest Profile" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Guest Name" value={selected.guest_name} />
                                            <ViewField label="Mobile" value={selected.mobile} />
                                            <ViewField label="Email" value={selected.email} />
                                            <ViewField label="City" value={selected.city} />
                                            <ViewField label="Source" value={selected.source || "Direct"} />
                                            <ViewField label="Enquiry Type" value={selected.enquiry_type || "General"} />
                                        </PropertyViewSection>

                                        <PropertyViewSection title="Stay Schedule" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Check In" value={selected.check_in ? formatAppDate(selected.check_in) : "—"} />
                                            <ViewField label="Check Out" value={selected.check_out ? formatAppDate(selected.check_out) : "—"} />
                                            <ViewField label="Selected Plan" value={selected.plan} />
                                            <ViewField label="Status" value={formatEnquiryStatus(selected.status)} />
                                        </PropertyViewSection>

                                        <PropertyViewSection title="Room Requirements" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            {selected.room_details?.length ? (
                                                selected.room_details.map((room, i) => (
                                                    <ViewField
                                                        key={i}
                                                        label={room.room_type || `Room ${i + 1}`}
                                                        value={`${room.no_of_rooms || 0} ${Number(room.no_of_rooms) === 1 ? "Room" : "Rooms"}`}
                                                    />
                                                ))
                                            ) : (
                                                <ViewField
                                                    label="Room Requirements"
                                                    value="No specific room requirements documented."
                                                    className="sm:col-span-2"
                                                />
                                            )}
                                            <ViewField label="Total Guests" value={`${selected.total_members || 0} Members • ${selected.child || 0} Children`} />
                                            <ViewField label="Offer Amount" value={selected.offer_amount ? `₹ ${selected.offer_amount}` : "—"} />
                                        </PropertyViewSection>

                                        <PropertyViewSection title="Internal Activity Notes" className="grid grid-cols-1 gap-y-4">
                                            <ViewField
                                                label="Notes"
                                                value={selected.comment || "No activity notes recorded yet for this enquiry."}
                                            />
                                        </PropertyViewSection>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                        <p className="text-sm text-muted-foreground">No history logs available yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {selected && editMode && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Left: Status & Timing */}
                                <div className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                    <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3">
                                        Lead Lifecycle Management
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground tracking-wide">Lead Status *</Label>
                                            <NativeSelect
                                                className="w-full h-11 bg-background shadow-none text-sm border-border/60"
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
                                            >
                                                {ENQUIRY_STATUS_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </NativeSelect>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground tracking-wide">Follow-up Date & Time</Label>
                                            <ResponsiveDatePicker
                                                value={parseAppDate(followUpDate)}
                                                onChange={(date) => setFollowUpDate(toDatetimeLocalValue(date))}
                                                showTime
                                                className="h-11 rounded-[3px] bg-background border-border/60 text-sm w-full shadow-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Internal Notes */}
                                <div className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                    <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3">
                                        Internal Progress Notes
                                    </h3>
                                    <div className="space-y-2 flex-1">
                                        <textarea
                                            className="w-full min-h-[160px] rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30 leading-relaxed resize-none shadow-none"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            maxLength={500}
                                            placeholder="Document follow-up outcomes, special requests, or internal progress notes here..."
                                        />
                                        <div className="text-[10px] font-bold text-muted-foreground/60 text-right">
                                            {comment.length}/500
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {bookingPermission?.can_create && !selected.is_reserved && (
                                <div className="p-4 rounded-[5px] border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-primary tracking-wide">Convert to Booking</p>
                                        <p className="text-[10px] text-muted-foreground font-bold">Ready to confirm? Proceed to reservations with this enquiry data.</p>
                                    </div>
                                    <Button
                                        variant="heroOutline"
                                        className="h-10 px-6 text-xs font-bold flex items-center gap-2 bg-background shadow-sm hover:bg-primary/10 border-primary/30 text-primary"
                                        onClick={() => handleBook(selected)}
                                    >
                                        <Plus className="w-4 h-4" /> Book Enquiry
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                            <Button
                                variant="heroOutline"
                                onClick={() => setOpen(false)}
                            >
                                {editMode ? "Cancel" : "Close"}
                            </Button>

                            {editMode && (
                                <Button
                                    variant="hero"
                                    onClick={handleUpdate}
                                >
                                    Update
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
