import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { NativeSelect } from "@/components/ui/native-select";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { 
    useGetKitchenInventoryQuery, 
    useGetLogsQuery as useGetAuditLogsQuery, 
    useAdjustStockMutation as useUpdateKitchenInventoryMutation, 
    useGetInventoryQuery as useGetInventoryMasterQuery, 
    useCreateInventoryMutation as useCreateKitchenInventoryMutation 
} from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { exportToExcel } from "@/utils/exportToExcel";
import { 
    Download, 
    FilterX, 
    RefreshCcw, 
    Pencil, 
    Plus, 
    History, 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { 
    GridToolbar, 
    GridToolbarActions, 
    GridToolbarRow, 
    GridToolbarSearch, 
    GridToolbarSelect 
} from "@/components/ui/grid-toolbar";
import { formatAppDateTime } from "@/utils/dateFormat";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import KitchenInventoryBulkAdjustSheet from "@/components/KitchenInventoryBulkAdjustSheet";
import { motion } from "framer-motion";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";
import { cn } from "@/lib/utils";

/* ---------------- Types ---------------- */
type KitchenItem = {
    id: string;
    inventory_master_id: number;
    name: string;
    inventory_type: string;
    quantity: number | string;
    unit: string;
    reorder_level: number;
    is_active: boolean;
};

/* ---------------- Helpers ---------------- */
const parseAuditDetails = (details: any) => {
    try {
        return typeof details === "string" ? JSON.parse(details) : details;
    } catch {
        return null;
    }
};

const getAuditActionLabel = (audit: any) => {
    const event = audit.event_type?.toUpperCase();
    if (event === "CREATE") return "Stock Added";
    if (event === "UPDATE") return "Stock Updated";
    if (event === "ADJUST") return "Stock Adjusted";
    return event;
};

const getAuditChangeText = (details: any) => {
    if (!details) return "--";
    const { before, after, entity } = details;
    const unit = entity?.unit || "";
    
    if (!before) {
        return `Initialized with ${after?.quantity || 0} ${unit}`;
    }

    const diff = Number(after?.quantity || 0) - Number(before?.quantity || 0);
    const sign = diff >= 0 ? "+" : "";
    return `${before.quantity} ${unit} -> ${after.quantity} ${unit} (${sign}${diff.toFixed(2)})`;
};

/* ---------------- Component ---------------- */
export default function KitchenInventory() {
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const { myProperties, isInitializing, isLoading: myPropertiesLoading } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const [activeTab, setActiveTab] = useState<"inventory" | "audit">("inventory");
    const [inventoryPage, setInventoryPage] = useState(1);
    const [inventoryLimit, setInventoryLimit] = useState(10);
    const [auditPage, setAuditPage] = useState(1);
    const [auditLimit, setAuditLimit] = useState(10);

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [stockFilter, setStockFilter] = useState("");
    const [unitFilter, setUnitFilter] = useState("");

    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");
    const [bulkOpen, setBulkOpen] = useState(false);
    const [mode, setMode] = useState<"view" | "edit" | "add">("view");
    const [selectedItem, setSelectedItem] = useState<KitchenItem | null>(null);

    const [editForm, setEditForm] = useState({
        quantity: 0,
        unit: "",
        comments: ""
    });

    const [createForm, setCreateForm] = useState({
        inventory_master_id: null as number | null,
        quantity: 0,
        unit: "",
    });
    const [createErrors, setCreateErrors] = useState<any>({});

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const pathname = useLocation().pathname;
    const { permission } = usePermission(pathname);

    const { 
        data: kitchenInventory, 
        isLoading: kitchenInventoryLoading, 
        isFetching: kitchenInventoryFetching, 
        refetch: refetchInventory 
    } = useGetKitchenInventoryQuery({ 
        propertyId: selectedPropertyId,
        page: 1,
        limit: 1000
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    });

    const {
        data: inventoryAuditLogs,
        isLoading: logsLoading,
        isFetching: logsFetching,
        refetch: refetchLogs
    } = useGetAuditLogsQuery({
        tableName: "kitchen_inventory",
        propertyId: selectedPropertyId,
        page: auditPage,
        limit: auditLimit,
    }, {
        skip: !isLoggedIn || !selectedPropertyId || activeTab !== "audit"
    });

    const [itemAuditPage, setItemAuditPage] = useState(1);
    const [itemAuditLimit, setItemAuditLimit] = useState(5);
    const { data: auditLogs } = useGetAuditLogsQuery({
        tableName: "kitchen_inventory",
        eventId: selectedItem?.id,
        page: itemAuditPage,
        limit: itemAuditLimit,
    }, {
        skip: !selectedItem?.id || !sheetOpen || mode !== "view"
    });

    const { data: masterInventoryData } = useGetInventoryMasterQuery({
        propertyId: selectedPropertyId,
        page: 1,
        limit: 1000
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    });

    const masterInventory = useMemo(() => masterInventoryData?.data ?? [], [masterInventoryData]);

    const [adjustStock] = useUpdateKitchenInventoryMutation();
    const [createKitchenItem] = useCreateKitchenInventoryMutation();

    const inventoryUnitOptions = useMemo(() => {
        const units = (kitchenInventory?.data ?? []).map((item: KitchenItem) => item.unit).filter(Boolean);
        return Array.from(new Set(units));
    }, [kitchenInventory]);

    const historyActionOptions = ["CREATE", "UPDATE", "ADJUST"];

    const filteredKitchenInventory = useMemo(() => {
        let rows = kitchenInventory?.data ?? [];
        const q = searchQuery.toLowerCase();
        
        if (q) {
            rows = rows.filter((item: KitchenItem) =>
                item.name?.toLowerCase().includes(q) ||
                formatModuleDisplayId("kitchen", item.id).toLowerCase().includes(q)
            );
        }

        if (stockFilter === "low_stock") {
            rows = rows.filter((item: KitchenItem) => Number(item.quantity) <= (item.reorder_level || 0));
        }

        if (unitFilter) {
            rows = rows.filter((item: KitchenItem) => item.unit === unitFilter);
        }

        return rows;
    }, [kitchenInventory, searchQuery, stockFilter, unitFilter]);

    const inventoryTotalRecords = filteredKitchenInventory.length;
    const inventoryTotalPages = Math.max(1, Math.ceil(inventoryTotalRecords / inventoryLimit));
    const paginatedKitchenInventory = useMemo(() => {
        const start = (inventoryPage - 1) * inventoryLimit;
        return filteredKitchenInventory.slice(start, start + inventoryLimit);
    }, [filteredKitchenInventory, inventoryPage, inventoryLimit]);

    const filteredHistoryLogs = useMemo(() => {
        let rows = inventoryAuditLogs?.data ?? [];
        const q = historySearchQuery.toLowerCase();
        
        if (q) {
            rows = rows.filter((audit: any) => {
                const details = parseAuditDetails(audit.details);
                return (
                    details?.entity?.inventory_name?.toLowerCase().includes(q) ||
                    formatModuleDisplayId("kitchen", audit.event_id).toLowerCase().includes(q)
                );
            });
        }
        return rows;
    }, [inventoryAuditLogs, historySearchQuery]);

    const historyTotalRecords = inventoryAuditLogs?.pagination?.totalItems ?? filteredHistoryLogs.length;
    const historyTotalPages = inventoryAuditLogs?.pagination?.totalPages ?? 1;
    const paginatedHistoryLogs = filteredHistoryLogs; // API paginated

    const availableUnits = [
        { id: "Nos", label: "Nos" },
        { id: "Piece", label: "Piece" },
        { id: "Kilo Gram", label: "Kilo Gram" },
        { id: "Gram", label: "Gram" },
        { id: "Litre", label: "Litre" },
        { id: "Milliliter", label: "Milliliter" },
        { id: "Packet", label: "Packet" },
        { id: "Box", label: "Box" },
    ];

    const isItemUsable = useMemo(() => {
        if (!createForm.inventory_master_id) return false;
        const master = masterInventory.find(m => m.id === createForm.inventory_master_id);
        return master?.use_type === "usable";
    }, [createForm.inventory_master_id, masterInventory]);

    const openManage = (item: KitchenItem, m: "view" | "edit") => {
        setSelectedItem(item);
        setEditForm({
            quantity: Number(item.quantity),
            unit: item.unit || "",
            comments: ""
        });
        setMode(m);
        setSheetTab("summary");
        setSheetOpen(true);
    };

    const saveEdit = async () => {
        if (!selectedItem) return;
        const payload = {
            property_id: selectedPropertyId,
            inventory_master_id: selectedItem.inventory_master_id,
            quantity: editForm.quantity,
            unit: editForm.unit,
            comments: editForm.comments
        };

        const promise = adjustStock(payload).unwrap();
        toast.promise(promise, {
            pending: "Updating inventory...",
            success: "Inventory updated successfully",
            error: "Failed to update inventory"
        });

        await promise;
        setSheetOpen(false);
    };

    const createItem = async () => {
        const errors: any = {};
        if (!createForm.inventory_master_id) errors.inventory_master_id = "Please select an item";
        if (!createForm.quantity || createForm.quantity <= 0) errors.quantity = "Enter a valid quantity";
        if (isItemUsable && !createForm.unit) errors.unit = "Please select a unit";

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }

        const payload = {
            property_id: selectedPropertyId,
            ...createForm
        };

        const promise = createKitchenItem(payload).unwrap();
        toast.promise(promise, {
            pending: "Adding inventory item...",
            success: "Item added successfully",
            error: "Failed to add item"
        });

        await promise;
        setSheetOpen(false);
        setCreateForm({ inventory_master_id: null, quantity: 0, unit: "" });
        setCreateErrors({});
    };

    const resetInventoryFilters = () => {
        setSearchInput("");
        setSearchQuery("");
        setStockFilter("");
        setUnitFilter("");
        setInventoryPage(1);
    };

    const resetHistoryFilters = () => {
        setHistorySearchInput("");
        setHistorySearchQuery("");
        setHistoryActionFilter("");
        setAuditPage(1);
    };

    const refreshInventoryGrid = () => {
        if (kitchenInventoryFetching) return;
        apiToast(refetchInventory(), "Inventory refreshed");
    };

    const refreshHistoryGrid = () => {
        if (logsFetching) return;
        apiToast(refetchLogs(), "History logs refreshed");
    };

    const apiToast = (promise: any, successMsg: string) => {
        toast.promise(promise, {
            pending: "Processing...",
            success: successMsg,
            error: "Operation failed"
        });
    };

    const exportKitchenSheet = () => {
        if (!filteredKitchenInventory.length) return toast.info("No rows to export");
        const formatted = filteredKitchenInventory.map((item: KitchenItem) => ({
            "Item ID": formatModuleDisplayId("kitchen", item.id),
            "Name": item.name,
            "Type": item.inventory_type,
            "Stock": item.quantity,
            "Unit": item.unit || "--",
            "Reorder": item.reorder_level || 0,
            "Status": item.is_active ? "Active" : "Inactive",
        }));
        exportToExcel(formatted, "Kitchen-Inventory.xlsx");
        toast.success("Export completed");
    };

    const exportHistoryLogs = () => {
        if (!filteredHistoryLogs.length) return toast.info("No history rows to export");
        const formatted = filteredHistoryLogs.map((audit: any) => {
            const details = parseAuditDetails(audit.details);
            return {
                ITEM: details?.entity?.inventory_name || "--",
                ACTION: getAuditActionLabel(audit),
                CHANGE: getAuditChangeText(details),
                USER: `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim(),
                DATE: formatAppDateTime(audit.created_on),
            };
        });
        exportToExcel(formatted, "Kitchen-Inventory-History.xlsx");
        toast.success("Export completed");
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="flex flex-col">
            <section className="flex flex-col p-6 lg:p-8 gap-6">
                {/* Header */}
                <div className="flex justify-between items-center shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold">Kitchen Inventory</h1>
                        <p className="text-sm text-muted-foreground">
                            Stock, costing & procurement management
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
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
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

                        {permission?.can_create && (
                            <Button variant="hero" onClick={() => {
                                setMode("add");
                                setSheetOpen(true);
                            }}>
                                <Plus className="h-4 w-4 mr-2" />Add Item
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border flex">
                    <button
                        onClick={() => setActiveTab("inventory")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            activeTab === "inventory"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Inventory
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

                {activeTab === "inventory" && (
                    <div className="flex-1">
                        <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                            <div className="w-full">
                                <GridToolbar className="border-b-0">
                                    <GridToolbarRow className="gap-2">
                                        <GridToolbarSearch
                                            value={searchInput}
                                            onChange={setSearchInput}
                                            onSearch={() => {
                                                setSearchQuery(searchInput.trim());
                                                setInventoryPage(1);
                                            }}
                                        />

                                        <GridToolbarSelect
                                            label="Stock"
                                            value={stockFilter}
                                            onChange={(value) => {
                                                setStockFilter(value);
                                                setInventoryPage(1);
                                            }}
                                            options={[
                                                { label: "All", value: "" },
                                                { label: "Low Stock", value: "low_stock" },
                                            ]}
                                        />

                                        <GridToolbarSelect
                                            label="Unit"
                                            value={unitFilter}
                                            onChange={(value) => {
                                                setUnitFilter(value);
                                                setInventoryPage(1);
                                            }}
                                            options={[
                                                { label: "All", value: "" },
                                                ...inventoryUnitOptions.map((unit) => ({
                                                    label: String(unit),
                                                    value: String(unit),
                                                })),
                                            ]}
                                        />

                                        <GridToolbarActions
                                            className="gap-1 justify-end"
                                            actions={[
                                                {
                                                    key: "export",
                                                    label: "Export Inventory",
                                                    icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: exportKitchenSheet,
                                                },
                                                {
                                                    key: "reset",
                                                    label: "Reset Filters",
                                                    icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: resetInventoryFilters,
                                                },
                                                {
                                                    key: "refresh",
                                                    label: "Refresh Data",
                                                    icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: refreshInventoryGrid,
                                                    disabled: kitchenInventoryFetching,
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
                                            label: "Item ID",
                                            headClassName: "text-center",
                                            cellClassName: "text-center font-medium min-w-[90px]",
                                            render: (item: KitchenItem) => (
                                                <button
                                                    type="button"
                                                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                                    onClick={() => openManage(item, "view")}
                                                >
                                                    {formatModuleDisplayId("kitchen", item.id)}
                                                </button>
                                            ),
                                        },
                                        {
                                            label: "Item",
                                            key: "name",
                                            cellClassName: "font-semibold text-foreground min-w-[180px]",
                                        },
                                        {
                                            label: "Stock",
                                            headClassName: "text-center",
                                            cellClassName: "text-center font-medium min-w-[100px]",
                                            render: (item: any) => {
                                                const lowStock = Number(item.quantity) <= (item.reorder_level || 0);
                                                return (
                                                    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", lowStock ? "bg-red-50 text-red-600 border border-red-100" : "bg-muted/30 text-foreground")}>
                                                        {item.quantity}
                                                    </span>
                                                );
                                            },
                                        },
                                        {
                                            label: "Unit",
                                            cellClassName: "text-muted-foreground min-w-[100px]",
                                            render: (item: any) => item.unit || "—",
                                        },
                                    ] as ColumnDef[]}
                                    data={paginatedKitchenInventory}
                                    loading={kitchenInventoryLoading || kitchenInventoryFetching || isInitializing}
                                    emptyText="No inventory items found"
                                    minWidth="760px"
                                    actionLabel=""
                                    actionClassName="text-center w-[60px]"
                                    showActions={permission?.can_create}
                                    actions={(item: KitchenItem) => (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    onClick={() => openManage(item, "edit")}
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Update Item</TooltipContent>
                                        </Tooltip>
                                    )}
                                    enablePagination
                                    paginationProps={{
                                        page: inventoryPage,
                                        totalPages: inventoryTotalPages,
                                        setPage: setInventoryPage,
                                        totalRecords: inventoryTotalRecords,
                                        limit: inventoryLimit,
                                        onLimitChange: (val) => { setInventoryLimit(val); setInventoryPage(1); },
                                        disabled: kitchenInventoryFetching,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "audit" && (
                    <div className="flex-1">
                        <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                            <div className="w-full">
                                <GridToolbar className="border-b-0">
                                    <GridToolbarRow className="gap-2">
                                        <GridToolbarSearch
                                            value={historySearchInput}
                                            onChange={setHistorySearchInput}
                                            onSearch={() => {
                                                setHistorySearchQuery(historySearchInput.trim());
                                                setAuditPage(1);
                                            }}
                                        />

                                        <GridToolbarSelect
                                            label="Action"
                                            value={historyActionFilter}
                                            onChange={(value) => {
                                                setHistoryActionFilter(value);
                                                setAuditPage(1);
                                            }}
                                            options={[
                                                { label: "All", value: "" },
                                                ...historyActionOptions.map((action) => ({
                                                    label: String(action),
                                                    value: String(action),
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
                                                    disabled: logsFetching,
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
                                            label: "Item ID",
                                            headClassName: "text-center",
                                            cellClassName: "text-center font-medium min-w-[100px]",
                                            render: (audit: any) => (
                                                <span className="font-medium text-primary">
                                                    {formatModuleDisplayId("kitchen", audit.event_id)}
                                                </span>
                                            ),
                                        },
                                        {
                                            label: "Item",
                                            headClassName: "w-[220px]",
                                            cellClassName: "font-semibold text-foreground min-w-[220px]",
                                            render: (audit: any) => {
                                                const details = parseAuditDetails(audit.details);
                                                return details?.entity?.inventory_name || "—";
                                            },
                                        },
                                        {
                                            label: "Action",
                                            headClassName: "text-center w-[140px]",
                                            cellClassName: "text-center font-medium min-w-[140px]",
                                            render: (audit: any) => (
                                                <span className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded bg-primary/10 text-primary">
                                                    {getAuditActionLabel(audit)}
                                                </span>
                                            ),
                                        },
                                        {
                                            label: "Change",
                                            headClassName: "w-[320px]",
                                            cellClassName: "min-w-[320px] whitespace-normal text-xs text-primary/80 font-medium",
                                            render: (audit: any) => getAuditChangeText(parseAuditDetails(audit.details)),
                                        },
                                        {
                                            label: "User",
                                            headClassName: "w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => `${audit.user_first_name} ${audit.user_last_name}`,
                                        },
                                        {
                                            label: "Date",
                                            headClassName: "w-[180px]",
                                            cellClassName: "text-[10px] text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => formatAppDateTime(audit.created_on),
                                        },
                                    ] as ColumnDef[]}
                                    data={paginatedHistoryLogs}
                                    loading={logsLoading || logsFetching || isInitializing}
                                    emptyText="No audit logs found"
                                    minWidth="860px"
                                    enablePagination
                                    paginationProps={{
                                        page: auditPage,
                                        totalPages: historyTotalPages,
                                        setPage: setAuditPage,
                                        totalRecords: historyTotalRecords,
                                        limit: auditLimit,
                                        onLimitChange: (val) => { setAuditLimit(val); setAuditPage(1); },
                                        disabled: logsFetching,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* SIDE SHEET */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {mode === "view" ? `Kitchen Inventory [${selectedItem?.id ? `#${formatModuleDisplayId("kitchen", selectedItem.id)}` : "..."}]` : mode === "edit" ? `Update Kitchen Inventory [${selectedItem?.id ? `#${formatModuleDisplayId("kitchen", selectedItem.id)}` : "..."}]` : "Add Item"}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium  tracking-wider">
                                    {mode === "view" ? "Detailed stock and audit information" : "Modify stock levels and unit configuration"}
                                </p>
                            </div>
                        </SheetHeader>

                        {mode === "view" && selectedItem && (
                            <div className="space-y-6">
                                {/* Sheet Tabs */}
                                <div className="border-b border-border flex">
                                    <button
                                        onClick={() => setSheetTab("summary")}
                                        className={cn(
                                            "px-4 py-2 text-xs font-bold  tracking-widest transition-all border-b-2 -mb-[2px]",
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
                                    <PropertyViewSection title="Inventory Overview" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        <ViewField label="Item Name" value={selectedItem.name} className="sm:col-span-2" />
                                        <ViewField label="Category" value={selectedItem.inventory_type} />
                                        <ViewField label="Reorder Level" value={selectedItem.reorder_level} />
                                        <ViewField label="Current Stock" value={`${selectedItem.quantity} ${selectedItem.unit}`} />
                                        <ViewField label="Status" value={selectedItem.is_active ? "Active" : "Inactive"} />
                                    </PropertyViewSection>
                                )}

                                {sheetTab === "history" && (
                                    <div className="space-y-3">
                                      
                                        
                                        {!auditLogs?.data?.length ? (
                                            <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                                <p className="text-xs text-muted-foreground italic">No recent activity logs.</p>
                                            </div>
                                        ) : (
                                            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                                <AppDataGrid
                                                    columns={[
                                                        { 
                                                            label: "Action", 
                                                            render: (log: any) => (
                                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                                    {getAuditActionLabel(log)}
                                                                </span>
                                                            ) 
                                                        },
                                                        { 
                                                            label: "Change", 
                                                            cellClassName: "text-[11px] font-medium text-foreground/80",
                                                            render: (log: any) => getAuditChangeText(parseAuditDetails(log.details)) 
                                                        },
                                                        { 
                                                            label: "Date", 
                                                            cellClassName: "text-[10px] text-muted-foreground",
                                                            render: (log: any) => formatAppDateTime(log.created_on) 
                                                        }
                                                    ] as ColumnDef[]}
                                                    data={auditLogs.data}
                                                    rowKey={(log: any) => log.id}
                                                    minWidth="300px"
                                                    enablePagination
                                                    paginationProps={{
                                                        page: itemAuditPage,
                                                        totalPages: auditLogs?.pagination?.totalPages ?? 1,
                                                        setPage: setItemAuditPage,
                                                        totalRecords: auditLogs?.pagination?.totalItems ?? auditLogs?.data?.length ?? 0,
                                                        limit: itemAuditLimit,
                                                        onLimitChange: (v) => { setItemAuditLimit(v); setItemAuditPage(1); },
                                                        disabled: !auditLogs,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                                    <Button variant="heroOutline" onClick={() => setSheetOpen(false)}>Close</Button>
                                </div>
                            </div>
                        )}

                        {mode === "edit" && selectedItem && (
                            <div className="space-y-5">
                                <div className="rounded-[5px] border border-primary/50 bg-background p-5 shadow-sm space-y-5">
                                    <h3 className="text-[11px] font-semibold text-primary/90 uppercase tracking-[0.16em] border-b border-primary/50 pb-2">
                                        Update Stock Levels
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Quantity *</Label>
                                            <Input
                                                type="text"
                                                className="h-10 focus-visible:ring-1 focus-visible:ring-primary font-semibold"
                                                value={editForm.quantity}
                                                onChange={(e) => setEditForm(f => ({ ...f, quantity: +normalizeNumberInput(e.target.value) }))}
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stock Unit *</Label>
                                            <NativeSelect
                                                className="w-full h-10 border border-border bg-background rounded-[3px] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                value={editForm.unit}
                                                onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))}
                                            >
                                                <option value="">-- No Unit --</option>
                                                {availableUnits.map(u => (
                                                    <option key={u.id} value={u.id}>{u.label}</option>
                                                ))}
                                            </NativeSelect>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Audit Comments</Label>
                                            <textarea
                                                className="w-full min-h-[100px] border border-border bg-background rounded-[3px] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                                placeholder="Explain the reason for this manual update..."
                                                value={editForm.comments}
                                                onChange={(e) => setEditForm(f => ({ ...f, comments: e.target.value }))}
                                                maxLength={255}
                                            />
                                            <div className="text-[10px] text-right text-muted-foreground font-bold">{editForm.comments.length}/255</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-border mt-4">
                                    <Button variant="heroOutline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                                    <Button variant="hero" onClick={saveEdit}>Update</Button>
                                </div>
                            </div>
                        )}

                        {mode === "add" && (
                            <div className="space-y-4 mt-6">
                                <div className="rounded-[5px] border border-primary/50 bg-background p-5 shadow-sm space-y-5">
                                    <h3 className="text-[11px] font-semibold text-primary/90 uppercase tracking-[0.16em] border-b border-primary/50 pb-2">
                                     Item Details
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inventory Item *</Label>
                                            <NativeSelect
                                                className={`w-full h-10 rounded-[3px] px-3 border bg-background mt-1 ${createErrors.inventory_master_id ? "border-red-500" : "border-border"}`}
                                                value={createForm.inventory_master_id ?? ""}
                                                onChange={(e) => setCreateForm(f => ({ ...f, inventory_master_id: Number(e.target.value) }))}
                                            >
                                                <option value="" disabled>-- Please Select --</option>
                                                {masterInventory?.filter(item => item.is_active).map(item => (
                                                    <option key={item.id} value={item.id}>{item.name}</option>
                                                ))}
                                            </NativeSelect>
                                            {createErrors.inventory_master_id && <p className="text-xs text-red-500 mt-1">{createErrors.inventory_master_id}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantity *</Label>
                                                <Input
                                                    className={`bg-background mt-1 ${createErrors.quantity ? "border-red-500" : ""}`}
                                                    value={createForm.quantity}
                                                    onChange={(e) => setCreateForm(f => ({ ...f, quantity: +normalizeNumberInput(e.target.value) }))}
                                                />
                                                {createErrors.quantity && <p className="text-xs text-red-500 mt-1">{createErrors.quantity}</p>}
                                            </div>
                                            {isItemUsable && (
                                                <div>
                                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit *</Label>
                                                    <NativeSelect
                                                        className={`w-full h-10 rounded-[3px] px-3 border bg-background mt-1 ${createErrors.unit ? "border-red-500" : "border-border"}`}
                                                        value={createForm.unit ?? ""}
                                                        onChange={(e) => setCreateForm(f => ({ ...f, unit: e.target.value }))}
                                                    >
                                                        <option value="" disabled>Select unit</option>
                                                        {availableUnits.map(u => (
                                                            <option key={u.id} value={u.id}>{u.label}</option>
                                                        ))}
                                                    </NativeSelect>
                                                    {createErrors.unit && <p className="text-xs text-red-500 mt-1">{createErrors.unit}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-border mt-4">
                                    <Button variant="heroOutline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                                    <Button variant="hero" onClick={createItem}>Create Item</Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </SheetContent>
            </Sheet>

            <KitchenInventoryBulkAdjustSheet
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                propertyId={selectedPropertyId}
                masterInventory={masterInventory}
                availableUnits={availableUnits}
                currentInventory={kitchenInventory?.data}
                onSubmit={(rows) => {
                    const promise = Promise.all(rows.map(r => adjustStock(r).unwrap()));
                    toast.promise(promise, {
                        pending: "Applying bulk adjustments...",
                        success: "Bulk stock update successful",
                        error: "Failed to apply bulk adjustments"
                    });
                    setBulkOpen(false);
                }}
            />
        </div>
    );
}
