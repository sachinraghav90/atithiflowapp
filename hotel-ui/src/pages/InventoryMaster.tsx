// v2 - fixed imports
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import {
    useCreateInventoryMasterMutation,
    useCreateInventoryMasterBulkMutation,
    useGetInventoryQuery,
    useGetInventoryTypesQuery,
    useUpdateInventoryMasterMutation,
    useCheckDuplicateInventoryMutation,
    useLazyExportInventoryQuery,
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useAppSelector } from "@/redux/hook";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, RefreshCcw, FilterX, Download, Trash2, Plus, PlusCircle, Box, Package, Calendar, ShieldCheck, Wrench, Building2 } from "lucide-react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { exportToExcel } from "@/utils/exportToExcel";
import { getStatusColor } from "@/constants/statusColors";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import { DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell } from "@/components/ui/data-grid";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { GridBadge } from "@/components/ui/grid-badge";
import { formatReadableLabel } from "@/utils/formatString";
import { formatAppDate } from "@/utils/dateFormat";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";
import { motion } from "framer-motion";

type InventoryItem = {
    id: string;
    property_id: string;
    inventory_type_id: number;
    inventory_type?: string;
    use_type: string;
    name: string;
    is_active: boolean;
    created_on: string;
};

type InventoryForm = {
    inventory_type_id: number | null;
    use_type: string;
    name: string;
    is_active: boolean;
    touched?: {
        inventory_type_id?: boolean;
        use_type?: boolean;
        name?: boolean;
    };
};

type FormErrors = Record<string, string>;
type BulkErrors = Record<number, FormErrors>;

interface ApiError {
    data?: {
        message?: string;
    };
    message?: string;
}

const DUPLICATE_ITEMS_MESSAGE = "Duplicate items are not Allowed";

function buildCreateInventoryPayload(form: InventoryForm, propertyId: number) {
    return {
        property_id: propertyId,
        inventory_type_id: form.inventory_type_id,
        use_type: form.use_type,
        name: form.name,
    };
}

function buildUpdateInventoryPayload(form: Partial<InventoryForm>) {
    return {
        ...(form.inventory_type_id && { inventory_type_id: form.inventory_type_id }),
        ...(form.use_type && { use_type: form.use_type }),
        ...(form.name && { name: form.name }),
        is_active: form.is_active,
    };
}

function normalizeInventoryName(value?: string | null) {
    return value?.trim().toLowerCase() ?? "";
}

