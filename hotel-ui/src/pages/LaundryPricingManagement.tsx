import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useCreateLaundryPricingMutation, useGetPropertyLaundryPricingQuery, useUpdateLaundryPricingMutation } from "@/redux/services/hmsApi";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { usePermission } from "@/rbac/usePermission";
import { useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { AppDataGrid, DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { FilterX, RefreshCcw, Download, Pencil, Trash2, Plus, PlusCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { getStatusColor } from "@/constants/statusColors";
import { toast } from "react-toastify";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { exportToExcel } from "@/utils/exportToExcel";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { GridBadge } from "@/components/ui/grid-badge";

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

const THEME_SURFACE_CLASS = "bg-background";
const THEME_INPUT_CLASS = "bg-background border-border";

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

/* ---------------- Component ---------------- */
export default function LaundryPricingManagement() {
    /* ---------------- State ---------------- */
    const [items, setItems] = useState<LaundryItem[]>([]);

    // UI STates
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"edit" | "view" | "bulk_add">("view");
    const [selectedItem, setSelectedItem] = useState<LaundryItem | null>(null);

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

    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 5,
        resetDeps: [selectedPropertyId, statusFilter, searchQuery],
    });

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { myProperties, isInitializing } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const {
        data,
        isLoading: laundryLoading,
        isFetching: laundryFetching,
        refetch: refetchLaundryPricing
    } = useGetPropertyLaundryPricingQuery({ propertyId: selectedPropertyId, page: 1, limit: 1000 }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
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
        const toastId = toast.loading("Refreshing laundry pricing...");
        try {
            await refetchLaundryPricing();
            toast.dismiss(toastId);
            toast.success("Laundry pricing refreshed");
        } catch {
            toast.dismiss(toastId);
        }
    };

    const exportPricesSheet = () => {
        if (!filteredItems.length) return toast.info("No data to export");
        const formatted = filteredItems.map(item => ({
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

    const filteredItems = useMemo(() => {
        let filtered = items;
        if (statusFilter) {
            filtered = filtered.filter((item) => String(item.is_active) === statusFilter);
        }

        // Dynamically get keywords from filter options to exclude from search
        const filterKeywords = STATUS_OPTIONS
            .filter(opt => opt.value !== "")
            .map(opt => opt.label.toLowerCase());

        const cleanSearchQuery = searchQuery
            .split(/\s+/)
            .filter(word => !filterKeywords.includes(word.toLowerCase()))
            .join(" ")
            .trim();

        return filterGridRowsByQuery(filtered, cleanSearchQuery, [
            (item) => formatModuleDisplayId("laundry_pricing", item.id),
            (item) => item.item_name,
            (item) => item.description,
            (item) => item.item_rate,
        ]);
    }, [items, searchQuery, statusFilter]);

    const totalRecords = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredItems.slice(start, start + limit);
    }, [filteredItems, page, limit]);

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

    /* ---------------- UI ---------------- */
    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">
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
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        setSelectedPropertyId(e.target.value);
                                        resetPage();
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
                            <div className="flex gap-2">
                                <Button variant="hero" className="h-10 px-4 flex items-center gap-2" onClick={() => openSheet(null, "bulk_add")}>
                                    <Plus className="w-4 h-4" /> Add Laundry Items
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
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
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            aria-label={`Edit laundry item ${item.item_name}`}
                                            onClick={() => openSheet(item, "edit")}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Item</TooltipContent>
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
                </div>
            </section>

            {/* Combined View/Add/Edit/Bulk Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className={cn(
                        "w-full p-0 flex flex-col bg-background",
                        mode === "bulk_add" ? "sm:max-w-4xl" : "sm:max-w-xl"
                    )}
                >
                    <SheetHeader className="px-6 py-4 border-b bg-background">
                        <SheetTitle>
                            {mode === "edit" ? "Edit Laundry Item" :
                             mode === "bulk_add" ? "Add Laundry Items With There Pricing" :
                             "Laundry Item Summary"}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-4 bg-background">
                        {mode === "view" && selectedItem && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 rounded-[5px] border p-4 bg-background border-border">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Item ID</Label>
                                        <p className="font-semibold text-primary">{formatModuleDisplayId("laundry", selectedItem.id)}</p>
                                    </div>
                                    <div className="space-y-1 rounded-[5px] border p-4 bg-background border-border">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                                        <div>
                                            <span className={cn("px-3 py-1 text-xs font-semibold rounded-[3px]", getStatusColor(selectedItem.is_active ? "active" : "inactive", "toggle"))}>
                                                {selectedItem.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 rounded-[5px] border p-4 bg-background border-border">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Item Name</Label>
                                    <p className="text-lg font-bold">{selectedItem.item_name}</p>
                                </div>
                                {!!selectedItem.description && (
                                    <div className="space-y-1 rounded-[5px] border p-4 bg-background border-border">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                                        <p className="text-sm text-foreground/80">{selectedItem.description}</p>
                                    </div>
                                )}
                                <div className="space-y-1 rounded-[5px] border p-4 bg-background border-border">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Rate</Label>
                                    <p className="text-2xl font-bold text-foreground">Rs {selectedItem.item_rate}</p>
                                </div>
                            </div>
                        )}

                        {mode === "edit" && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="item-name">Item Name *</Label>
                                    <Input
                                        id="item-name"
                                        className={cn("mt-1 h-9 bg-background border-border", submitted && formErrors.item_name && "border-red-500")}
                                        value={form.item_name}
                                        onChange={(e) => {
                                            setForm(p => ({ ...p, item_name: normalizeTextInput(e.target.value) }));
                                            setFormErrors(p => ({ ...p, item_name: "" }));
                                        }}
                                        disabled={mode === "edit" && selectedItem?.system_generated}
                                    />
                                    {submitted && formErrors.item_name && <p className="text-xs text-red-500 mt-1">{formErrors.item_name}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        className={cn("mt-1 h-9 bg-background border-border")}
                                        value={form.description}
                                        onChange={(e) => setForm(p => ({ ...p, description: normalizeTextInput(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="rate">Rate (₹) *</Label>
                                    <Input
                                        id="rate"
                                        className={cn("mt-1 h-9 bg-background border-border", submitted && formErrors.item_rate && "border-red-500")}
                                        value={form.item_rate}
                                        onChange={(e) => {
                                            setForm(p => ({ ...p, item_rate: normalizeNumberInput(e.target.value) }));
                                            setFormErrors(p => ({ ...p, item_rate: "" }));
                                        }}
                                    />
                                    {submitted && formErrors.item_rate && <p className="text-xs text-red-500 mt-1">{formErrors.item_rate}</p>}
                                </div>
                                <div className="flex items-center gap-2 rounded-[5px] border px-4 py-3 h-9 bg-background border-border">
                                    <Switch
                                        id="item-active"
                                        checked={form.is_active}
                                        onCheckedChange={(val) => setForm(p => ({ ...p, is_active: val }))}
                                    />
                                    <Label htmlFor="item-active">Active</Label>
                                </div>
                            </div>
                        )}

                        {mode === "bulk_add" && (
                            <div className="space-y-4">


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
                                                                 placeholder="Short description (optional)"
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

                        <div className="p-6 border-t bg-muted/20 flex justify-end gap-3 shrink-0">
                            <Button variant="outline" onClick={() => setSheetOpen(false)}>
                                {mode === "view" ? "Close" : "Cancel"}
                            </Button>
                            {mode !== "view" && (
                                <Button variant="hero" className="min-w-[140px]" onClick={handleSave}>
                                    {mode === "edit" ? "Save Changes" : "Create Items"}
                                </Button>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div >
    );
}
