import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { NativeSelect } from "@/components/ui/native-select";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    useCreateVendorMutation,
    useGetMyPropertiesQuery,
    useGetPropertyVendorsQuery,
    useLazyExportPropertyVendorsQuery,
    useUpdateVendorMutation,
    useGetLogsQuery,
    useGetLogsByTableQuery,
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useAppSelector } from "@/redux/hook";
import { formatAppDateTime } from "@/utils/dateFormat";
import {
    selectIsOwner,
    selectIsSuperAdmin,
} from "@/redux/selectors/auth.selectors";
import { toast } from "react-toastify";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useGridPagination } from "@/hooks/useGridPagination";
import { FilterX, Pencil, RefreshCcw, Download, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { formatReadableLabel } from "@/utils/formatString";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import FormInput from "@/components/forms/FormInput";
import { getFormattedAuditChanges, getAuditActionBadge, getAuditChangePlainText, formatAuditActionText } from "@/utils/auditUtils";

/* ---------------- Types ---------------- */
type Vendor = {
    id: string;
    property_id: string;
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
    is_active: boolean;
};

type VendorForm = {
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
    is_active?: boolean;
};

const VENDOR_STATUS_OPTIONS = [
    { label: "All", value: "" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
];

const buildVendorPayload = (form: VendorForm, propertyId?: number) => {
    const payload: any = {
        name: form.name,
        pan_no: form.pan_no,
        gst_no: form.gst_no,
        address: form.address,
        contact_no: form.contact_no,
        email_id: form.email_id,
        vendor_type: form.vendor_type,
        is_active: form.is_active,
    };
    if (propertyId) payload.property_id = propertyId;
    return payload;
};

function getVendorAuditChanges(audit: any) {
    let details = audit.details;
    if (typeof details === "string") {
        try {
            details = JSON.parse(details);
        } catch (e) {
            // ignore
        }
    }
    const before = details?.before;
    const after = details?.after;

    if (audit.event_type === "CREATE") {
        return (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Vendor:</span> Created
            </div>
        );
    }

    const formattedDetails: any = { before: {}, after: {} };

    if (before?.name !== after?.name) {
        formattedDetails.before["Name"] = before?.name || "—";
        formattedDetails.after["Name"] = after?.name || "—";
    }
    
    if (before?.vendor_type !== after?.vendor_type) {
        formattedDetails.before["Vendor Type"] = before?.vendor_type || "—";
        formattedDetails.after["Vendor Type"] = after?.vendor_type || "—";
    }
    
    if (before?.pan_no !== after?.pan_no) {
        formattedDetails.before["PAN"] = before?.pan_no || "—";
        formattedDetails.after["PAN"] = after?.pan_no || "—";
    }
    
    if (before?.gst_no !== after?.gst_no) {
        formattedDetails.before["GST"] = before?.gst_no || "—";
        formattedDetails.after["GST"] = after?.gst_no || "—";
    }
    
    if (before?.contact_no !== after?.contact_no) {
        formattedDetails.before["Contact No"] = before?.contact_no || "—";
        formattedDetails.after["Contact No"] = after?.contact_no || "—";
    }
    
    if (before?.email_id !== after?.email_id) {
        formattedDetails.before["Email"] = before?.email_id || "—";
        formattedDetails.after["Email"] = after?.email_id || "—";
    }
    
    if (before?.address !== after?.address) {
        formattedDetails.before["Address"] = before?.address || "—";
        formattedDetails.after["Address"] = after?.address || "—";
    }

    if (before?.is_active !== after?.is_active) {
        formattedDetails.before["Status"] = before?.is_active ? "Active" : "Inactive";
        formattedDetails.after["Status"] = after?.is_active ? "Active" : "Inactive";
    }

    return getFormattedAuditChanges(formattedDetails);
}

/* ---------------- Component ---------------- */
export default function VendorsManagement() {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit" | "view">("add");
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    const [form, setForm] = useState<VendorForm>({
        name: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, searchQuery, typeFilter, statusFilter],
    });

    const { 
        page: historyPage, 
        limit: historyLimit, 
        setPage: setHistoryPage, 
        handleLimitChange: handleHistoryLimitChange 
    } = useGridPagination({ initialLimit: 10, resetDeps: [editingVendor?.id] });

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const { 
        myProperties, 
        isMultiProperty, 
        isSuperAdmin, 
        isOwner,
        isInitializing,
        isLoading: myPropertiesLoading
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: vendors, isLoading, isFetching, isUninitialized, refetch: refetchVendors } = useGetPropertyVendorsQuery({ 
        propertyId: selectedPropertyId, 
        page, 
        limit, 
        search: searchQuery, 
        type: typeFilter, 
        status: statusFilter 
    }, {
        skip: !isLoggedIn || !selectedPropertyId,
    });

    const { data: auditLogs, isFetching: fetchingLogs } = useGetLogsQuery(
        {
            eventId: editingVendor?.id as string,
            tableName: "ref_vendors",
            page: historyPage,
            limit: historyLimit
        },
        { skip: !sheetOpen || sheetTab !== "history" || !editingVendor?.id }
    );

    const vendorTypeOptions = useMemo(() => {
        const types = Array.from(new Set((vendors?.data || []).map((v: Vendor) => v.vendor_type).filter(Boolean)));
        return types.map(t => ({ label: String(t), value: String(t) }));
    }, [vendors?.data]);

    const [getVendorsForExport, { isFetching: exportingVendors }] = useLazyExportPropertyVendorsQuery();

    const [createVendor] = useCreateVendorMutation()
    const [updateVendor] = useUpdateVendorMutation()

    const [activeTab, setActiveTab] = useState<"vendors" | "audit">("vendors");

    // Main History Tab State
    const [mainAuditPage, setMainAuditPage] = useState(1);
    const [mainAuditLimit, setMainAuditLimit] = useState(10);
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");

    const {
        data: globalAuditLogs,
        isLoading: globalAuditLogsLoading,
        isFetching: globalAuditLogsFetching,
        refetch: refetchGlobalAuditLogs
    } = useGetLogsByTableQuery({
        tableName: "ref_vendors",
        page: mainAuditPage,
        limit: mainAuditLimit,
    }, {
        skip: !isLoggedIn || activeTab !== "audit"
    });

    const paginatedHistoryLogs = useMemo(() => {
        let rows = globalAuditLogs?.data ?? [];
        if (historySearchQuery) {
            const lowerQuery = historySearchQuery.toLowerCase();
            rows = rows.filter((r: any) =>
                r.event_type?.toLowerCase().includes(lowerQuery) ||
                r.user_name?.toLowerCase().includes(lowerQuery) ||
                r.user_first_name?.toLowerCase().includes(lowerQuery) ||
                (r.event_id && formatModuleDisplayId("vendor", r.event_id).toLowerCase().includes(lowerQuery))
            );
        }
        if (historyActionFilter) {
            rows = rows.filter((r: any) => r.event_type?.toUpperCase() === historyActionFilter.toUpperCase());
        }
        return rows;
    }, [globalAuditLogs?.data, historySearchQuery, historyActionFilter]);

    const historyTotalRecords = globalAuditLogs?.pagination?.totalItems ?? globalAuditLogs?.pagination?.total ?? 0;
    const historyTotalPages = globalAuditLogs?.pagination?.totalPages ?? 1;

    const historyActionOptions = useMemo(() => {
        return ["CREATE", "UPDATE", "DELETE"];
    }, []);

    const resetHistoryFilters = () => {
        setHistorySearchInput("");
        setHistorySearchQuery("");
        setHistoryActionFilter("");
        setMainAuditPage(1);
    };

    const refreshHistoryGrid = async () => {
        if (globalAuditLogsFetching) return;
        const toastId = toast.loading("Refreshing history...");
        try {
            await refetchGlobalAuditLogs();
            toast.dismiss(toastId);
            toast.success("History refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh history");
        }
    };

    const exportHistoryLogs = () => {
        if (!paginatedHistoryLogs.length) return toast.info("No history rows to export");
        const formatted = paginatedHistoryLogs.map((audit: any) => {
            let details: any = null;
            try {
                details = typeof audit.details === "string" ? JSON.parse(audit.details) : audit.details;
            } catch {}
            
            let changeText = "--";
            if (details) {
                changeText = getAuditChangePlainText(details);
            }

            return {
                "Vendor ID": formatModuleDisplayId("vendor", audit.event_id),
                "Action": formatAuditActionText(audit.event_type),
                "Change": changeText,
                "User": `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                "Date & Time": formatAppDateTime(audit.created_on),
            };
        });
        exportToExcel(formatted, "Vendors-History.xlsx");
        toast.success("Export completed");
    };


    /* ---------------- Handlers ---------------- */
    const openAdd = () => {
        setMode("add");
        setEditingVendor(null);
        setSheetTab("summary");
        setForm({ name: "", is_active: true });
        setSheetOpen(true);
    };

    const handleSave = () => {
        setSubmitted(true);

        const errors: Record<string, string> = {};
        const PHONE_REGEX = /^[0-9()]{10,15}$/;

        if (!form.name?.trim()) {
            errors.name = "Name is required";
        }

        if (!form.address?.trim()) {
            errors.address = "Address is required";
        }

        if (!form.contact_no?.trim()) {
            errors.contact_no = "Contact number is required";
        } else if (!PHONE_REGEX.test(form.contact_no)) {
            errors.contact_no = "Invalid contact number";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});

        const payload =
            mode === "add"
                ? buildVendorPayload(form, Number(selectedPropertyId))
                : buildVendorPayload(form);

        const promise =
            mode === "add"
                ? createVendor(payload).unwrap()
                : updateVendor({
                    payload,
                    vendorId: editingVendor!.id,
                }).unwrap();

        toast.promise(promise, {
            pending: `${mode === "add" ? "Creating" : "Updating"} vendor...`,
            success: `Vendor ${mode === "add" ? "created" : "updated"} successfully`,
            error: `Error ${mode === "add" ? "creating" : "updating"} vendor`,
        });

        setSheetOpen(false);
    };

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)
    
    const vendorRows = useMemo(() => {
        return vendors?.data ?? [];
    }, [vendors?.data]);

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setTypeFilter("");
        setStatusFilter("");
        resetPage();
    };

    const exportVendorsSheet = async () => {
        if (exportingVendors) return;
        const toastId = toast.loading("Preparing vendors export...");

        try {
            const res = await getVendorsForExport({
                propertyId: selectedPropertyId,
                search: searchQuery.trim(),
                type: typeFilter,
                status: statusFilter
            }).unwrap();

            const rows = res?.data ?? [];

            if (!rows.length) {
                toast.dismiss(toastId);
                return toast.info("No data to export");
            }

            const formatted = rows.map((v: Vendor) => ({
                "Vendor ID": formatModuleDisplayId("vendor", v.id),
                "Name": v.name,
                "Type": v.vendor_type || "—",
                "Contact": v.contact_no || "—",
                "Status": v.is_active ? "Active" : "Inactive"
            }));

            exportToExcel(formatted, "Vendors.xlsx");
            toast.dismiss(toastId);
            toast.success("Vendors exported successfully");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export vendors");
        }
    };

    const refreshTable = async () => {
        if (isFetching) return;
        const toastId = toast.loading("Refreshing vendors...");

        try {
            await refetchVendors();
            toast.dismiss(toastId);
            toast.success("Vendors refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh vendors");
        }
    };

    useEffect(() => {
        if (!sheetOpen) {
            setFormErrors({});
            setSubmitted(false);
        }
    }, [sheetOpen]);

    const openView = (vendor: Vendor, forceMode: "view" | "edit" | "add" = "view") => {
        setMode(forceMode);
        setSheetTab("summary");

        setEditingVendor(vendor);

        setForm({
            name: vendor.name,
            pan_no: vendor.pan_no,
            gst_no: vendor.gst_no,
            address: vendor.address,
            contact_no: vendor.contact_no,
            email_id: vendor.email_id,
            vendor_type: vendor.vendor_type,
            is_active: vendor.is_active
        });

        setSheetOpen(true);
    };


    /* ---------------- UI ---------------- */
    return (
        <div className="flex flex-col bg-background">
            <section className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold leading-tight">Vendors</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Supplier and vendor logistics management
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isMultiProperty && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <div className="flex-1 min-w-0 h-full">
                                    <MenuItemSelect
                                        value={selectedPropertyId}
                                        items={myProperties?.properties?.map((p: any) => ({ id: p.id, label: p.brand_name })) || []}
                                        onSelect={(val) => {
                                            setSelectedPropertyId(val as string);
                                            resetPage();
                                        }}
                                        itemName="label"
                                        placeholder="Select Property"
                                        extraClasses="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2"
                                    />
                                </div>
                            </div>
                        )}

                        {permission?.can_create && (
                            <Button variant="hero" className="h-10 px-4 flex items-center gap-2" onClick={openAdd}>
                                <Plus className="w-4 h-4" /> Add Vendor
                            </Button>
                        )}
                    </div>
                </div>

                <div className="border-b border-border flex">
                    <button
                        onClick={() => setActiveTab("vendors")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            activeTab === "vendors"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Vendors
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

                {activeTab === "vendors" && (
                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchInput}
                                    onChange={(val) => {
                                        setSearchInput(val);
                                        if (val.trim() === "") {
                                            setSearchQuery("");
                                            resetPage();
                                        }
                                    }}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        resetPage();
                                    }}
                                />

                                <GridToolbarSelect
                                    label="Type"
                                    value={typeFilter}
                                    onChange={(val) => {
                                        setTypeFilter(val);
                                        resetPage();
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...vendorTypeOptions
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(val) => {
                                        setStatusFilter(val);
                                        resetPage();
                                    }}
                                    options={VENDOR_STATUS_OPTIONS}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Vendors",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportVendorsSheet,
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
                                            disabled: isFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                    <AppDataGrid
                    scrollable={false}
                    columns={[
                        {
                            label: "Vendor ID",
                            headClassName: "text-center",
                            cellClassName: "text-center font-medium min-w-[90px]",
                            render: (v: Vendor) => (
                                <button
                                    type="button"
                                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                    onClick={() => openView(v, "view")}
                                    aria-label={`Open summary view for vendor ${formatModuleDisplayId("vendor", v.id)}`}
                                >
                                    {formatModuleDisplayId("vendor", v.id)}
                                </button>
                            ),
                        },
                        {
                            label: "Name",
                            key: "name",
                            cellClassName: "font-medium",
                        },
                        {
                            label: "Type",
                            cellClassName: "text-muted-foreground",
                            render: (v: Vendor) => formatReadableLabel(v.vendor_type) || "—",
                        },
                        {
                            label: "Contact",
                            cellClassName: "text-muted-foreground whitespace-nowrap",
                            render: (v: Vendor) => v.contact_no || "—",
                        },
                        {
                            label: "Status",
                            headClassName: "text-center",
                            cellClassName: "text-center",
                            render: (v: Vendor) => (
                                <GridBadge status={v.is_active ? "active" : "inactive"} statusType="toggle">
                                    {v.is_active ? "Active" : "Inactive"}
                                </GridBadge>
                            ),
                        },
                    ] satisfies ColumnDef[]}
                    data={vendorRows}
                    loading={isLoading || isFetching || isInitializing}
                    emptyText="No vendors found"
                    minWidth="600px"
                    actionLabel=""
                    actionClassName="text-center w-[60px]"
                    showActions={permission?.can_create}
                    actions={(v: Vendor) => (
                        <>
                            {permission?.can_create && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            onClick={() => openView(v, "edit")}
                                            aria-label={`View and edit details for vendor ${v.name}`}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View / Edit Details</TooltipContent>
                                </Tooltip>
                            )}
                        </>
                    )}
                    enablePagination={!!vendors?.pagination}
                    paginationProps={{
                        page,
                        totalPages: vendors?.pagination?.totalPages ?? 1,
                        setPage,
                        disabled: isFetching || !vendors,
                        totalRecords: vendors?.pagination?.totalItems ?? vendors?.pagination?.total ?? vendors?.data?.length ?? 0,
                        limit,
                        onLimitChange: handleLimitChange
                    }}
                        />
                    </div>
                    </div>
                )}

                {activeTab === "audit" && (
                    <div className="flex-1">
                        <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                            <div className="w-full">
                                <GridToolbar className="border-b-0">
                                    <GridToolbarRow className="gap-2">
                                        <GridToolbarSearch
                                            value={historySearchInput}
                                            onChange={setHistorySearchInput}
                                            onSearch={() => {
                                                setHistorySearchQuery(historySearchInput.trim());
                                                setMainAuditPage(1);
                                            }}
                                        />

                                        <GridToolbarSelect
                                            label="Action"
                                            value={historyActionFilter}
                                            onChange={(value) => {
                                                setHistoryActionFilter(value);
                                                setMainAuditPage(1);
                                            }}
                                            options={[
                                                { label: "All", value: "" },
                                                ...historyActionOptions.map((action) => ({
                                                    label: action,
                                                    value: action,
                                                })),
                                            ]}
                                        />

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
                                                    onClick: resetHistoryFilters,
                                                },
                                                {
                                                    key: "refresh",
                                                    label: "Refresh Data",
                                                    icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: refreshHistoryGrid,
                                                    disabled: globalAuditLogsFetching,
                                                },
                                            ]}
                                        />
                                    </GridToolbarRow>
                                </GridToolbar>
                            </div>
                            <div className="px-2 pb-2">
                                <AppDataGrid
                                    data={paginatedHistoryLogs}
                                    loading={globalAuditLogsLoading}
                                    rowKey={(audit: any) => audit.id}
                                    emptyText="No history logs found."
                                    showActions={false}
                                    enablePagination={true}
                                    paginationProps={{
                                        page: mainAuditPage,
                                        setPage: setMainAuditPage,
                                        totalPages: historyTotalPages,
                                        disabled: globalAuditLogsFetching,
                                        totalRecords: historyTotalRecords,
                                        limit: mainAuditLimit,
                                        onLimitChange: (limit) => {
                                            setMainAuditLimit(limit);
                                            setMainAuditPage(1);
                                        }
                                    }}
                                    columns={[
                                        {
                                            label: "Vendor ID",
                                            headClassName: "text-center w-[120px]",
                                            cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                            render: (audit: any) => audit.event_id ? formatModuleDisplayId("vendor", audit.event_id) : "—",
                                        },
                                        {
                                            label: "Action",
                                            headClassName: "text-center w-[140px]",
                                            cellClassName: "text-center font-medium min-w-[140px]",
                                            render: (audit: any) => getAuditActionBadge(audit.event_type),
                                        },
                                        {
                                            label: "Change",
                                            headClassName: "w-[320px]",
                                            cellClassName: "min-w-[320px] whitespace-normal text-primary/80 font-medium",
                                            render: (audit: any) => {
                                                let parsed = audit.details;
                                                if (typeof parsed === 'string') {
                                                    try { parsed = JSON.parse(parsed); } catch { }
                                                }
                                                return getFormattedAuditChanges(parsed);
                                            },
                                        },
                                        {
                                            label: "User",
                                            headClassName: "w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                                        },
                                        {
                                            label: "Date & Time",
                                            headClassName: "text-white w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => formatAppDateTime(audit.created_on),
                                        },
                                    ] as ColumnDef[]}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className={cn("w-full overflow-y-auto bg-background transition-all duration-300", sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-4xl sm:max-w-3xl")}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {mode === "add" || mode === "edit"
                                        ? `Vendor ${mode === "add" ? "" : editingVendor?.id ? `[#${formatModuleDisplayId("vendor", editingVendor.id)}]` : ""}`
                                        : `Vendor ${editingVendor?.id ? `[#${formatModuleDisplayId("vendor", editingVendor.id)}]` : ""}`
                                    }
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {mode === "add"         
                                        ? "Onboard New Supplier or Service Provider"
                                        : mode === "edit"
                                            ? "Modify Existing Vendor Contact or Tax Information"
                                            : "Comprehensive Overview of Vendor Relationship"}
                                </p>
                            </div>
                        </SheetHeader>

                        {mode === "view" ? (
                            <div className="space-y-4">
                                <div className="border-b border-border flex">
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

                                {sheetTab === "summary" && (
                                    <div className="space-y-4">
                                        <CardSectionView title="Basic Information" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Vendor Name" value={form.name} />
                                            <ViewField label="Primary Category" value={formatReadableLabel(form.vendor_type)} />
                                            <ViewField label="Relationship Status" value={form.is_active ? "Active" : "Inactive"} />
                                        </CardSectionView>

                                        <CardSectionView title="Contact Channels" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Direct Contact" value={form.contact_no} />
                                            <ViewField label="Official Email" value={form.email_id} />
                                            <ViewField label="Physical Address" value={form.address} />
                                        </CardSectionView>

                                        <CardSectionView title="Compliance & Tax" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="PAN Number" value={form.pan_no} />
                                            <ViewField label="GST Identification" value={form.gst_no} />
                                        </CardSectionView>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <AppDataGrid
                                        scrollable={false}
                                        columns={[

                                            {
                                                label: "Action",
                                                cellClassName: "whitespace-nowrap",
                                                render: (audit: any) => getAuditActionBadge(audit.event_type)
                                            },
                                            {
                                                label: "Updated By",
                                                cellClassName: "whitespace-nowrap",
                                                render: (audit: any) => `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || "System"
                                            },
                                            {
                                                label: "Date & Time",
                                                headClassName: "text-white w-[180px]",
                                                cellClassName: "text-muted-foreground min-w-[180px]",
                                                render: (audit: any) => formatAppDateTime(audit.created_on as string)
                                            },
                                            {
                                                label: "Changes",
                                                cellClassName: "min-w-[300px] py-2",
                                                render: (audit: any) => getVendorAuditChanges(audit)
                                            }
                                        ]}
                                        data={auditLogs?.data ?? []}
                                        loading={fetchingLogs}
                                        emptyText="No history logs found for this vendor"
                                        minWidth="700px"
                                        enablePagination={!!auditLogs?.pagination}
                                        paginationProps={{
                                            page: historyPage,
                                            totalPages: auditLogs?.pagination?.totalPages ?? 1,
                                            setPage: setHistoryPage,
                                            totalRecords: auditLogs?.pagination?.total ?? 0,
                                            limit: historyLimit,
                                            onLimitChange: handleHistoryLimitChange,
                                            disabled: fetchingLogs || !auditLogs
                                        }}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5 mt-6">
                                {(isSuperAdmin || isOwner) && mode === "add" && (
                                    <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-1 -mt-1 -mb-2">
                                        <Label>Property</Label>
                                        <NativeSelect
                                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={selectedPropertyId ?? ""}
                                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                                        >
                                            <option value="" disabled>Select Property</option>
                                            {!myPropertiesLoading &&
                                                myProperties?.properties?.map((property) => (
                                                    <option key={property.id} value={property.id}>
                                                        {property.brand_name}
                                                    </option>
                                                ))}
                                        </NativeSelect>
                                    </div>
                                )}

                                <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-5 [&>h3+*]:!mt-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Vendor Details
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormInput
                                            label="Name"
                                            field="name"
                                            value={form}
                                            setValue={setForm}
                                            errors={{ name: formErrors.name }}
                                            setErrors={() => {}}
                                            required
                                            className={cn(submitted && formErrors.name && "border-red-500")}
                                        />

                                        <FormInput
                                            label="Vendor Type"
                                            field="vendor_type"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={50}
                                        />

                                        <FormInput
                                            label="PAN"
                                            field="pan_no"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={20}
                                        />

                                        <FormInput
                                            label="GST"
                                            field="gst_no"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={20}
                                        />

                                        <FormInput
                                            label="Contact No"
                                            field="contact_no"
                                            value={form}
                                            setValue={setForm}
                                            errors={{ contact_no: formErrors.contact_no }}
                                            setErrors={() => {}}
                                            required
                                            prefixControl={
                                                <PhonePrefixSelect
                                                    value={form.contact_no_country_code ?? "+91"}
                                                    onValueChange={(countryCode) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            contact_no_country_code: countryCode,
                                                        }))
                                                    }
                                                    error={!!(submitted && formErrors.contact_no)}
                                                />
                                            }
                                        />

                                        <FormInput
                                            label="Email"
                                            field="email_id"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={150}
                                        />

                                        <div className="md:col-span-2">
                                            <FormInput
                                                label="Address"
                                                field="address"
                                                value={form}
                                                setValue={setForm}
                                                errors={{ address: formErrors.address }}
                                                setErrors={() => {}}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {mode === "edit" && (
                                        <div className="flex items-center gap-3 rounded-[5px] border border-primary/50 p-4 bg-accent/20">
                                            <Switch
                                                className="scale-90"
                                                checked={!!form.is_active}
                                                onCheckedChange={(checked) =>
                                                    setForm({
                                                        ...form,
                                                        is_active: checked
                                                    })
                                                }
                                            />

                                            <span className={cn(
                                                "px-3 py-1 rounded-[3px] text-xs font-bold tracking-wide",
                                                getStatusColor(form.is_active ? "active" : "inactive", "toggle")
                                            )}>
                                                {form.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                            {mode === "view" ? (
                                <Button
                                    variant="heroOutline"
                                    onClick={() => setSheetOpen(false)}
                                >
                                    Close
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="heroOutline"
                                        onClick={() => setSheetOpen(false)}
                                    >
                                        Cancel
                                    </Button>

                                    {permission?.can_create && (
                                        <Button variant="hero" onClick={handleSave}>
                                            {mode === "add"
                                                ? "Create Vendor"
                                                : "Update"}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