export default function InventoryMaster() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [inventoryTypeFilter, setInventoryTypeFilter] = useState("");
    const [useTypeFilter, setUseTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");
    const [selected, setSelected] = useState<InventoryItem | null>(null);

    const [form, setForm] = useState<InventoryForm>({
        inventory_type_id: null,
        use_type: "fix",
        name: "",
        is_active: true,
    });

    const [submitted, setSubmitted] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [selectedPropertyId, setSelectedPropertyId] = useState("")

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const [getAllInventory, { isFetching: exportingInventory }] = useLazyExportInventoryQuery();
    const {
        myProperties,
        isLoading: myPropertiesLoading,
        isInitializing
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: inventoryTypesData } = useGetInventoryTypesQuery(undefined, {
        skip: !isLoggedIn
    })
    const inventoryTypes = inventoryTypesData ?? [];

    const {
        data: inventoryMaster,
        isLoading: inventoryLoading,
        isFetching: inventoryFetching,
        refetch: refetchInventory
    } = useGetInventoryQuery({
        propertyId: selectedPropertyId,
        page,
        limit,
        search: searchQuery,
        type: inventoryTypeFilter,
        use_type: useTypeFilter,
        status: statusFilter,
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createInventoryMaster] = useCreateInventoryMasterMutation()
    const [createInventoryMasterBulk] = useCreateInventoryMasterBulkMutation()
    const [updateInventoryMaster] = useUpdateInventoryMasterMutation()
    const [checkDuplicateInventory] = useCheckDuplicateInventoryMutation();

    const [bulkRows, setBulkRows] = useState<InventoryForm[]>([
        { inventory_type_id: null, use_type: "fix", name: "", is_active: true, touched: {} }
    ]);
    const [dbDuplicates, setDbDuplicates] = useState<string[]>([]);
    const [submittedBulk, setSubmittedBulk] = useState(false);

    function validate(form: InventoryForm) {
        const errors: Record<string, string> = {};
        if (!form.inventory_type_id) errors.inventory_type_id = "Required";
        if (!form.name.trim()) errors.name = "Name required";
        if (!form.use_type.trim()) errors.use_type = "Use type required";
        return errors;
    }

    async function handleForm() {
        setSubmitted(true);
        const errors = validate(form);
        setFormErrors(errors);

        if (Object.keys(errors).length) return;

        if (mode === "edit" && selected) {
            try {
                // Pre-check for duplicate before update
                const res = await checkDuplicateInventory([{
                    id: selected.id,
                    property_id: Number(selectedPropertyId),
                    inventory_type_id: form.inventory_type_id,
                    name: normalizeInventoryName(form.name)
                }]).unwrap();

                if (res.duplicates?.[0]) {
                    setFormErrors((prev) => ({ ...prev, name: "This item is already registered for this category." }));
                    toast.error("This item is already registered for this category.");
                    return;
                }
            } catch (e) {
                // Fallthrough to let backend enforce uniqueness if pre-check fails
            }

            const payload = buildUpdateInventoryPayload(form);
            try {
                await toast.promise(
                    updateInventoryMaster({ body: payload, id: selected.id }).unwrap(),
                    {
                        error: {
                            render({ data }) {
                                const err = data as ApiError;
                                return err?.data?.message || err?.message || "Error updating inventory";
                            }
                        },
                        pending: "Updating please wait",
                        success: "Updated successfully"
                    }
                );
                setMode(null);
            } catch (err: unknown) {
                const error = err as ApiError;
                const message = error?.data?.message || error?.message || "";
                if (message.toLowerCase().includes("already exists") || message.toLowerCase().includes("duplicate")) {
                    setFormErrors((prev) => ({
                        ...prev,
                        name: "This item is already registered for this category.",
                    }));
                }
            }
        }
    }

    const ensureBulkDuplicateInventory = async (rows: InventoryForm[]) => {
        if (!selectedPropertyId) return dbDuplicates;

        const rowsToCheck = rows.filter((row) => !!row.inventory_type_id && !!row.use_type && !!normalizeInventoryName(row.name));
        if (!rowsToCheck.length) return dbDuplicates;

        const payload = rowsToCheck.map(r => ({
            property_id: Number(selectedPropertyId),
            inventory_type_id: r.inventory_type_id,
            name: normalizeInventoryName(r.name)
        }));

        try {
            const res = await checkDuplicateInventory(payload).unwrap();

            const newDuplicates = new Set(dbDuplicates);
            res.duplicates.forEach((isDup: boolean, idx: number) => {
                const key = `${payload[idx].inventory_type_id}_${payload[idx].name}`;
                if (isDup) {
                    newDuplicates.add(key);
                } else {
                    newDuplicates.delete(key);
                }
            });

            const nextDuplicates = Array.from(newDuplicates);
            if (nextDuplicates.length !== dbDuplicates.length || nextDuplicates.some(d => !dbDuplicates.includes(d))) {
                setDbDuplicates(nextDuplicates);
            }

            return nextDuplicates;
        } catch (e) {
            console.error("Duplicate check failed", e);
            return dbDuplicates;
        }
    };

    const getBulkRowErrors = (
        row: InventoryForm,
        idx: number,
        currentDuplicates: string[] = dbDuplicates
    ) => {
        const rowError: FormErrors = {};
        const normalizedName = normalizeInventoryName(row.name);
        const canCheckDuplicate = !!row.inventory_type_id && !!row.use_type && !!normalizedName;

        if (!row.inventory_type_id) rowError.inventory_type_id = "Required field";
        if (!row.name?.trim()) rowError.name = "Required field";
        if (!row.use_type) rowError.use_type = "Required field";

        // Same-grid duplicate check
        const isDuplicateInGrid = !!(canCheckDuplicate && bulkRows.some((r, i) =>
            i !== idx &&
            Number(r.inventory_type_id) === Number(row.inventory_type_id) &&
            (r.name || "").trim().toLowerCase() === normalizedName
        ));

        if (isDuplicateInGrid) {
            rowError.name = DUPLICATE_ITEMS_MESSAGE;
        } else {
            const key = `${row.inventory_type_id}_${normalizedName}`;
            const isDuplicateInDB = !!(canCheckDuplicate && currentDuplicates.includes(key));
            if (isDuplicateInDB) {
                rowError.name = DUPLICATE_ITEMS_MESSAGE;
            }
        }
        return rowError;
    };

    const bulkErrors = useMemo(() => {
        const errs: BulkErrors = {};
        bulkRows.forEach((row, idx) => {
            const rowError = getBulkRowErrors(row, idx, dbDuplicates);
            if (Object.keys(rowError).length > 0) {
                errs[idx] = rowError;
            }
        });
        return errs;
    }, [bulkRows, dbDuplicates]);

    const handleBulkSubmit = async () => {
        setSubmittedBulk(true);
        const currentDuplicates = await ensureBulkDuplicateInventory(bulkRows);
        const currentBulkErrors = bulkRows.reduce<BulkErrors>((errors, row, index) => {
            const rowErrors = getBulkRowErrors(row, index, currentDuplicates);
            if (Object.keys(rowErrors).length > 0) {
                errors[index] = rowErrors;
            }
            return errors;
        }, {});

        if (Object.keys(currentBulkErrors).length > 0) return;

        const payload = bulkRows.map(row => ({
            property_id: +selectedPropertyId,
            inventory_type_id: row.inventory_type_id,
            use_type: row.use_type,
            name: row.name,
        }));

        try {
            await createInventoryMasterBulk(payload).unwrap();
            toast.success("Inventory items created successfully");
            setMode(null);
            setSubmittedBulk(false);
            setBulkRows([{ inventory_type_id: null, use_type: "fix", name: "", is_active: true, touched: {} }]);
        } catch (err: unknown) {
            console.error("Bulk create error:", err);
            const error = err as ApiError;
            const msg = error?.data?.message || error?.message || "";
            const lowerMsg = String(msg).toLowerCase();
            const isDuplicateError =
                lowerMsg.includes("unique constraint") ||
                lowerMsg.includes("already exists") ||
                lowerMsg.includes("already exist") ||
                lowerMsg.includes("already exist in this category") ||
                lowerMsg.includes("duplicate");

            if (isDuplicateError) {
                await ensureBulkDuplicateInventory(bulkRows);
                return;
            }

            if (!isDuplicateError) {
                toast.error("Update Failed: Could not create inventory items. Please check your connection.");
            }
        }
    };

    const addBulkRow = () => {
        setSubmittedBulk(false);
        setBulkRows(prev => [...prev, { inventory_type_id: null, use_type: "fix", name: "", is_active: true, touched: {} }]);
    };

    const removeBulkRow = (index: number) => {
        if (bulkRows.length === 1) {
            setSubmittedBulk(false);
            setBulkRows([{ inventory_type_id: null, use_type: "fix", name: "", is_active: true, touched: {} }]);
            return;
        }
        setBulkRows(prev => prev.filter((_, i) => i !== index));
    };

    const updateBulkRow = (index: number, patch: Partial<InventoryForm>) => {
        setBulkRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...patch };
            return updated;
        });
    };

    const openEdit = (item: InventoryItem) => {
        setSelected(item);
        setSubmitted(false);
        setFormErrors({});
        setForm({
            inventory_type_id: item.inventory_type_id,
            use_type: item.use_type,
            name: item.name,
            is_active: item.is_active,
        });
        setSheetTab("summary");
        setMode("edit");
    };

    const openView = (item: InventoryItem) => {
        setSelected(item);
        setSheetTab("summary");
        setMode("view");
    };

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const inventoryRows = useMemo(() => {
        return inventoryMaster?.data ?? [];
    }, [inventoryMaster?.data]);


    const totalPages = inventoryMaster?.pagination?.totalPages ?? 1;
    const totalRecords = inventoryMaster?.pagination?.totalItems ?? inventoryMaster?.pagination?.total ?? inventoryRows.length;

    const handleRefresh = async () => {
        if (inventoryFetching) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchInventory();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh");
        }
    };

    const handleExport = async () => {
        if (exportingInventory) return;
        if (!totalRecords) {
            toast.info("No data to export");
            return;
        }

        const toastId = toast.loading("Preparing inventory export...");
        try {
            const res = await getAllInventory({
                propertyId: selectedPropertyId,
                search: searchQuery,
                inventory_type: inventoryTypeFilter,
                use_type: useTypeFilter,
                status: statusFilter,
                limit: 1000
            }).unwrap();

            if (!res?.data?.length) {
                toast.dismiss(toastId);
                toast.info("No data to export");
                return;
            }

            const formatted = res.data.map((item: InventoryItem) => ({
                "Inventory ID": formatModuleDisplayId("inventory", item.id),
                "Name": item.name,
                "Inventory Type": item.inventory_type || "—",
                "Use Type": item.use_type.charAt(0).toUpperCase() + item.use_type.slice(1),
                "Status": item.is_active ? "Active" : "Inactive",
                "Created On": formatAppDate(item.created_on)
            }));

            exportToExcel(formatted, "InventoryMaster.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export inventory");
        }
    };

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId]);

    useEffect(() => {
        setDbDuplicates([]);
    }, [selectedPropertyId]);

    useEffect(() => {
        if (searchInput.trim() === "") {
            setSearchQuery("");
            setPage(1);
        }
    }, [searchInput]);

    return (
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
                {/* HEADER */}
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Master Inventory</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage inventory items and stock master data
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {myProperties?.properties && myProperties.properties.length > 0 && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border tracking-wide">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {myProperties.properties.map((property) => (
                                        <option key={property.id} value={property.id}>
                                            {property.brand_name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>
                        )}

                        {permission?.can_create && (
                            <Button
                                variant="hero"
                                className="h-10 px-4 flex items-center gap-2"
                                onClick={() => {
                                    setBulkRows([{
                                        inventory_type_id: null,
                                        use_type: "fix",
                                        name: "",
                                        is_active: true,
                                        touched: {}
                                    }]);
                                    setDbDuplicates([]);
                                    setSubmittedBulk(false);
                                    setMode("add");
                                }}
                            >
                                <Plus className="w-4 h-4" /> Add Inventory
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
                                    onChange={(val) => {
                                        setSearchInput(val);
                                        if (val.trim() === "") {
                                            setSearchQuery("");
                                            setPage(1);
                                        }
                                    }}
                                    onSearch={() => setSearchQuery(searchInput.trim())}
                                />

                                <GridToolbarSelect
                                    label="Type"
                                    value={inventoryTypeFilter}
                                    onChange={(val) => {
                                        setInventoryTypeFilter(val);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...inventoryTypes.map(t => ({ label: t.type, value: t.type }))
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Use"
                                    value={useTypeFilter}
                                    onChange={(val) => {
                                        setUseTypeFilter(val);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "fix", value: "fix" },
                                        { label: "usable", value: "usable" },
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Inventory",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: handleExport,
                                        },
                                        {
                                            key: "reset",
                                            label: "Reset Filters",
                                            icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: () => {
                                                setSearchInput("");
                                                setSearchQuery("");
                                                setInventoryTypeFilter("");
                                                setUseTypeFilter("");
                                                setStatusFilter("");
                                                setPage(1);
                                            },
                                        },
                                        {
                                            key: "refresh",
                                            label: "Refresh Data",
                                            icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: handleRefresh,
                                            disabled: inventoryFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>

                            {/* Row 2 */}
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(val) => {
                                        setStatusFilter(val);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "active", value: "active" },
                                        { label: "inactive", value: "inactive" },
                                    ]}
                                />
                                <GridToolbarSpacer />
                                <GridToolbarSpacer />
                                <GridToolbarSpacer type="actions" />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={[
                                {
                                    label: "Inventory ID",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium min-w-[90px]",
                                    render: (item: InventoryItem) => (
                                        <button
                                            type="button"
                                            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                            onClick={() => openView(item)}
                                            aria-label={`Open summary view for inventory ${formatModuleDisplayId("inventory", item.id)}`}
                                        >
                                            {formatModuleDisplayId("inventory", item.id)}
                                        </button>
                                    ),
                                },
                                {
                                    label: "Name",
                                    key: "name",
                                    cellClassName: "font-semibold text-foreground",
                                },
                                {
                                    label: "Inventory Type",
                                    cellClassName: "whitespace-nowrap text-muted-foreground",
                                    render: (item: InventoryItem) => formatReadableLabel(item.inventory_type) || "—",
                                },
                                {
                                    label: "Use Type",
                                    cellClassName: "font-medium text-foreground/80",
                                    render: (item: InventoryItem) => formatReadableLabel(item.use_type) || "—",
                                },
                                {
                                    label: "Status",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (item: InventoryItem) => (
                                        <GridBadge status={item.is_active ? "active" : "inactive"} statusType="toggle">
                                            {item.is_active ? "Active" : "Inactive"}
                                        </GridBadge>
                                    )
                                },
                                {
                                    label: "Created",
                                    cellClassName: "text-muted-foreground text-xs font-medium whitespace-nowrap",
                                    render: (item: InventoryItem) => formatAppDate(item.created_on)
                                },
                            ] satisfies ColumnDef[]}
                            data={inventoryRows}
                            loading={inventoryLoading || isInitializing}
                            emptyText="No inventory items found"
                            minWidth="800px"
                            enablePagination
                            paginationProps={{
                                page,
                                totalPages,
                                setPage,
                                totalRecords,
                                limit,
                                onLimitChange: (value) => {
                                    setLimit(value);
                                    setPage(1);
                                },
                                disabled: inventoryLoading || inventoryFetching,
                            }}
                            actionLabel=""
                            actionClassName="text-center w-[60px]"
                            actions={
                                (item: InventoryItem) => (
                                    <div className="flex items-center justify-center gap-2">
                                        {permission?.can_create && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                        aria-label={`Update details for inventory ${item.name}`}
                                                        onClick={() => openEdit(item)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mx-auto" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Update Details</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                )
                            }
                        />
                    </div>
                </div>

                {/* BULK ADD SHEET */}
                <Sheet open={mode === "add"} onOpenChange={(open) => !open && setMode(null)}>
                    <SheetContent side="right" onOpenAutoFocus={(event) => event.preventDefault()} className="w-full sm:max-w-4xl flex flex-col p-0">
                        <SheetHeader className="px-6 py-4 border-b">
                            <SheetTitle className="text-[#444444]">Add Inventory Items</SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto">
                            <div className="px-6 pb-6 pt-3 space-y-6">
                                <div className="space-y-2">



                                <div className="editable-grid-compact border rounded-[5px] overflow-hidden flex flex-col">
                                    <div className="overflow-x-auto w-full bg-background border-b border-border">
                                        <div className="w-full min-w-[700px]">
                                            <DataGrid>
                                                <DataGridHeader>
                                                    <DataGridHead>Inventory Type*</DataGridHead>
                                                    <DataGridHead className="w-40 text-center">Use Type*</DataGridHead>
                                                    <DataGridHead>Name*</DataGridHead>
                                                    {bulkRows.length > 1 && (
                                                        <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                                    )}
                                                </DataGridHeader>

                                                <tbody>
                                                    {bulkRows.map((row, index) => {
                                                        const nameError = bulkErrors[index]?.name;
                                                        const isNameInvalid =
                                                            (!!nameError && submittedBulk) ||
                                                            (!!row.touched?.name && !!nameError && nameError !== "Required field");

                                                        return (
                                                        <DataGridRow key={index}>
                                                            <DataGridCell>
                                                                <ValidationTooltip isValid={!((submittedBulk || row.touched?.inventory_type_id) && bulkErrors[index]?.inventory_type_id)} message={typeof bulkErrors[index]?.inventory_type_id === 'string' ? bulkErrors[index]?.inventory_type_id : "Required field"}>
                                                                    <MenuItemSelect
                                                                        extraClasses={cn(
                                                                            "w-full bg-background border border-border focus:ring-1 focus:ring-primary text-sm cursor-pointer rounded-[3px]",
                                                                            (submittedBulk || row.touched?.inventory_type_id) && bulkErrors[index]?.inventory_type_id && "border-red-500"
                                                                        )}
                                                                        value={row.inventory_type_id ?? ""}
                                                                        items={inventoryTypes}
                                                                        itemName="type"
                                                                        onSelect={(val) => {
                                                                            const nextRow = {
                                                                                ...row,
                                                                                inventory_type_id: val ? Number(val) : null,
                                                                                touched: { ...row.touched, inventory_type_id: true }
                                                                            };
                                                                            updateBulkRow(index, nextRow);
                                                                            // Optimization: Prefetch immediately on type selection to hide network latency
                                                                            if (nextRow.inventory_type_id) {
                                                                                void ensureBulkDuplicateInventory([nextRow]);
                                                                            }
                                                                        }}
                                                                        placeholder="--Please Select--"
                                                                    />
                                                                </ValidationTooltip>
                                                            </DataGridCell>

                                                            <DataGridCell>
                                                                <ValidationTooltip isValid={!((submittedBulk || row.touched?.use_type) && bulkErrors[index]?.use_type)} message={typeof bulkErrors[index]?.use_type === 'string' ? bulkErrors[index]?.use_type : "Required field"}>
                                                                    <NativeSelect
                                                                        className={cn(
                                                                            "w-full h-9 bg-background border border-border focus:ring-1 focus:ring-primary text-sm cursor-pointer text-center px-3 rounded-[3px]",
                                                                            (submittedBulk || row.touched?.use_type) && bulkErrors[index]?.use_type && "border-red-500"
                                                                        )}
                                                                        value={row.use_type}
                                                                        onChange={(e) => {
                                                                            const nextRow = {
                                                                                ...row,
                                                                                use_type: e.target.value,
                                                                                touched: { ...row.touched, use_type: true }
                                                                            };
                                                                            updateBulkRow(index, nextRow);
                                                                            if (nextRow.inventory_type_id && nextRow.use_type && normalizeInventoryName(nextRow.name)) {
                                                                                void ensureBulkDuplicateInventory([nextRow]);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <option value="fix">Fix</option>
                                                                        <option value="usable">Usable</option>
                                                                    </NativeSelect>
                                                                </ValidationTooltip>
                                                            </DataGridCell>

                                                            <DataGridCell>
                                                                <ValidationTooltip
                                                                    isValid={!isNameInvalid}
                                                                    message={bulkErrors[index]?.name || "Required field"}
                                                                >
                                                                    <Input
                                                                        placeholder="Enter name"
                                                                        className={cn(
                                                                            "h-9 border border-border shadow-none focus-visible:ring-1 focus-visible:ring-primary bg-background px-3 rounded-[3px]",
                                                                            isNameInvalid && "border-red-500"
                                                                        )}
                                                                        value={row.name}
                                                                        onChange={(e) => updateBulkRow(index, { name: normalizeTextInput(e.target.value) })}
                                                                        onBlur={() => {
                                                                            const nextRow = {
                                                                                ...row,
                                                                                touched: { ...row.touched, name: true }
                                                                            };
                                                                            updateBulkRow(index, nextRow);
                                                                            if (nextRow.inventory_type_id && nextRow.use_type && normalizeInventoryName(nextRow.name)) {
                                                                                void ensureBulkDuplicateInventory([nextRow]);
                                                                            }
                                                                        }}
                                                                    />
                                                                </ValidationTooltip>
                                                            </DataGridCell>

                                                            {bulkRows.length > 1 && (
                                                                <DataGridCell className="text-center">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors mx-auto"
                                                                        onClick={() => removeBulkRow(index)}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </Button>
                                                                </DataGridCell>
                                                            )}
                                                        </DataGridRow>
                                                        )
                                                    })}
                                                </tbody>
                                            </DataGrid>
                                        </div>
                                    </div>
                                    <div className="editable-grid-footer p-3 bg-muted/10">
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                            onClick={addBulkRow}
                                        >
                                            <PlusCircle className="w-4 h-4" /> Add New Inventory Item(s)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setMode(null)}>
                                    Cancel
                                </Button>
                                <Button variant="hero" className="min-w-[140px]" onClick={handleBulkSubmit}>
                                    Create Inventory
                                </Button>
                            </div>
                        </div>
                    </div>
                    </SheetContent>
                </Sheet>

                {/* EDIT/VIEW SHEET */}
                <Sheet open={mode === "edit" || mode === "view"} onOpenChange={(open) => !open && setMode(null)}>
                    <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-1"
                        >
                            <SheetHeader className="mb-6">
                                <div className="space-y-1">
                                    <SheetTitle className="text-xl font-bold">
                                        {mode === "view" ? `Master Inventory [${selected?.id ? `#${formatModuleDisplayId("inventory", selected.id)}` : "..."}]` : mode === "edit" ? `Update Master Inventory [${selected?.id ? `#${formatModuleDisplayId("inventory", selected.id)}` : "..."}]` : "Add Master Inventory Item"}
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground font-medium tracking-wider">
                                        {mode === "view" ? "Inventory configuration details" : "Modify existing inventory item details."}
                                    </p>
                                </div>
                            </SheetHeader>

                            {mode === "view" && selected && (
                                <div className="space-y-6">
                                    {/* Sheet Tabs */}
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
                                                "px-4 py-2 text-[11px] font-bold tracking-wide transition-all border-b-2 -mb-[2px]",
                                                sheetTab === "history"
                                                    ? "border-primary text-primary"
                                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            History
                                        </button>
                                    </div>

                                    {sheetTab === "summary" && (
                                        <PropertyViewSection title="Inventory Details" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Name" value={selected.name} className="sm:col-span-2" />
                                            <ViewField label="Inventory Type" value={formatReadableLabel(selected.inventory_type)} />
                                            <ViewField label="Use Type" value={selected.use_type} className="capitalize" />
                                            <ViewField label="Status" value={selected.is_active ? "Active" : "Inactive"} />
                                            <ViewField label="Created On" value={formatAppDate(selected.created_on)} />
                                        </PropertyViewSection>
                                    )}

                                    {sheetTab === "history" && (
                                        <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                            <p className="text-sm text-muted-foreground text-center">No history logs available yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode === "edit" && (
                                <div className="space-y-6 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">
                                    <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-border/40 pb-2 mb-3">
                                        Edit Inventory Details
                                    </h3>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground tracking-wide" htmlFor="inventory-name">Item Name *</Label>
                                        <Input
                                            id="inventory-name"
                                            name="inventory_name"
                                            value={form.name}
                                            placeholder="e.g. Bed Sheets"
                                            className={cn("h-11 border-border shadow-none focus-visible:ring-1 focus-visible:ring-primary", submitted && formErrors.name ? "border-red-500" : "")}
                                            onChange={(e) => {
                                                setForm({ ...form, name: normalizeTextInput(e.target.value) })
                                                setFormErrors(e => ({ ...e, name: "" }))
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground tracking-wide" htmlFor="inventory-type">Inventory Type *</Label>
                                            <NativeSelect
                                                id="inventory-type"
                                                name="inventory_type_id"
                                                className={cn("h-11 border border-primary/20 bg-background rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full shadow-none", submitted && formErrors.inventory_type_id ? "border-red-500" : "")}
                                                value={form.inventory_type_id ?? ""}
                                                onChange={(e) => {
                                                    setForm({ ...form, inventory_type_id: Number(e.target.value) })
                                                    setFormErrors(e => ({ ...e, inventory_type_id: "" }))
                                                }}
                                            >
                                                <option value="" disabled>Select Type</option>
                                                {inventoryTypes.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.type}
                                                    </option>
                                                ))}
                                            </NativeSelect>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground tracking-wide" htmlFor="inventory-use-type">Use Type *</Label>
                                            <NativeSelect
                                                id="inventory-use-type"
                                                name="inventory_use_type"
                                                className={cn("h-11 border border-primary/20 bg-background rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full shadow-none", submitted && formErrors.use_type ? "border-red-500" : "")}
                                                value={form.use_type ?? ""}
                                                onChange={(e) => {
                                                    setForm({ ...form, use_type: e.target.value })
                                                    setFormErrors(e => ({ ...e, use_type: "" }))
                                                }}
                                            >
                                                <option value="fix">Fix</option>
                                                <option value="usable">Usable</option>
                                            </NativeSelect>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center gap-4">
                                            <Switch
                                                checked={form?.is_active}
                                                onCheckedChange={(v) =>
                                                    setForm({ ...form, is_active: v })
                                                }
                                            />
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-foreground cursor-pointer" onClick={() => setForm({ ...form, is_active: !form.is_active })}>
                                                    Mark as Active
                                                </Label>
                                                <p className="text-xs text-muted-foreground">Inactive items will not be available for use.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                                <Button
                                    variant="heroOutline"
                                    className="min-w-[100px]"
                                    onClick={() => setMode(null)}
                                >
                                    {mode === "view" ? "Close" : "Cancel"}
                                </Button>

                                {mode === "edit" && (
                                    <Button
                                        variant="hero"
                                        className="min-w-[140px]"
                                        onClick={handleForm}
                                    >
                                        Update
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </SheetContent>
                </Sheet>
            </section>
        </div>
    );
}
