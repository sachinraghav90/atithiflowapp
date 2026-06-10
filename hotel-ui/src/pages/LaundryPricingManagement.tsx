import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useCreateLaundryPricingMutation, useGetPropertyLaundryPricingQuery, useUpdateLaundryPricingMutation, useGetLogsQuery, useGetLogsByTableQuery } from "@/redux/services/hmsApi";
import { formatAppDateTime } from "@/utils/dateFormat";
import { formatReadableLabel } from "@/utils/formatString";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { usePermission } from "@/rbac/usePermission";
import { useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { AppDataGrid, DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { FilterX, RefreshCcw, Download, Pencil, Trash2, Plus, PlusCircle, ClipboardList, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { toast } from "react-toastify";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { exportToExcel } from "@/utils/exportToExcel";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { GridBadge } from "@/components/ui/grid-badge";
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import { getFormattedAuditChanges, getAuditActionBadge, formatAuditActionText, getAuditChangePlainText } from "@/utils/auditUtils";

/* ---------------- Types ---------------- */
type LaundryItem = {
    id: string;
    property_id: string;
    item_name: string;
    description?: string | null;
    item_rate: string;
    system_generated: boolean;
    is_active: boolean;
};

type CreateLaundryForm = {
    itemName: string;
    description?: string;
    itemRate: number | "";
    isActive?: boolean;
    touched?: {
        itemName?: boolean;
        itemRate?: boolean;
    };
};

type LaundryFormState = {
    item_name: string;
    description: string;
    item_rate: string;
    is_active: boolean;
};

const DUPLICATE_ITEMS_MESSAGE = "Duplicate Items Not Allowed";

function createEmptyLaundryPriceForm(): LaundryFormState {
    return {
        item_name: "",
        description: "",
        item_rate: "",
        is_active: true,
    };
}

function createEmptyLaundryCreateRow(): CreateLaundryForm {
    return {
        itemName: "",
        description: "",
        itemRate: "",
        isActive: true,
        touched: {},
    };
}

function normalizeLaundryName(value?: string | null) {
    return value?.trim().toLowerCase() ?? "";
}

const STATUS_OPTIONS = [
    { label: "All", value: "" },
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
];

function getLaundryPricingAuditChanges(audit: any, plainText = false) {
    if (audit.event_type === "CREATE") {
        if (plainText) return "Pricing: Created";
        return (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Pricing:</span> Created
            </div>
        );
    }

    let details = audit.details;
    if (typeof details === "string") {
        try { details = JSON.parse(details); } catch (e) { }
    }
    
    const valueFormatters = {
        "item_rate": (v: any) => `₹${String(v).replace(/^₹+/, "").trim()}`,
        "is_active": (v: any) => (v ? "Active" : "Inactive"),
        "Rate (₹)": (v: any) => `₹${String(v).replace(/^₹+/, "").trim()}`,
    };
    
    if (plainText) {
        return getAuditChangePlainText(details, valueFormatters);
    }
    return getFormattedAuditChanges(details, valueFormatters);
}

/* ---------------- Component ---------------- */
export default function LaundryPricingManagement() {
    /* ---------------- State ---------------- */
    const [items, setItems] = useState<LaundryItem[]>([]);

    // UI STates
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"edit" | "view" | "bulk_add">("view");
    const [selectedItem, setSelectedItem] = useState<LaundryItem | null>(null);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    // Form States
    const [form, setForm] = useState<LaundryFormState>(createEmptyLaundryPriceForm);

    const [createRows, setCreateRows] = useState<CreateLaundryForm[]>([
        createEmptyLaundryCreateRow()
    ]);

    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [showCreateErrors, setShowCreateErrors] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLimit, setHistoryLimit] = useState(10);

    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, statusFilter, searchQuery],
    });

    const [mainTab, setMainTab] = useState<"pricing" | "audit">("pricing");
    const [mainAuditPage, setMainAuditPage] = useState(1);
    const [mainAuditLimit, setMainAuditLimit] = useState(10);
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const {
        data: globalAuditLogs,
        isLoading: globalAuditLogsLoading,
        isFetching: globalAuditLogsFetching,
        refetch: refetchGlobalAuditLogs
    } = useGetLogsByTableQuery({
        tableName: "laundry",
        page: mainAuditPage,
        limit: mainAuditLimit,
    }, {
        skip: !isLoggedIn || mainTab !== "audit"
    });

    const paginatedHistoryLogs = useMemo(() => {
        let rows = globalAuditLogs?.data ?? [];
        if (historySearchQuery) {
            const lowerQuery = historySearchQuery.toLowerCase();
            rows = rows.filter((r: any) =>
                r.event_type?.toLowerCase().includes(lowerQuery) ||
                r.user_name?.toLowerCase().includes(lowerQuery) ||
                r.user_first_name?.toLowerCase().includes(lowerQuery) ||
                (r.event_id && formatModuleDisplayId("laundry_pricing", r.event_id).toLowerCase().includes(lowerQuery))
            );
        }
        if (historyActionFilter) {
            rows = rows.filter((r: any) => r.event_type?.toUpperCase() === historyActionFilter.toUpperCase());
        }
        return rows;
    }, [globalAuditLogs?.data, historySearchQuery, historyActionFilter]);

    const historyTotalRecords = globalAuditLogs?.pagination?.totalItems ?? globalAuditLogs?.pagination?.total ?? 0;
    const historyTotalPages = globalAuditLogs?.pagination?.totalPages ?? 1;

    const historyActionOptions = useMemo(() => ["CREATE", "UPDATE", "DELETE"], []);

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
            return {
                "Laundry ID": formatModuleDisplayId("laundry_pricing", audit.event_id),
                "Action": formatAuditActionText(audit.event_type),
                "Change": getLaundryPricingAuditChanges(audit, true),
                "User": `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                "Date & Time": formatAppDateTime(audit.created_on),
            };
        });
        exportToExcel(formatted, "Laundry-Pricing-History.xlsx");
        toast.success("Export completed");
    };

    const { 
        myProperties, 
        isInitializing,
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const {
        data,
        isLoading: laundryLoading,
        isFetching: laundryFetching,
        refetch: refetchLaundryPricing
    } = useGetPropertyLaundryPricingQuery({ 
        propertyId: selectedPropertyId, 
        page, 
        limit,
        search: searchQuery,
        status: statusFilter
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    
    const { data: auditLogs, isLoading: auditLoading } = useGetLogsQuery(
        {
            tableName: "laundry",
            eventId: selectedItem?.id,
            page: historyPage,
            limit: historyLimit,
        },
        { skip: !isLoggedIn || !selectedItem?.id || sheetTab !== "history" }
    );
    const allLaundryItems = data?.data?.data || [];

    const [createLaundryPrice] = useCreateLaundryPricingMutation()
    const [updateLaundryPricing] = useUpdateLaundryPricingMutation()

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (Array.isArray(data?.data?.data)) {
            setItems(data.data.data);
            return;
        }
        setItems([]);
    }, [data]);

    const hasExistingLaundryName = (name: string, excludeId?: string) =>
        allLaundryItems.some(
            (existing) =>
                normalizeLaundryName(existing.item_name) === normalizeLaundryName(name) &&
                existing.id !== excludeId
        );

    /* ---------------- Handlers ---------------- */
    const openSheet = (item: LaundryItem | null, newMode: "edit" | "view" | "bulk_add") => {
        setMode(newMode);
        setSelectedItem(item);
        setSheetTab("summary");
        setFormErrors({});
        setSubmitted(false);

        if (newMode === "edit" || newMode === "view") {
            if (item) {
                setForm({
                    item_name: item.item_name,
                    description: item.description || "",
                    item_rate: item.item_rate,
                    is_active: item.is_active
                });
            }
        } else if (newMode === "bulk_add") {
            setCreateRows([createEmptyLaundryCreateRow()]);
            setShowCreateErrors(false);
        }

        setSheetOpen(true);
    };

    const handleSave = async () => {
        setSubmitted(true);
        if (!selectedPropertyId) return;

        if (mode === "edit") {
            const errors: Record<string, string> = {};
            if (!form.item_name.trim()) errors.item_name = "Item name is required";
            if (!form.item_rate || Number(form.item_rate) <= 0) errors.item_rate = "Valid rate is required";
            if (form.item_name.trim() && hasExistingLaundryName(form.item_name, selectedItem?.id)) {
                errors.item_name = "Item name already exists";
            }

            if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                return;
            }

            const payload = {
                property_id: Number(selectedPropertyId),
                updates: [
                    {
                        ...(mode === "edit" ? { id: Number(selectedItem?.id) } : {}),
                        itemName: form.item_name,
                        description: form.description || null,
                        itemRate: Number(form.item_rate),
                        is_active: form.is_active
                    }
                ]
            };

            const promise = updateLaundryPricing(payload).unwrap();

            toast.promise(promise, {
                pending: "Updating item...",
                success: "Item updated successfully",
                error: "Failed to save item"
            });

            try {
                await promise;
                setSheetOpen(false);
            } catch (err) {
                console.error("Save failed", err);
            }
        }

        // Validation/Save for Bulk Add
        else if (mode === "bulk_add") {
            setShowCreateErrors(true);
            const hasError = createRows.some((r, i) => {
                const err = getCreateRowErrors(r, i);
                return err.itemName || err.itemRate;
            });

            if (hasError) return;

            const payload = {
                property_id: Number(selectedPropertyId),
                items: createRows
                    .filter(r => r.itemName?.trim())
                    .map(r => ({
                        itemName: r.itemName.trim(),
                        description: r.description || null,
                        itemRate: Number(r.itemRate || 0),
                        isActive: r.isActive !== false,
                    }))
            };

            try {
                await createLaundryPrice(payload).unwrap();
                toast.success("Items created successfully");
                setSheetOpen(false);
            } catch (err: any) {
                console.error("Bulk create error:", err);
                const msg = err?.data?.message || err?.message || "";
                if (!(msg.includes("unique constraint") || msg.includes("already exists") || msg.toLowerCase().includes("duplicate"))) {
                    toast.error("Process Failed: Could not create laundry items at this time.");
                }
            }
        }
    };

    const addCreateRow = () => {
        setCreateRows(prev => [...prev, createEmptyLaundryCreateRow()]);
    };

    const removeCreateRow = (index: number) => {
        setCreateRows(prev => prev.filter((_, i) => i !== index));
    };

    const updateCreateRow = (index: number, patch: Partial<CreateLaundryForm>) => {
        setCreateRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    };

    function getCreateRowErrors(row: CreateLaundryForm, index: number) {
        const name = normalizeLaundryName(row.itemName);
        const itemNameRequired = !name;
        const itemRateRequired = !row.itemRate || Number(row.itemRate) <= 0;

        const duplicateInForm = !!(name && createRows.some((r, i) => i !== index && normalizeLaundryName(r.itemName) === name));
        const duplicateExisting = !!(name && hasExistingLaundryName(name));

        return {
            itemName: itemNameRequired || duplicateInForm || duplicateExisting,
            itemRate: itemRateRequired,
            duplicateInForm,
            duplicateExisting,
            itemNameMessage: duplicateInForm
                ? DUPLICATE_ITEMS_MESSAGE
                : duplicateExisting
                    ? DUPLICATE_ITEMS_MESSAGE
                    : "Required field"
        };
    }

    const pathname = useLocation().pathname;
    const { permission } = usePermission(pathname);

    const refreshTable = async () => {
        if (laundryFetching) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchLaundryPricing();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const exportPricesSheet = () => {
        if (!items.length) return toast.info("No data to export");
        const formatted = items.map(item => ({
            "Laundry ID": formatModuleDisplayId("laundry_pricing", item.id),
            "Item": item.item_name,
            "Description": item.description || "-",
            "Rate": `Rs ${item.item_rate}`,
            "Status": item.is_active ? "Active" : "Inactive"
        }));
        exportToExcel(formatted, "Laundry_Pricing.xlsx");
        toast.success("Export completed");
    };

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        resetPage();
    };

    const totalRecords = data?.data?.pagination?.total ?? 0;
    const totalPages = data?.data?.pagination?.totalPages ?? 1;
    const paginatedItems = items;

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages, setPage]);

    const laundryColumns = useMemo<ColumnDef<LaundryItem>[]>(() => [
        {
            label: "Laundry ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (item) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => openSheet(item, "view")}
                >
                    {formatModuleDisplayId("laundry_pricing", item.id)}
                </button>
            ),
        },
        {
            label: "Item",
            cellClassName: "font-semibold text-foreground",
            render: (item) => item.item_name,
        },
        {
            label: "Description",
            cellClassName: "text-muted-foreground",
            render: (item) => item.description || "-",
        },
        {
            label: "Rate",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (item) => (
                <span className="inline-flex min-w-[96px] justify-center rounded-[3px] bg-muted/40 px-3 py-1 text-sm font-semibold">
                    Rs {item.item_rate}
                </span>
            ),
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (item) => (
                <GridBadge
                    status={item.is_active ? "active" : "inactive"}
                    statusType="toggle"
                    className="min-w-[88px]"
                >
                    {item.is_active ? "Active" : "Inactive"}
                </GridBadge>
            ),
        },
    ], [items]);

    const auditColumns = useMemo<ColumnDef[]>(() => [

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
            headClassName: "text-white",
            cellClassName: "text-muted-foreground whitespace-nowrap min-w-[130px]",
            render: (audit: any) => formatAppDateTime(audit.created_on as string)
        },
        {
            label: "Changes",
            cellClassName: "min-w-[300px] py-2",
            render: (audit: any) => getLaundryPricingAuditChanges(audit)
        }
    ], [historyPage, historyLimit, selectedItem]);

    /* ---------------- UI ---------------- */
    return (
        <div className="flex flex-col bg-background">
            <section className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold leading-tight">Laundry Pricing</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure laundry item rates and availability
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {(isSuperAdmin || isOwner) && (
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
                            <div className="flex gap-2">
                                <Button variant="hero" className="h-10 px-4 flex items-center gap-2" onClick={() => openSheet(null, "bulk_add")}>
                                    <Plus className="w-4 h-4" /> Add Laundry Items
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-b border-border flex">
                    <button
                        onClick={() => setMainTab("pricing")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            mainTab === "pricing"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Pricing
                    </button>
                    <button
                        onClick={() => setMainTab("audit")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            mainTab === "audit"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        History
                    </button>
                </div>

                {mainTab === "pricing" && (
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
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        resetPage();
                                    }}
                                    options={STATUS_OPTIONS}
                                />

                                <GridToolbarSpacer />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Prices",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportPricesSheet,
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
                                            disabled: laundryFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            scrollable={false}
                            density="compact"
                            columns={laundryColumns}
                            data={paginatedItems}
                            rowKey={(item) => item.id}
                            loading={laundryLoading || laundryFetching || isInitializing}
                            emptyText="No laundry items found"
                            actionLabel=""
                            actionClassName="text-center w-[60px]"
                            actions={(item) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-primary-foreground transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            aria-label={`Update laundry item ${item.item_name}`}
                                            onClick={() => openSheet(item, "edit")}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Update Item</TooltipContent>
                                </Tooltip>
                            )}
                            enablePagination
                            paginationProps={{
                                page,
                                totalPages,
                                setPage,
                                totalRecords,
                                limit,
                                onLimitChange: handleLimitChange,
                                disabled: laundryLoading || laundryFetching,
                            }}
                        />
                    </div>
                </div>
                )}

                {mainTab === "audit" && (
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
                                            label: "Laundry ID",
                                            headClassName: "text-center w-[120px]",
                                            cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                            render: (audit: any) => audit.event_id ? formatModuleDisplayId("laundry_pricing", audit.event_id) : "—",
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
                                            render: (audit: any) => getLaundryPricingAuditChanges(audit, false),
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
                                    ] as ColumnDef<any>[]}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Combined View/Add/Edit/Bulk Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className={cn(
                        "w-full flex flex-col p-0 bg-background transition-all duration-300",
                        mode === "bulk_add" ? "sm:max-w-4xl" : sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-3xl sm:max-w-2xl"
                    )}
                    hideClose
                >
                    <div className="flex-1 overflow-y-auto bg-background">
                        <SheetHeader className="px-6 py-4 border-b border-border bg-background relative">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {mode === "view" ? "Laundry Pricing" : mode === "edit" ? "Update Laundry Pricing" : "Add Laundry Items"}
                                    {(mode === "view" || mode === "edit") && selectedItem?.id && (
                                        <span className="ml-2">
                                            {`[#${formatModuleDisplayId("laundry_pricing", selectedItem.id)}]`}
                                        </span>
                                    )}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {mode === "view" ? "Detailed Information about laundry item" : mode === "edit" ? "Modify Existing Laundry Item Rate and Details" : "Register New Laundry Items and Rates"}
                                </p>
                            </div>
                            <SheetClose className="absolute right-4 top-4 rounded-md border-2 border-primary bg-background text-primary hover:bg-primary hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-5 w-5 flex items-center justify-center shadow-sm z-50">
                                <X className="h-4 w-4 stroke-[2.5]" />
                                <span className="sr-only">Close</span>
                            </SheetClose>
                        </SheetHeader>

                        <div className="px-6 pb-4 pt-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >

                        {mode === "view" && selectedItem && (
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
                                        <CardSectionView title="Laundry Item Details" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Item Name" value={selectedItem.item_name} />
                                            <ViewField label="Item Rate" value={`₹ ${selectedItem.item_rate}`} />
                                            <ViewField label="Status" value={selectedItem.is_active ? "Active" : "Inactive"} />
                                        </CardSectionView>

                                        <CardSectionView title="Description" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 gap-y-4">
                                            <ViewField label="Description" value={selectedItem.description || "No description provided."} />
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
                                            emptyText="No history logs available yet."
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

                        {mode === "edit" && (
                            <div className="space-y-4">
                                <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Edit Laundry Pricing
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground" htmlFor="item-name">Item Name *</Label>
                                            <Input
                                                id="item-name"
                                                className={cn("h-11 bg-background border-primary/20 shadow-none focus-visible:ring-1 focus-visible:ring-primary", submitted && formErrors.item_name && "border-red-500")}
                                                value={form.item_name}
                                                onChange={(e) => {
                                                    setForm(p => ({ ...p, item_name: normalizeTextInput(e.target.value) }));
                                                    setFormErrors(p => ({ ...p, item_name: "" }));
                                                }}
                                                disabled={mode === "edit" && selectedItem?.system_generated}
                                            />
                                            {submitted && formErrors.item_name && <p className="text-[10px] font-medium text-red-500 mt-0.5">{formErrors.item_name}</p>}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-foreground" htmlFor="rate">Rate (₹) *</Label>
                                                <Input
                                                    id="rate"
                                                    placeholder="0.00"
                                                    className={cn("h-11 bg-background border-primary/20 font-bold shadow-none focus-visible:ring-1 focus-visible:ring-primary", submitted && formErrors.item_rate && "border-red-500")}
                                                    value={form.item_rate}
                                                    onChange={(e) => {
                                                        setForm(p => ({ ...p, item_rate: normalizeNumberInput(e.target.value) }));
                                                        setFormErrors(p => ({ ...p, item_rate: "" }));
                                                    }}
                                                />
                                                {submitted && formErrors.item_rate && <p className="text-[10px] font-medium text-red-500 mt-0.5">{formErrors.item_rate}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-foreground">Status</Label>
                                                <div className="flex items-center gap-3 h-11 px-3 bg-background border border-primary/20 rounded-md">
                                                    <Switch
                                                        id="item-active"
                                                        checked={form.is_active}
                                                        onCheckedChange={(val) => setForm(p => ({ ...p, is_active: val }))}
                                                    />
                                                    <Label className="text-sm font-semibold text-foreground cursor-pointer" htmlFor="item-active">
                                                        {form.is_active ? "Active" : "Inactive"}
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-foreground" htmlFor="description">Description</Label>
                                            <textarea
                                                id="description"
                                                placeholder="Enter a brief description of the laundry service..."
                                                className="w-full min-h-[100px] bg-background border border-primary/20 rounded-md px-3 py-2 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                                value={form.description}
                                                onChange={(e) => setForm(p => ({ ...p, description: normalizeTextInput(e.target.value) }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "bulk_add" && (
                            <div className="space-y-4">
                                {(isSuperAdmin || isOwner) && (
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
                                <div className="editable-grid-compact overflow-hidden rounded-[5px] border border-border bg-background/50">
                                    <div className="grid-scroll-x w-full border-b border-border bg-background/50">
                                        <div className="w-full min-w-[720px]">
                                            <DataGrid>
                                                <DataGridHeader>
                                                    <DataGridHead>Item Name *</DataGridHead>
                                                    <DataGridHead>Description</DataGridHead>
                                                    <DataGridHead className="w-32 text-center">Rate (₹) *</DataGridHead>
                                                    {createRows.length > 1 && (
                                                        <DataGridHead className="w-16 text-center">Action</DataGridHead>
                                                    )}
                                                </DataGridHeader>

                                                <tbody>
                                                    {createRows.map((row, index) => {
                                                        const errors = getCreateRowErrors(row, index);
                                                        const isItemNameInvalid =
                                                            (showCreateErrors && errors.itemName) ||
                                                            (!!row.touched?.itemName && (errors.duplicateInForm || errors.duplicateExisting));
                                                        const isItemRateInvalid = showCreateErrors && errors.itemRate;

                                                        return (
                                                            <DataGridRow key={index}>
                                                                {/* NAME */}
                                                                <DataGridCell>
                                                                    <ValidationTooltip
                                                                        isValid={!isItemNameInvalid}
                                                                        message={errors.itemNameMessage}
                                                                    >
                                                                        <Input
                                                                            className={cn(
                                                                                "h-9 w-full rounded-[3px] border border-input bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                                isItemNameInvalid && "border-red-500"
                                                                            )}
                                                                            value={row.itemName}
                                                                            placeholder="Enter item name"
                                                                            onChange={(e) => updateCreateRow(index, { itemName: normalizeTextInput(e.target.value) })}
                                                                            onBlur={() => updateCreateRow(index, { touched: { ...row.touched, itemName: true } })}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") addCreateRow();
                                                                            }}
                                                                        />
                                                                    </ValidationTooltip>
                                                                </DataGridCell>

                                                                {/* DESCRIPTION */}
                                                                <DataGridCell>
                                                                    <Input
                                                                        className="h-9 w-full rounded-[3px] border border-input bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                                                                        value={row.description}
                                                                        placeholder="Short description"
                                                                        onChange={(e) => updateCreateRow(index, { description: normalizeTextInput(e.target.value) })}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") addCreateRow();
                                                                        }}
                                                                    />
                                                                </DataGridCell>

                                                                {/* RATE */}
                                                                <DataGridCell className="text-center">
                                                                    <ValidationTooltip
                                                                        isValid={!isItemRateInvalid}
                                                                        message="Required field"
                                                                    >
                                                                        <Input
                                                                            className={cn(
                                                                                "h-9 w-full rounded-[3px] border border-input bg-background text-center text-sm font-bold shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                                isItemRateInvalid && "border-red-500"
                                                                            )}
                                                                            value={row.itemRate}
                                                                            placeholder="0.00"
                                                                            onChange={(e) => updateCreateRow(index, { itemRate: normalizeNumberInput(e.target.value) })}
                                                                            onBlur={() => updateCreateRow(index, { touched: { ...row.touched, itemRate: true } })}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") addCreateRow();
                                                                            }}
                                                                        />
                                                                    </ValidationTooltip>
                                                                </DataGridCell>

                                                                {/* ACTION */}
                                                                {createRows.length > 1 && (
                                                                    <DataGridCell className="text-center">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors"
                                                                            onClick={() => removeCreateRow(index)}
                                                                        >
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </Button>
                                                                    </DataGridCell>
                                                                )}
                                                            </DataGridRow>
                                                        );
                                                    })}
                                                </tbody>
                                            </DataGrid>
                                        </div>
                                    </div>

                                    <div className="editable-grid-footer p-3 bg-muted/10">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                                onClick={addCreateRow}
                                            >
                                                <PlusCircle className="w-4 h-4" /> Add New Pricing Item(s)
                                            </button>
                                            {showCreateErrors && (errors => {
                                                const formDups = createRows.some((row, index) => getCreateRowErrors(row, index).duplicateInForm);
                                                const existDups = createRows.some((row, index) => getCreateRowErrors(row, index).duplicateExisting);
                                                if (!formDups && !existDups) return null;
                                                return (
                                                    <p className="text-[10px] text-red-600 font-medium italic">
                                                        * {DUPLICATE_ITEMS_MESSAGE}
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                            </motion.div>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3">
                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                {mode === "view" ? "Close" : "Cancel"}
                            </Button>
                            {mode !== "view" && (
                                <Button
                                    variant="hero"
                                    onClick={handleSave}
                                >
                                    {mode === "edit" ? "Update" : "Create Items"}
                                </Button>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
