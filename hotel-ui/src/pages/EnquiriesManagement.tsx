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
import { MenuItemSelect } from "@/components/MenuItemSelect";
import {
    useGetPropertyEnquiriesQuery,
    useLazyExportPropertyEnquiriesQuery,
    useUpdateEnquiryMutation,
    useGetStaffByPropertyQuery,
    useGetLogsQuery as useGetAuditLogsQuery,
    useGetLogsByTableQuery,
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
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarRangePicker } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, Plus, RefreshCcw, User, Phone, MapPin, Calendar, Clock, ClipboardList, Info, Building2, Package, Globe, UserCheck, DollarSign, ListTodo, Activity } from "lucide-react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { exportToExcel } from "@/utils/exportToExcel";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { GridBadge } from "@/components/ui/grid-badge";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { formatAppDate, formatAppDateTime, parseAppDate, toDatetimeLocalValue } from "@/utils/dateFormat";
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import { getFormattedAuditChanges, getAuditChangeText, getAuditActionBadge, formatAuditActionText } from "@/utils/auditUtils";

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
        followUpLabel: enquiry.follow_up_date ? formatAppDateTime(enquiry.follow_up_date) : "--",
    };
}

function getAuditActionLabel(log: any) {
    return getAuditActionBadge(log.event_type);
}

function getAuditChangeText(log: any, plainText = false) {
    if (log.event_type === "CREATE" || log.event_type === "NEW_BOOKING") {
        const text = log.event_type === "NEW_BOOKING" ? "New Booking Created" : "Created";
        if (plainText) return `Enquiry: ${text}`;
        return (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Enquiry:</span> {text}
            </div>
        );
    }

    try {
        const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
        if (!details || (!details.before && !details.after)) return log.comments || "—";

        const formattedDetails: any = { before: {}, after: {} };
        const { before, after } = details;

        if (before.status !== after.status) {
            formattedDetails.before["Lead Status"] = formatEnquiryStatus(before.status);
            formattedDetails.after["Lead Status"] = formatEnquiryStatus(after.status);
        }
        if (before.follow_up_date !== after.follow_up_date) {
            formattedDetails.before["Follow-up Date & Time"] = before.follow_up_date ? formatAppDateTime(before.follow_up_date) : "None";
            formattedDetails.after["Follow-up Date & Time"] = after.follow_up_date ? formatAppDateTime(after.follow_up_date) : "None";
        }
        if (before.comment !== after.comment) {
            formattedDetails.before["Internal Progress Notes"] = before.comment || "None";
            formattedDetails.after["Internal Progress Notes"] = after.comment || "None";
        }
        if (before.booking_id !== after.booking_id) {
            formattedDetails.before["Booking"] = before.booking_id ? `BO${before.booking_id}` : "None";
            formattedDetails.after["Booking"] = after.booking_id ? `BO${after.booking_id}` : "None";
        }

        if (plainText) {
            return getAuditChangePlainText(formattedDetails);
        }
        return getFormattedAuditChanges(formattedDetails);
    } catch (e) {
        return log.comments || "—";
    }
}

