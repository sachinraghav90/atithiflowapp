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
    SheetClose,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { FilterX, Pencil, RefreshCcw, Download, Plus, X } from "lucide-react";
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
import { DataGrid, DataGridCell, DataGridHead, DataGridHeader, DataGridRow } from "@/components/ui/data-grid";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { PlusCircle, Trash2 } from "lucide-react";

/* ---------------- Types ---------------- */
type Vendor = {
    id: string;
    property_id: string;
    vendor_sequence?: string | number;
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
    is_active: boolean;
    bank_accounts?: any[];
};

type VendorForm = {
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    contact_no_country_code?: string;
    email_id?: string;
    vendor_type?: string;
    is_active?: boolean;
    has_bank_details?: boolean;
    bank_accounts: any[];
};

const VENDOR_STATUS_OPTIONS = [
    { label: "All", value: "" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
];

const buildVendorPayload = (form: VendorForm, customVendorType: string, propertyId?: number) => {
    const finalVendorType = form.vendor_type === "Other" ? customVendorType : form.vendor_type;
    const payload: any = {
        name: form.name,
        pan_no: form.pan_no,
        gst_no: form.gst_no,
        address: form.address,
        contact_no: form.contact_no,
        email_id: form.email_id,
        vendor_type: finalVendorType,
        is_active: form.is_active,
        bank_accounts: form.has_bank_details ? form.bank_accounts : [],
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

    if (!before && !after) {
        return getFormattedAuditChanges(details);
    }

    const formattedDetails: any = { before: { ...before }, after: { ...after } };

    // Remove bank_accounts array, we will map it manually
    delete formattedDetails.before.bank_accounts;
    delete formattedDetails.after.bank_accounts;

    const beforeBanks = before?.bank_accounts || [];
    const afterBanks = after?.bank_accounts || [];
    const maxBanks = Math.max(beforeBanks.length, afterBanks.length);

    for (let i = 0; i < maxBanks; i++) {
        const bBefore = beforeBanks[i] || {};
        const bAfter = afterBanks[i] || {};
        const prefix = maxBanks > 1 ? `Bank ${i + 1} - ` : "";

        if (bBefore.bank_name !== bAfter.bank_name) {
            formattedDetails.before[`${prefix}Bank Name`] = bBefore.bank_name || "None";
            formattedDetails.after[`${prefix}Bank Name`] = bAfter.bank_name || "None";
        }
        if (bBefore.account_holder_name !== bAfter.account_holder_name) {
            formattedDetails.before[`${prefix}Account Holder`] = bBefore.account_holder_name || "None";
            formattedDetails.after[`${prefix}Account Holder`] = bAfter.account_holder_name || "None";
        }
        if (bBefore.account_number !== bAfter.account_number) {
            formattedDetails.before[`${prefix}Account Number`] = bBefore.account_number || "None";
            formattedDetails.after[`${prefix}Account Number`] = bAfter.account_number || "None";
        }
        if (bBefore.ifsc_code !== bAfter.ifsc_code) {
            formattedDetails.before[`${prefix}IFSC Code`] = bBefore.ifsc_code || "None";
            formattedDetails.after[`${prefix}IFSC Code`] = bAfter.ifsc_code || "None";
        }
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
    const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
    const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);

    const [form, setForm] = useState<VendorForm>({
        name: "",
        has_bank_details: false,
        bank_accounts: [],
    });
    const [customVendorType, setCustomVendorType] = useState("");
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

    const { data: auditLogs, isLoading: loadingLogs, isFetching: fetchingLogs } = useGetLogsQuery(
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
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchGlobalAuditLogs();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
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
        setCustomVendorType("");
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

        if (form.vendor_type === "Other" && !customVendorType.trim()) {
            errors.vendor_type = "Custom vendor type is required";
        }

        if (form.has_bank_details && form.bank_accounts) {
            form.bank_accounts.forEach((ba, idx) => {
                if (!ba.bank_name?.trim()) errors[`bank_name_${idx}`] = "Required";
                if (!ba.account_holder_name?.trim()) errors[`account_holder_name_${idx}`] = "Required";
                if (!ba.account_number?.trim()) errors[`account_number_${idx}`] = "Required";
                if (!ba.ifsc_code?.trim()) errors[`ifsc_code_${idx}`] = "Required";
                else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ba.ifsc_code)) errors[`ifsc_code_${idx}`] = "Invalid IFSC";
            });
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});

        const payload =
            mode === "add"
                ? buildVendorPayload(form, customVendorType, Number(selectedPropertyId))
                : buildVendorPayload(form, customVendorType);

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
                "Vendor ID": formatModuleDisplayId("vendor", v.vendor_sequence || v.id),
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
        const toastId = toast.loading("Refreshing data...");

        try {
            await refetchVendors();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
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

        const isPredefined = vendorTypeOptions.some(opt => opt.value === vendor.vendor_type);
        const finalVendorType = vendor.vendor_type && !isPredefined ? "Other" : vendor.vendor_type;
        setCustomVendorType(vendor.vendor_type && !isPredefined ? vendor.vendor_type : "");

        let bank_accounts = vendor.bank_accounts || [];
        if (bank_accounts.length === 0 && (vendor.bank_name || vendor.account_number || vendor.ifsc_code)) {
            // Fallback for old flat records
            bank_accounts = [{
                bank_name: vendor.bank_name || "",
                account_holder_name: vendor.account_holder_name || "",
                account_number: vendor.account_number || "",
                ifsc_code: vendor.ifsc_code || "",
                qr_code: vendor.qr_code || "",
            }];
        }

        setForm({
            name: vendor.name,
            pan_no: vendor.pan_no,
            gst_no: vendor.gst_no,
            address: vendor.address,
            contact_no: vendor.contact_no,
            email_id: vendor.email_id,
            vendor_type: finalVendorType,
            is_active: vendor.is_active,
            has_bank_details: bank_accounts.length > 0,
            bank_accounts: bank_accounts,
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
                                    aria-label={`Open summary view for vendor ${formatModuleDisplayId("vendor", v.vendor_sequence || v.id)}`}
                                >
                                    {formatModuleDisplayId("vendor", v.vendor_sequence || v.id)}
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
                                    loading={globalAuditLogsLoading || globalAuditLogsFetching}
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
                                            render: (audit: any) => getVendorAuditChanges(audit),
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
                <SheetContent 
                    side="right" 
                    className={cn(
                        "w-full flex flex-col p-0 bg-background transition-all duration-300", 
                        sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-5xl sm:max-w-4xl"
                    )}
                    hideClose
                >
                    <div className="flex-1 overflow-y-auto bg-background">
                        <SheetHeader className="px-6 py-4 border-b border-border bg-background relative">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {mode === "add" || mode === "edit"
                                        ? `Vendor ${mode === "add" ? "" : editingVendor?.id ? `[#${formatModuleDisplayId("vendor", editingVendor.vendor_sequence || editingVendor.id)}]` : ""}`
                                        : `Vendor ${editingVendor?.id ? `[#${formatModuleDisplayId("vendor", editingVendor.vendor_sequence || editingVendor.id)}]` : ""}`
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
                            <SheetClose className="absolute right-4 top-4 rounded-md border-2 border-primary bg-background text-primary hover:bg-primary hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none h-5 w-5 flex items-center justify-center shadow-sm z-50">
                                <X className="h-4 w-4 stroke-[2.5]" />
                                <span className="sr-only">Close</span>
                            </SheetClose>
                        </SheetHeader>

                        <div className="px-6 pb-6 pt-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-1"
                            >

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

                                        {form.bank_accounts && form.bank_accounts.length > 0 ? (
                                            <CardSectionView
                                                title="Bank Details"
                                                titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal"
                                                className="space-y-3"
                                            >
                                                <div className="editable-grid-compact border rounded-[5px] overflow-hidden flex flex-col">
                                                    <div className="overflow-x-auto w-full bg-background">
                                                        <div className="w-full min-w-[600px]">
                                                            <DataGrid>
                                                                <DataGridHeader>
                                                                    <DataGridHead>Bank Name</DataGridHead>
                                                                    <DataGridHead>Account Holder</DataGridHead>
                                                                    <DataGridHead>Account No.</DataGridHead>
                                                                    <DataGridHead>IFSC</DataGridHead>
                                                                    <DataGridHead>QR Code</DataGridHead>
                                                                </DataGridHeader>
                                                                <tbody>
                                                                    {form.bank_accounts.map((ba, idx) => (
                                                                        <DataGridRow key={idx}>
                                                                            <DataGridCell>{ba.bank_name || "-"}</DataGridCell>
                                                                            <DataGridCell>{ba.account_holder_name || "-"}</DataGridCell>
                                                                            <DataGridCell>{ba.account_number ? "****" + String(ba.account_number).slice(-4) : "-"}</DataGridCell>
                                                                            <DataGridCell>{ba.ifsc_code || "-"}</DataGridCell>
                                                                            <DataGridCell>
                                                                                {ba.qr_code ? (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <button 
                                                                                                type="button" 
                                                                                                onClick={() => {
                                                                                                    setSelectedQrCode(ba.qr_code);
                                                                                                    setQrPreviewOpen(true);
                                                                                                }}
                                                                                                className="cursor-pointer inline-block p-0 border-0 bg-transparent"
                                                                                            >
                                                                                                <img src={ba.qr_code} alt="QR Code" className="w-10 h-10 object-contain rounded border border-border/50 bg-white hover:opacity-80 transition-opacity" />
                                                                                            </button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>Click to View</TooltipContent>
                                                                                    </Tooltip>
                                                                                ) : "-"}
                                                                            </DataGridCell>
                                                                        </DataGridRow>
                                                                    ))}
                                                                </tbody>
                                                            </DataGrid>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardSectionView>
                                        ) : (
                                            <CardSectionView title="Bank Details" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal">
                                                <div className="text-sm text-muted-foreground italic">No bank details available.</div>
                                            </CardSectionView>
                                        )}
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
                                        loading={loadingLogs || fetchingLogs}
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
                            <div className="space-y-4">
                                {(isSuperAdmin || isOwner) && mode === "add" && (
                                    <div className="w-full sm:w-64 space-y-1">
                                        <Label className="text-foreground">Property</Label>
                                        <NativeSelect
                                            className="w-full h-11 rounded-[3px] border border-border/70 bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
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

                                <div className="rounded-[5px] border border-primary/50 bg-background p-5 shadow-sm space-y-5 [&>h3+*]:!mt-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Vendor Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        <FormInput
                                            label="Name"
                                            field="name"
                                            value={form}
                                            setValue={setForm}
                                            errors={{ name: formErrors.name }}
                                            setErrors={() => {}}
                                            required
                                            maxLength={100}
                                        />

                                        <FormInput
                                            label="Email"
                                            field="email_id"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={150}
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
                                            label="PAN"
                                            field="pan_no"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={20}
                                        />

                                        <div className="space-y-1">
                                            <Label className="text-foreground">Vendor Type</Label>
                                            <NativeSelect
                                                value={form.vendor_type || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm({ ...form, vendor_type: val });
                                                    if (val !== "Other") setCustomVendorType("");
                                                }}
                                                className={cn("h-11 w-full rounded-[3px] border border-border/70 bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0", submitted && formErrors.vendor_type && "border-red-500")}
                                            >
                                                <option value="">Select a vendor type</option>
                                                {vendorTypeOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                                <option value="Other">Other</option>
                                            </NativeSelect>
                                            {submitted && formErrors.vendor_type && <span className="text-xs text-red-500">{formErrors.vendor_type}</span>}
                                        </div>

                                        <FormInput
                                            label="GST"
                                            field="gst_no"
                                            value={form}
                                            setValue={setForm}
                                            maxLength={20}
                                        />

                                        {form.vendor_type === "Other" && (
                                            <div className="space-y-1">
                                                <Input
                                                    placeholder="Enter custom vendor type"
                                                    value={customVendorType}
                                                    onChange={(e) => setCustomVendorType(e.target.value)}
                                                    className={cn("h-11 w-full rounded-[3px] border border-border/70 bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0", submitted && formErrors.vendor_type && "border-red-500")}
                                                    maxLength={50}
                                                />
                                            </div>
                                        )}

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
                                        <div className="flex items-center gap-3 mt-4">
                                            <Label className="text-sm font-semibold">Status</Label>
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

                                <VendorBankGrid form={form} setForm={setForm} formErrors={formErrors} setFormErrors={setFormErrors} viewMode={mode === "view"} />
                            </div>
                        )}

                            </motion.div>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3">
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
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={qrPreviewOpen} onOpenChange={setQrPreviewOpen}>
                <DialogContent className="max-w-sm p-4">
                    <DialogHeader>
                        <DialogTitle>QR Code Preview</DialogTitle>
                    </DialogHeader>
                    {selectedQrCode && (
                        <div className="flex items-center justify-center p-4 bg-white/50 rounded-lg">
                            <img src={selectedQrCode} alt="Full QR Code" className="w-full max-w-[250px] object-contain rounded-md shadow-sm border border-border" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ================= VENDOR BANK GRID COMPONENT ================= */

function VendorBankGrid({ form, setForm, formErrors, setFormErrors, viewMode }: any) {

    const updateField = (idx: number, field: string, val: string) => {
        setForm((prev: any) => {
            const arr = [...(prev.bank_accounts || [])];
            arr[idx] = { ...arr[idx], [field]: val };
            return { ...prev, bank_accounts: arr };
        });
        if (formErrors[`${field}_${idx}`]) {
            setFormErrors((prev: any) => ({ ...prev, [`${field}_${idx}`]: undefined }));
        }
    };

    const removeRow = (idx: number) => {
        setForm((prev: any) => {
            const arr = [...(prev.bank_accounts || [])];
            arr.splice(idx, 1);
            return {
                ...prev,
                has_bank_details: arr.length > 0,
                bank_accounts: arr,
            };
        });
    };

    const addRow = () => {
        setForm((prev: any) => ({
            ...prev,
            has_bank_details: true,
            bank_accounts: [
                ...(prev.bank_accounts || []),
                {
                    bank_name: "",
                    account_holder_name: "",
                    account_number: "",
                    ifsc_code: "",
                    qr_code: ""
                }
            ]
        }));
    };

    const toggleHasBankDetails = (val: boolean) => {
        setForm((prev: any) => ({
            ...prev,
            has_bank_details: val,
            bank_accounts: val && (!prev.bank_accounts || prev.bank_accounts.length === 0) 
                ? [{ bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "", qr_code: "" }] 
                : prev.bank_accounts
        }));
    };

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm mt-4">
            <h3 className="text-sm font-semibold text-primary/90">
                Bank Details (Optional)
            </h3>

            <div className="flex items-center gap-3">
                <Switch
                    disabled={viewMode}
                    checked={form.has_bank_details}
                    onCheckedChange={toggleHasBankDetails}
                />
                <Label className="text-foreground">Add Bank Details</Label>
            </div>

            {form.has_bank_details && (
                <div className="editable-grid-compact border rounded-[5px] overflow-hidden flex flex-col">
                    <div className="overflow-x-auto w-full bg-background border-b border-border">
                        <div className="w-full min-w-[860px]">
                            <DataGrid>
                                <DataGridHeader>
                                    <DataGridHead>Bank Name *</DataGridHead>
                                    <DataGridHead>Account Holder *</DataGridHead>
                                    <DataGridHead>Account Number *</DataGridHead>
                                    <DataGridHead>IFSC Code *</DataGridHead>
                                    <DataGridHead className="w-24 text-center">QR Code</DataGridHead>
                                    {!viewMode && form.bank_accounts?.length > 1 && (
                                        <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                    )}
                                </DataGridHeader>

                                <tbody>
                                    {(form.bank_accounts || []).map((ba: any, idx: number) => (
                                        <DataGridRow key={idx}>
                                            <DataGridCell>
                                                <TableInput
                                                    value={ba.bank_name || ""}
                                                    error={formErrors[`bank_name_${idx}`]}
                                                    viewMode={viewMode}
                                                    onChange={(v: string) => updateField(idx, "bank_name", v)}
                                                    maxLength={150}
                                                />
                                            </DataGridCell>
                                            <DataGridCell>
                                                <TableInput
                                                    value={ba.account_holder_name || ""}
                                                    error={formErrors[`account_holder_name_${idx}`]}
                                                    viewMode={viewMode}
                                                    onChange={(v: string) => updateField(idx, "account_holder_name", v)}
                                                    maxLength={150}
                                                />
                                            </DataGridCell>
                                            <DataGridCell>
                                                <TableInput
                                                    value={ba.account_number || ""}
                                                    error={formErrors[`account_number_${idx}`]}
                                                    viewMode={viewMode}
                                                    onChange={(v: string) => updateField(idx, "account_number", v)}
                                                    maxLength={50}
                                                />
                                            </DataGridCell>
                                            <DataGridCell>
                                                <TableInput
                                                    value={ba.ifsc_code || ""}
                                                    error={formErrors[`ifsc_code_${idx}`]}
                                                    viewMode={viewMode}
                                                    transform={(v: string) => v.toUpperCase()}
                                                    onChange={(v: string) => updateField(idx, "ifsc_code", v)}
                                                    maxLength={20}
                                                />
                                            </DataGridCell>
                                            <DataGridCell className="text-center flex justify-center">
                                                <div className="relative w-10 h-10 rounded-[3px] border border-border/60 bg-background overflow-hidden group mx-auto">
                                                    {ba.qr_code ? (
                                                        <>
                                                            <img src={ba.qr_code} className="absolute inset-0 w-full h-full object-contain p-0.5" />
                                                            {!viewMode && (
                                                                <button type="button" onClick={() => updateField(idx, "qr_code", "")} className="absolute top-0 right-0 bg-red-500 rounded-bl text-white text-[8px] w-4 h-4 flex items-center justify-center shadow z-10 opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-accent/50 text-center">
                                                            <span className="text-[8px] font-medium leading-none">QR</span>
                                                        </div>
                                                    )}
                                                    {!ba.qr_code && !viewMode && (
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const reader = new FileReader();
                                                                reader.onload = () => updateField(idx, "qr_code", reader.result as string);
                                                                reader.readAsDataURL(file);
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </DataGridCell>
                                            {!viewMode && form.bank_accounts?.length > 1 && (
                                                <DataGridCell className="text-center">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors mx-auto"
                                                        aria-label="Remove bank account row"
                                                        onClick={() => removeRow(idx)}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </DataGridCell>
                                            )}
                                        </DataGridRow>
                                    ))}
                                </tbody>
                            </DataGrid>
                        </div>
                    </div>
                    {!viewMode && (
                        <div className="bg-muted/10 p-2 border-t border-border mt-auto">
                            <button
                                type="button"
                                onClick={addRow}
                                className="flex items-center text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                Add Account
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TableInput({
    value,
    error,
    onChange,
    viewMode,
    transform,
    maxLength
}: any) {
    return (
        <ValidationTooltip
            isValid={!error}
            message={typeof error === "string" ? error : error?.message || "Required field"}
        >
            <Input
                disabled={viewMode}
                value={value}
                className={`h-10 w-full rounded-[3px] border border-input bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary ${error ? "border-red-500" : ""}`}
                onChange={(e) => {
                    let val = e.target.value;
                    if (transform) val = transform(val);
                    onChange(val);
                }}
                maxLength={maxLength}
            />
        </ValidationTooltip>
    );
}