export default function EnquiriesManagement() {
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selected, setSelected] = useState<Enquiry | null>(null);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLimit, setHistoryLimit] = useState(25);

    const [activeTab, setActiveTab] = useState<"enquiry" | "audit">("enquiry");
    const [auditSearchInput, setAuditSearchInput] = useState("");
    const [auditSearchQuery, setAuditSearchQuery] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("");
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [auditPage, setAuditPage] = useState(1);
    const [auditLimit, setAuditLimit] = useState(10);

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

    const { data: enquiries, isLoading: enquiryLoading, refetch } = useGetPropertyEnquiriesQuery({
        propertyId: selectedPropertyId,
        page,
        limit,
        search: searchQuery,
        status: statusFilter,
        fromDate: dateRange[0] ? dateRange[0].toISOString() : undefined,
        toDate: dateRange[1] ? dateRange[1].toISOString() : undefined,
    }, {
        skip: !isLoggedIn || !selectedPropertyId || isInitializing
    })

    const { data: auditLogs, isLoading: auditLoading } = useGetAuditLogsQuery(
        {
            tableName: "enquiries",
            eventId: selected?.id,
            page: historyPage,
            limit: historyLimit,
        },
        { skip: !selected?.id || sheetTab !== "history" }
    );

    const { data: globalAuditLogs, isFetching: globalAuditFetching, refetch: refetchGlobalLogs } = useGetLogsByTableQuery({
        tableName: "enquiries",
        propertyId: selectedPropertyId,
        page: 1,
        limit: 1000
    }, {
        skip: !isLoggedIn || !selectedPropertyId || activeTab !== "audit"
    });

    const filteredAuditLogs = useMemo(() => {
        let logs = globalAuditLogs?.data || [];
        if (auditActionFilter) {
            logs = logs.filter((log: any) => log.event_type === auditActionFilter);
        }
        if (auditSearchQuery) {
            const query = auditSearchQuery.toLowerCase();
            logs = logs.filter((log: any) => {
                const idMatch = formatModuleDisplayId("enquiry", log.event_id).toLowerCase().includes(query);
                const userMatch = (staffMap[log.user_id] || log.user_first_name || "").toLowerCase().includes(query);
                return idMatch || userMatch;
            });
        }
        return logs;
    }, [globalAuditLogs?.data, auditActionFilter, auditSearchQuery, staffMap]);

    const paginatedAuditLogs = useMemo(() => {
        const start = (auditPage - 1) * auditLimit;
        return filteredAuditLogs.slice(start, start + auditLimit);
    }, [filteredAuditLogs, auditPage, auditLimit]);

    const exportHistoryLogs = () => {
        if (!filteredAuditLogs.length) {
            toast.info("No audit logs to export");
            return;
        }

        const formatted = filteredAuditLogs.map((log: any) => {
            const userName = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || staffMap[log.user_id] || "System";
            return {
                "Enquiry ID": formatModuleDisplayId("enquiry", log.event_id),
                "Action": formatAuditActionText(log.event_type),
                "Change": getAuditChangeText(log, true),
                "User": userName,
                "Date & Time": formatAppDateTime(log.created_on),
            };
        });

        exportToExcel(formatted, "EnquiriesAuditLogs.xlsx");
        toast.success("History exported successfully");
    };

    const refreshHistoryGrid = async () => {
        if (globalAuditFetching) return;
        const toastId = toast.loading("Refreshing history...");
        try {
            await refetchGlobalLogs();
            toast.dismiss(toastId);
            toast.success("History refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh history");
        }
    };

    const [getAllEnquiries, { isFetching: exportingEnquiries }] = useLazyExportPropertyEnquiriesQuery()
    const [updateEnquiry] = useUpdateEnquiryMutation()

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId, searchQuery, statusFilter, dateRange]);

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
                search: searchQuery,
                fromDate: dateRange[0] ? dateRange[0].toISOString() : undefined,
                toDate: dateRange[1] ? dateRange[1].toISOString() : undefined,
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
        setDateRange([null, null]);
        setPage(1);
    };

    const resetHistoryFiltersHandler = () => {
        setAuditSearchInput("");
        setAuditSearchQuery("");
        setAuditActionFilter("");
        setAuditPage(1);
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

    const enquiryRows = useMemo(() => enquiries?.data ?? [], [enquiries?.data]);

    const enquiryColumns = useMemo<ColumnDef<Enquiry>[]>(() => [
        {
            label: "Enquiry ID",
            headClassName: "text-center w-[120px]",
            cellClassName: "text-center font-medium text-primary min-w-[120px]",
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

    const auditColumns = useMemo<ColumnDef<any>[]>(() => [

        {
            label: "Action",
            headClassName: "text-center w-[140px]",
            cellClassName: "text-center font-medium min-w-[140px]",
            render: (log) => getAuditActionBadge(log.event_type),
        },
        {
            label: "Updated By",
            cellClassName: "whitespace-nowrap",
            render: (log) => {
                const name = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim();
                return name || staffMap[log.user_id] || "System";
            },
        },
        {
            label: "Date & Time",
            headClassName: "text-white w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
            render: (log) => formatAppDateTime(log.created_on),
        },
        {
            label: "Changes",
            cellClassName: "min-w-[300px] py-2",
            render: (log) => getAuditChangeText(log),
        },
    ], [historyPage, historyLimit, staffMap, selected]);

    return (
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
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
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <div className="flex-1 min-w-0 h-full">
                                    <MenuItemSelect
                                        value={selectedPropertyId ?? ""}
                                        items={myProperties?.properties?.map((p: any) => ({ id: p.id, label: p.brand_name })) || []}
                                        onSelect={(val) => {
                                            setSelectedPropertyId(Number(val) || null);
                                            setPage(1);
                                        }}
                                        itemName="label"
                                        placeholder="Select Property"
                                        extraClasses="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2"
                                    />
                                </div>
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

                <div className="border-b border-border flex">
                    <button
                            onClick={() => setActiveTab("enquiry")}
                            className={cn(
                                "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                                activeTab === "enquiry"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Enquiries
                        </button>
                    <button
                            onClick={() => setActiveTab("audit")}
                            className={cn(
                                "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                                activeTab === "audit"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            History
                        </button>
                </div>

                {activeTab === "enquiry" && (
                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
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

                                <GridToolbarRangePicker
                                    startDate={dateRange[0]}
                                    endDate={dateRange[1]}
                                    onChange={(dates) => {
                                        setDateRange(dates);
                                        setPage(1);
                                    }}
                                    startLabel="From"
                                    endLabel="To"
                                    className="w-full"
                                />

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
                            data={enquiryRows}
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
                )}

                {activeTab === "audit" && (
                    <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={auditSearchInput}
                                        onChange={(v) => {
                                            setAuditSearchInput(v);
                                            if (!v.trim()) {
                                                setAuditSearchQuery("");
                                                setAuditPage(1);
                                            }
                                        }}
                                        onSearch={() => {
                                            setAuditSearchQuery(auditSearchInput.trim());
                                            setAuditPage(1);
                                        }}
                                    />
                                    <GridToolbarSelect
                                        label="Action"
                                        value={auditActionFilter}
                                        onChange={(v) => {
                                            setAuditActionFilter(v);
                                            setAuditPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            { label: "CREATE", value: "CREATE" },
                                            { label: "UPDATE", value: "UPDATE" },
                                            { label: "DELETE", value: "DELETE" },
                                        ]}
                                    />
                                    <div className="w-full" />
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
                                                onClick: resetHistoryFiltersHandler,
                                            },
                                            {
                                                key: "refresh",
                                                label: "Refresh Data",
                                                icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: refreshHistoryGrid,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>

                        <div className="px-2 pb-2">
                            <AppDataGrid
                                density="compact"
                                columns={[
                                    {
                                        label: "Enquiry ID",
                                        headClassName: "text-center w-[120px]",
                                        cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                        render: (log) => formatModuleDisplayId("enquiry", log.event_id),
                                    },
                                    {
                                        label: "Action",
                                        headClassName: "text-center w-[140px]",
            cellClassName: "text-center font-medium min-w-[140px]",
                                        render: (log) => getAuditActionBadge(log.event_type),
                                    },
                                    {
                                        label: "Change",
                                        headClassName: "w-[320px]",
            cellClassName: "min-w-[320px] whitespace-normal text-primary/80 font-medium",
                                        render: (log) => getAuditChangeText(log),
                                    },
                                    {
                                        label: "User",
                                        headClassName: "w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
                                        render: (log) => {
                                            const name = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim();
                                            return name || staffMap[log.user_id] || "System";
                                        },
                                    },
                                    {
                                        label: "Date & Time",
                                        headClassName: "text-white w-[180px]",
                                        cellClassName: "text-muted-foreground min-w-[180px]",
                                        render: (log) => formatAppDateTime(log.created_on),
                                    },
                                ]}
                                data={paginatedAuditLogs}
                                loading={globalAuditFetching}
                                emptyText="No history records found"
                                minWidth="800px"
                                className="mt-0"
                                enablePagination
                                paginationProps={{
                                    page: auditPage,
                                    totalPages: Math.ceil(filteredAuditLogs.length / auditLimit) || 1,
                                    setPage: setAuditPage,
                                    disabled: globalAuditFetching,
                                    totalRecords: filteredAuditLogs.length,
                                    limit: auditLimit,
                                    onLimitChange: (value) => {
                                        setAuditLimit(value);
                                        setAuditPage(1);
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Manage Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className={cn("w-full overflow-y-auto bg-background transition-all duration-300", sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-4xl sm:max-w-3xl")}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="pb-4">
                            <div className="space-y-0.5">
                                <SheetTitle className="text-xl font-bold">
                                    {editMode ? "Update Enquiry" : "Enquiry"}
                                    {selected?.id && <span className="ml-2">[#{formatModuleDisplayId("enquiry", selected.id)}]</span>}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {editMode 
                                        ? `Adjust lead lifecycle and internal notes` 
                                        : `Comprehensive summary of lead configuration`}
                                </p>
                            </div>
                        </SheetHeader>

                        {!editMode && (
                            <div className="border-b border-border flex mb-4">
                                <button
                                    onClick={() => setSheetTab("summary")}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
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
                                        "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
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
                                    <div className="space-y-4">
                                        <CardSectionView title="Guest Profile" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Guest Name" value={selected.guest_name} />
                                            <ViewField label="Mobile" value={selected.mobile} />
                                            <ViewField label="Email" value={selected.email} />
                                            <ViewField label="City" value={selected.city} />
                                            <ViewField label="Source" value={selected.source || "Direct"} />
                                            <ViewField label="Enquiry Type" value={selected.enquiry_type || "General"} />
                                        </CardSectionView>

                                        <CardSectionView title="Stay Schedule" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Check In" value={selected.check_in ? formatAppDate(selected.check_in) : "—"} />
                                            <ViewField label="Check Out" value={selected.check_out ? formatAppDate(selected.check_out) : "—"} />
                                            <ViewField label="Selected Plan" value={selected.plan} />
                                            <ViewField label="Status" value={formatEnquiryStatus(selected.status)} />
                                        </CardSectionView>

                                        <CardSectionView title="Room Requirements" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
                                        </CardSectionView>

                                        <CardSectionView title="Internal Activity Notes" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 gap-y-4">
                                            <ViewField
                                                label="Notes"
                                                value={selected.comment || "No activity notes recorded yet for this enquiry."}
                                            />
                                        </CardSectionView>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <div className="border border-border rounded-[3px] bg-background">
                                        <AppDataGrid
                                            density="compact"
                                            columns={auditColumns}
                                            data={auditLogs?.data || []}
                                            loading={auditLoading}
                                            emptyText="No history available for this enquiry"
                                            className="mt-0"
                                            minWidth="600px"
                                            enablePagination={!!auditLogs?.pagination}
                                            paginationProps={{
                                                page: historyPage,
                                                totalPages: auditLogs?.pagination?.totalPages ?? 1,
                                                setPage: setHistoryPage,
                                                disabled: !auditLogs,
                                                totalRecords: auditLogs?.pagination?.totalItems ?? auditLogs?.pagination?.total ?? auditLogs?.data?.length ?? 0,
                                                limit: historyLimit,
                                                onLimitChange: (val) => {
                                                    setHistoryLimit(val);
                                                    setHistoryPage(1);
                                                },
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selected && editMode && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Left: Status & Timing */}
                                <div className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Lead Lifecycle Management
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Lead Status *</Label>
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
                                            <Label className="text-foreground">Follow-up Date & Time</Label>
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
                                <div className="rounded-[5px] border-2 border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Internal Progress Notes
                                    </h3>
                                    <div className="space-y-2 flex-1">
                                        <textarea
                                            className="w-full min-h-[160px] rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30 leading-relaxed resize-none shadow-none"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            maxLength={500}
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
