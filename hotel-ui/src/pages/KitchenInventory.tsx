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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAdjustStockMutation, useCreateInventoryMutation, useGetInventoryMasterByTypesQuery, useGetKitchenInventoryQuery, useLazyGetKitchenInventoryQuery, useGetLogsByTableQuery, useGetLogsQuery, useUpdateInventoryMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { normalizeNumberInput, normalizeSignedNumberInput } from "@/utils/normalizeTextInput";
import KitchenInventoryBulkAdjustSheet from "@/components/KitchenInventoryBulkAdjustSheet";
import { AppDataGrid, DataGridPagination, type ColumnDef } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Plus, Pencil, RefreshCcw } from "lucide-react";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { GridBadge } from "@/components/ui/grid-badge";
import { motion } from "framer-motion";
import { formatAppDateTime } from "@/utils/dateFormat";

type KitchenItem = {
    id: string;
    property_id: string;
    inventory_master_id: number;
    name: string;   // joined from inventory_master
    inventory_type: string;   // optional join
    quantity: string;
    unit: string;
};

// CREATE
function buildCreateKitchenItemPayload(data, propertyId) {

    return {
        property_id: propertyId,
        inventory_master_id: data.inventory_master_id,
        quantity: data.quantity,
        unit: data.unit
    };

}

function buildUpdateKitchenItemPayload(data) {

    return {
        quantity: data.quantity,
        unit: data.unit,
        comments: data.comments
    };
}
// UI
export default function KitchenInventory() {
    const [inventoryPage, setInventoryPage] = useState(1);
    const [auditPage, setAuditPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");
    const [stockFilter, setStockFilter] = useState("");
    const [unitFilter, setUnitFilter] = useState("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit" | "view">("view");

    const [selectedItem, setSelectedItem] = useState<KitchenItem | null>(null);

    const [editForm, setEditForm] = useState({
        id: 0,
        quantity: 0,
        unit: "",
        comments: ""
    });

    const [createForm, setCreateForm] = useState({
        inventory_master_id: null,
        quantity: 0,
        unit: ""
    });
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [createSubmitted, setCreateSubmitted] = useState(false);
    const [activeTab, setActiveTab] = useState<"inventory" | "audit">("inventory");
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustForm, setAdjustForm] = useState({
        quantity: "",
        unit: ""
    });
    const [itemAuditPage, setItemAuditPage] = useState(1);
    const [itemAuditLimit, setItemAuditLimit] = useState(20);
    const [inventoryLimit, setInventoryLimit] = useState(10);
    const [auditLimit, setAuditLimit] = useState(10);
    const [bulkOpen, setBulkOpen] = useState(false);

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

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    const { 
        myProperties, 
        isMultiProperty, 
        isInitializing, 
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);
 
    const [getExportInventory, { isFetching: exportingKitchen }] = useLazyGetKitchenInventoryQuery();

    const {
        data: kitchenInventory,
        isLoading: kitchenInventoryLoading,
        isFetching: kitchenInventoryFetching,
        refetch: refetchKitchenInventory
    } = useGetKitchenInventoryQuery({
        propertyId: selectedPropertyId,
        page: 1,
        limit: 1000,
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: masterInventory } = useGetInventoryMasterByTypesQuery({ type: "Kitchen", propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const {
        data: logs,
        isLoading: logsLoading,
        isFetching: logsFetching,
        refetch: refetchLogs
    } = useGetLogsByTableQuery({ tableName: "kitchen_inventory", propertyId: selectedPropertyId, page: 1, limit: 1000 }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: auditLogs } = useGetLogsQuery({ tableName: "kitchen_inventory", eventId: editForm.id, page: itemAuditPage, limit: itemAuditLimit }, {
        skip: !isLoggedIn || !editForm.id
    })

    const [createInventory] = useCreateInventoryMutation()
    const [updateInventory] = useUpdateInventoryMutation()
    const [adjustStock] = useAdjustStockMutation()


    const isItemUsable = useMemo(() => {
        if (!masterInventory || !createForm.inventory_master_id) return false;

        const item = masterInventory.find(
            x => x.id == createForm.inventory_master_id
        );

        return item?.use_type === "usable";
    }, [createForm.inventory_master_id, masterInventory]);



    useEffect(() => {
        setInventoryPage(1);
        setAuditPage(1);
    }, [selectedPropertyId, searchQuery, stockFilter, unitFilter, historySearchQuery, historyActionFilter]);

    useEffect(() => {
        if (searchInput.trim() === "") {
            setSearchQuery("");
            setInventoryPage(1);
        }
    }, [searchInput]);

    useEffect(() => {
        if (historySearchInput.trim() === "") {
            setHistorySearchQuery("");
            setAuditPage(1);
        }
    }, [historySearchInput]);
    /* ---------------- Handlers ---------------- */

    const openManage = (item: KitchenItem, m: "view" | "edit" = "view") => {
        setSelectedItem(item);
        setEditForm({
            quantity: Number(item.quantity),
            unit: item.unit || "",
            id: +item.id,
            comments: ""
        });
        setMode(m);
        setSheetOpen(true);
    };

    const openAdd = () => {
        setMode("add");
        setCreateForm({
            inventory_master_id: null,
            quantity: 0,
            unit: ""
        });
        setCreateSubmitted(false);
        setCreateErrors({});
        setSheetOpen(true);
    };

    const saveEdit = () => {
        const payload = buildUpdateKitchenItemPayload(editForm);
        updateInventory({ id: editForm.id, payload })
        setSheetOpen(false)
    };

    const createItem = () => {

        setCreateSubmitted(true);

        const errors: Record<string, string> = {};

        if (!createForm.inventory_master_id) {
            errors.inventory_master_id = "Please select inventory item";
        }

        if (!createForm.quantity || createForm.quantity <= 0) {
            errors.quantity = "Quantity is required";
        }

        if (isItemUsable && !createForm.unit) {
            errors.unit = "Unit is required";
        }

        if (Object.keys(errors).length > 0) {
            setCreateErrors(errors);
            return;
        }

        setCreateErrors({}); // clear errors

        const payload = buildCreateKitchenItemPayload(createForm, selectedPropertyId);

        const promise = createInventory(payload)
            .unwrap()
            .catch((err) => {
                throw new Error(
                    err?.data?.message ||
                    err?.data?.error ||
                    err?.message ||
                    "Error creating inventory item"
                );
            });

        toast.promise(promise, {
            pending: "Creating please wait",
            success: "Item created successfully",
            error: {
                render({ data }) {
                    const err = data as Error;
                    return err?.message;
                }
            }
        });

        setCreateOpen(false);

        setCreateForm({
            inventory_master_id: null,
            quantity: 0,
            unit: ""
        });

        setCreateSubmitted(false);
    };

    const handleAdjustStock = () => {

        if (!selectedItem) return;

        if (!adjustForm.quantity) {
            toast.error("Quantity required");
            return;
        }

        const payload = {
            property_id: selectedPropertyId,
            inventory_master_id: selectedItem.inventory_master_id,
            quantity: adjustForm.quantity,
            unit: adjustForm.unit || selectedItem.unit
        };

        const promise = adjustStock(payload)
            .unwrap()
            .catch(err => {
                throw new Error(
                    err?.data?.message ||
                    err?.message ||
                    "Failed to adjust stock"
                );
            });

        toast.promise(promise, {
            pending: "Adjusting stock...",
            success: "Stock updated successfully",
            error: {
                render({ data }) {
                    return (data as Error)?.message;
                }
            }
        });

        setAdjustOpen(false);

        setAdjustForm({
            quantity: "",
            unit: ""
        });
    };

    function parseAuditDetails(details: any) {
        try {
            if (typeof details === "string") {
                return JSON.parse(details);
            }
            return details;
        } catch {
            return null;
        }
    }

    function getAuditActionLabel(log: any) {
        const action = log.event_type;
        const tone =
            action === "CREATE" ? "success" :
            action === "DELETE" ? "danger" :
            "info";
        
        return (
            <GridBadge tone={tone}>
                {action}
            </GridBadge>
        );
    }

    function getAuditChangeText(details: any) {
        if (!details) return "--";

        const before = details.before;
        const after = details.after;

        if (!before && after) {
            return (
                <span className="text-emerald-600 font-semibold text-xs py-0.5">
                    Added {after.quantity} {after.unit || ""}
                </span>
            );
        }

        if (before && after) {
            const qtyChanged = before.quantity !== after.quantity;
            const unitChanged = before.unit !== after.unit;
            
            return (
                <div className="flex flex-col gap-0.5 py-0.5">
                    {qtyChanged && (
                        <span className="text-sm">
                            Qty: <span className="text-muted-foreground/60 line-through decoration-slate-300">{before.quantity} {before.unit || ""}</span>
                            <span className="mx-2 text-primary">→</span>
                            <span className="font-bold text-slate-700">{after.quantity} {after.unit || ""}</span>
                        </span>
                    )}
                    {unitChanged && (
                        <span className="text-[10px] font-bold text-blue-600/90 italic uppercase tracking-tight">
                            Unit changed: {before.unit || "None"} → {after.unit || "None"}
                        </span>
                    )}
                    {!qtyChanged && !unitChanged && <span className="text-muted-foreground text-xs italic">No visible change</span>}
                </div>
            );
        }

        return "--";
    }

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)


    const inventoryUnitOptions = useMemo(() => {
        const units = Array.from(
            new Set((kitchenInventory?.data ?? []).map((item: KitchenItem) => item.unit).filter(Boolean))
        );

        return units.sort((a, b) => String(a).localeCompare(String(b)));
    }, [kitchenInventory?.data]);

    const cleanSearchQuery = useMemo(() => {
        if (!searchQuery) return "";
        const unitLabels = availableUnits.map((unit) => unit.label.toLowerCase());
        const stockLabels = ["low stock"];
        const filterKeywords = [...unitLabels, ...stockLabels];

        return filterKeywords
            .sort((left, right) => right.length - left.length)
            .reduce((query, keyword) => {
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return query.replace(new RegExp(`\\b${escapedKeyword}\\b`, "gi"), " ");
            }, searchQuery)
            .replace(/\s+/g, " ")
            .trim();
    }, [searchQuery]);

    const filteredKitchenInventory = useMemo(() => {
        const rows = kitchenInventory?.data ?? [];
        const query = cleanSearchQuery.toLowerCase();

        return rows.filter((item: any) => {
            const matchesStock = !stockFilter || (
                stockFilter === "low_stock" &&
                Number(item.quantity) <= Number(item.reorder_level || 0)
            );
            const matchesUnit = !unitFilter || item.unit === unitFilter;
            
            const searchableFields = [
                item.name,
                item.inventory_type,
                formatModuleDisplayId("kitchen", item.id),
                item.unit
            ];
            const matchesSearch = !query || searchableFields.some(f => 
                String(f ?? "").toLowerCase().includes(query)
            );

            return matchesStock && matchesUnit && matchesSearch;
        });
    }, [kitchenInventory?.data, stockFilter, unitFilter, cleanSearchQuery]);

    const filteredHistoryLogs = useMemo(() => {
        const rows = logs?.data ?? [];
        const query = historySearchQuery.trim().toLowerCase();

        return rows.filter((audit: any) => {
            const details = parseAuditDetails(audit.details);
            const itemName = details?.entity?.inventory_name || "";
            const userName = `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim();

            const matchesQuery = !query || [
                itemName,
                audit.event_type,
                userName,
                formatAppDateTime(audit.created_on),
            ].some((field) => String(field ?? "").toLowerCase().includes(query));

            const matchesAction = !historyActionFilter || audit.event_type === historyActionFilter;

            return matchesQuery && matchesAction;
        });
    }, [logs?.data, historySearchQuery, historyActionFilter]);

    const inventoryTotalRecords = filteredKitchenInventory.length;
    const inventoryTotalPages = Math.max(1, Math.ceil(inventoryTotalRecords / inventoryLimit));
    const paginatedKitchenInventory = useMemo(() => {
        const start = (inventoryPage - 1) * inventoryLimit;
        return filteredKitchenInventory.slice(start, start + inventoryLimit);
    }, [filteredKitchenInventory, inventoryPage, inventoryLimit]);

    const historyTotalRecords = filteredHistoryLogs.length;
    const historyTotalPages = Math.max(1, Math.ceil(historyTotalRecords / auditLimit));
    const paginatedHistoryLogs = useMemo(() => {
        const start = (auditPage - 1) * auditLimit;
        return filteredHistoryLogs.slice(start, start + auditLimit);
    }, [filteredHistoryLogs, auditPage, auditLimit]);

    useEffect(() => {
        if (inventoryPage > inventoryTotalPages) {
            setInventoryPage(inventoryTotalPages);
        }
    }, [inventoryPage, inventoryTotalPages]);

    useEffect(() => {
        if (auditPage > historyTotalPages) {
            setAuditPage(historyTotalPages);
        }
    }, [auditPage, historyTotalPages]);

    const historyActionOptions = useMemo(() => {
        const actions = Array.from(
            new Set((logs?.data ?? []).map((audit: any) => audit.event_type).filter(Boolean))
        );

        return actions.sort((a, b) => String(a).localeCompare(String(b)));
    }, [logs?.data]);

    const resetInventoryFilters = () => {
        setSearchInput("");
        setSearchQuery("");
        setStockFilter("");
        setUnitFilter("");
        setInventoryPage(1);
    };

    const refreshInventoryGrid = async () => {
        if (kitchenInventoryFetching) return;

        const toastId = toast.loading("Refreshing data...");

        try {
            await refetchKitchenInventory();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh");
        }
    };

    const exportKitchenSheet = () => {
        const items = filteredKitchenInventory;

        if (!items.length) {
            toast.info("No inventory rows to export");
            return;
        }

        const formatted = items.map((item: KitchenItem) => ({
            "Item ID": formatModuleDisplayId("kitchen", item.id),
            "Item": item.name,
            "Category": item.inventory_type || "--",
            "Stock": item.quantity,
            "Unit": item.unit || "--",
        }));

        exportToExcel(formatted, "Kitchen-Inventory.xlsx");
        toast.success("Export completed");
    };

    const resetHistoryFilters = () => {
        setHistorySearchInput("");
        setHistorySearchQuery("");
        setHistoryActionFilter("");
        setAuditPage(1);
    };

    const refreshHistoryGrid = async () => {
        if (logsFetching) return;

        const toastId = toast.loading("Refreshing data...");

        try {
            await refetchLogs();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh");
        }
    };

    const exportHistoryLogs = () => {
        const logsToExport = filteredHistoryLogs;

        if (!logsToExport.length) {
            toast.info("No history rows to export");
            return;
        }

        const formatted = logsToExport.map((audit: any) => {
            const details = parseAuditDetails(audit.details);
            const before = details?.before;
            const after = details?.after;
            const entity = details?.entity;
            const unit = entity?.use_type === "usable" ? entity?.unit || "" : "";
            const change = before
                ? `${before.quantity}${unit ? ` ${unit}` : ""} -> ${after?.quantity}${unit ? ` ${unit}` : ""}`
                : `${after?.quantity}${unit ? ` ${unit}` : ""}`;

            return {
                ITEM: details?.entity?.inventory_name || "--",
                ACTION: audit.event_type,
                CHANGE: change,
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
                        <h1 className="text-2xl font-bold">Kitchen</h1>
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
                                    onChange={(e) => {
                                        setSelectedPropertyId(Number(e.target.value) || null);
                                    }}
                                    disabled={!(isSuperAdmin || isOwner)}
                                >
                                    <option value="">All properties</option>
                                    {!myPropertiesLoading &&
                                        myProperties?.properties?.map((property) => (
                                            <option key={property.id} value={property.id}>
                                                {property.brand_name}
                                            </option>
                                        ))}
                                </NativeSelect>
                            </div>
                        )}

                        {permission?.can_create && <Button variant="hero" onClick={() => setBulkOpen(true)}>
                             <Plus className="h-4 w-4 mr-none" />Adjust Stock
                        </Button>}
                    </div>
                </div>
                {/* Header Tabs */}
                <div className="border-b border-border flex">
                    <div
                        onClick={() => setActiveTab("inventory")}
                        className={`
                            px-4 py-3 text-sm font-medium cursor-pointer
                            border-b-2 transition
                            ${activeTab === "inventory"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Inventory
                    </div>

                    <div
                        onClick={() => setActiveTab("audit")}
                        className={`
                            px-4 py-3 text-sm font-medium cursor-pointer
                            border-b-2 transition
                            ${activeTab === "audit"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        History
                    </div>
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
                                    scrollable={false}
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
                                                    aria-label={`Open summary view for kitchen item ${formatModuleDisplayId("kitchen", item.id)}`}
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
                                                    <span className={lowStock ? "text-red-600" : "text-foreground"}>
                                                        {item.quantity}
                                                    </span>
                                                );
                                            },
                                        },
                                        {
                                            label: "Unit",
                                            cellClassName: "text-muted-foreground min-w-[100px]",
                                            render: (item: any) => item.unit || <span className="text-muted-foreground/40 italic">Not set</span>,
                                        },
                                    ] as ColumnDef[]}
                                    data={paginatedKitchenInventory}
                                    loading={kitchenInventoryLoading || kitchenInventoryFetching || isInitializing}
                                    emptyText="No inventory items found"
                                    minWidth="760px"
                                    actionLabel=""
                                    actionClassName="text-center w-[60px]"
                                    actions={(item: KitchenItem) => (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    onClick={() => openManage(item, "edit")}
                                                    aria-label={`View and edit details for inventory item ${item.name}`}
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View / Edit Details</TooltipContent>
                                        </Tooltip>
                                    )}
                                    enablePagination
                                    paginationProps={{
                                        page: inventoryPage,
                                        totalPages: inventoryTotalPages,
                                        setPage: setInventoryPage,
                                        totalRecords: inventoryTotalRecords,
                                        limit: inventoryLimit,
                                        onLimitChange: (value) => {
                                            setInventoryLimit(value);
                                            setInventoryPage(1);
                                        },
                                        disabled: kitchenInventoryLoading || kitchenInventoryFetching,
                                    }}
                                />
                            </div>
                        </div>
                    </div>)}

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
                                    scrollable={false}
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
                                            cellClassName: "font-medium min-w-[220px]",
                                            render: (audit: any) => {
                                                const details = parseAuditDetails(audit.details);
                                                return details?.entity?.inventory_name || "--";
                                            },
                                        },
                                        {
                                            label: "Action",
                                            headClassName: "text-center w-[140px]",
                                            cellClassName: "text-center font-medium min-w-[140px]",
                                            render: (audit: any) => getAuditActionLabel(audit),
                                        },
                                        {
                                            label: "Change",
                                            headClassName: "w-[320px]",
                                            cellClassName: "min-w-[320px] whitespace-normal break-words underline-offset-4",
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
                                            cellClassName: "text-xs text-muted-foreground min-w-[180px]",
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
                                        onLimitChange: (value) => {
                                            setAuditLimit(value);
                                            setAuditPage(1);
                                        },
                                        disabled: logsLoading || logsFetching,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}



                {/* Pagination */}
                <div className="shrink-0 flex justify-end text-sm">

                </div>

            </section>

            {/* ================= SIDE SHEET (ADD / EDIT / VIEW) ================= */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <div className="flex items-center justify-between w-full">
                                <SheetTitle>
                                    {mode === "add" ? "Add Inventory Item" : mode === "edit" ? "Edit Inventory Item" : "Inventory Item Details"}
                                </SheetTitle>
                                {permission?.can_create && mode === "view" && (
                                    <div className="flex gap-2 mr-6">
                                        <Button
                                            variant="heroOutline"
                                            onClick={() => setMode("edit")}
                                        >
                                            Update Stock
                                        </Button>
                                        <Button
                                            variant="heroOutline"
                                            onClick={() => {
                                                setAdjustOpen(true);
                                                setSheetOpen(false);
                                            }}
                                        >
                                            Add New Stock
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </SheetHeader>


                        {mode === "view" && selectedItem && (
                            <div className="space-y-6 mt-6">
                                <div className="space-y-3">
                                    <Info label="Name" value={selectedItem.name} />
                                    <Info label="Category" value={selectedItem.inventory_type} />
                                    <Info label="Stock" value={`${selectedItem.quantity}${selectedItem.unit ? ` ${selectedItem.unit}` : ""}`} />
                                </div>

                                {/* AUDIT HISTORY */}
                                <div className="pt-6">
                                    <h3 className="text-sm font-semibold mb-3">Audit History</h3>
                                    {!auditLogs?.data?.length ? (
                                        <p className="text-sm text-muted-foreground">No audit history found.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="border rounded-[3px] overflow-hidden">
                                                <AppDataGrid
                                                    columns={[
                                                        { label: "Action", headClassName: "text-center", cellClassName: "text-center font-medium", render: (log: any) => getAuditActionLabel(log) },
                                                        { label: "Change", render: (log: any) => getAuditChangeText(parseAuditDetails(log.details)) },
                                                        { label: "User", cellClassName: "text-muted-foreground", render: (log: any) => `${log.user_first_name} ${log.user_last_name}` },
                                                        { label: "Date", cellClassName: "text-xs text-muted-foreground", render: (log: any) => formatAppDateTime(log.created_on) }
                                                    ] as ColumnDef[]}
                                                    data={auditLogs.data}
                                                    rowKey={(log: any) => log.id}
                                                    minWidth="400px"
                                                    className="mt-0"
                                                />
                                            </div>
                                            <DataGridPagination
                                                page={itemAuditPage}
                                                totalPages={auditLogs?.pagination?.totalPages ?? 1}
                                                setPage={setItemAuditPage}
                                                totalRecords={auditLogs?.pagination?.totalItems ?? auditLogs?.pagination?.total ?? auditLogs?.data?.length ?? 0}
                                                limit={itemAuditLimit}
                                                onLimitChange={(v) => { setItemAuditLimit(v); setItemAuditPage(1); }}
                                                disabled={!auditLogs}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {mode === "edit" && selectedItem && (
                            <div className="space-y-6 mt-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label>Update {selectedItem.name} Quantity</Label>
                                        <Input
                                            type="text"
                                            className="bg-background"
                                            value={editForm.quantity}
                                            onChange={(e) => setEditForm(f => ({ ...f, quantity: +normalizeNumberInput(e.target.value) }))}
                                        />
                                        <div className="space-y-1 mt-4">
                                            <Label>Unit</Label>
                                            <NativeSelect
                                                className="w-full h-10 rounded px-3 border border-border bg-background"
                                                value={editForm.unit}
                                                onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))}
                                            >
                                                <option value="">-- No Unit --</option>
                                                {availableUnits.map(u => (
                                                    <option key={u.id} value={u.id}>{u.label}</option>
                                                ))}
                                            </NativeSelect>
                                        </div>
                                        <div className="space-y-1 mt-4">
                                            <Label>Comments</Label>
                                            <textarea
                                                className="w-full min-h-[50px] rounded-[3px] border px-3 py-2 text-sm bg-background"
                                                value={editForm.comments}
                                                onChange={(e) => setEditForm(f => ({ ...f, comments: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "add" && (
                            <div className="space-y-4 mt-6">
                                <div>
                                    <Label>Inventory Item *</Label>
                                    <NativeSelect
                                        className={`w-full h-10 rounded px-3 border bg-background ${createErrors.inventory_master_id ? "border-red-500" : "border-border"}`}
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
                                        <Label>Quantity*</Label>
                                        <Input
                                            className={`bg-background ${createErrors.quantity ? "border-red-500" : ""}`}
                                            value={createForm.quantity}
                                            onChange={(e) => setCreateForm(f => ({ ...f, quantity: +normalizeNumberInput(e.target.value) }))}
                                        />
                                        {createErrors.quantity && <p className="text-xs text-red-500 mt-1">{createErrors.quantity}</p>}
                                    </div>
                                    {isItemUsable && (
                                        <div>
                                            <Label>Unit*</Label>
                                            <NativeSelect
                                                className={`w-full h-10 rounded px-3 border bg-background ${createErrors.unit ? "border-red-500" : "border-border"}`}
                                                value={createForm.unit ?? ""}
                                                onChange={(e) => setCreateForm(f => ({ ...f, unit: e.target.value }))}
                                            >
                                                <option value="" disabled>Select item</option>
                                                {["Nos", "Piece", "Kilo Gram", "Gram", "Litre", "Milliliter", "Packet", "Box"].map(u => (
                                                    <option key={u} value={u}>{u}</option>
                                                ))}
                                            </NativeSelect>
                                            {createErrors.unit && <p className="text-xs text-red-500 mt-1">{createErrors.unit}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                            <Button variant="heroOutline" onClick={() => setSheetOpen(false)}>
                                {mode === "view" ? "Close" : "Cancel"}
                            </Button>
                            {mode === "edit" && (
                                <Button variant="hero" onClick={saveEdit}>
                                    Save Changes
                                </Button>
                            )}
                            {mode === "add" && (
                                <Button variant="hero" onClick={createItem}>
                                    Create Item
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

            {/* ================= ADJUST STOCK SHEET ================= */}
            <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <SheetTitle>Adjust Stock</SheetTitle>
                        </SheetHeader>

                    {selectedItem && (
                        <div className="space-y-4 mt-6">

                            <Info label="Item" value={selectedItem.name} />

                            <Info
                                label="Current Stock"
                                value={`${selectedItem.quantity} ${selectedItem.unit}`}
                            />

                            <div>
                                <Label>Adjustment Quantity</Label>
                                <Input
                                    type="number"
                                    placeholder="Use + or - value"
                                    value={adjustForm.quantity}
                                    onChange={(e) =>
                                        setAdjustForm(f => ({
                                            ...f,
                                            quantity: normalizeSignedNumberInput(e.target.value).toString()
                                        }))
                                    }
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Use positive value to add stock, negative to reduce.
                                </p>
                            </div>

                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                            <Button
                                variant="heroOutline"
                                onClick={() => setAdjustOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="hero"
                                onClick={handleAdjustStock}
                            >
                                Adjust Stock
                            </Button>
                        </div>
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

                    const promise = Promise.all(
                        rows.map(r => adjustStock(r).unwrap())
                    );

                    toast.promise(promise, {
                        pending: "Adjusting stock...",
                        success: "Bulk adjustment successful",
                        error: "Failed to adjust stock"
                    });

                    setBulkOpen(false);
                }}
            />


        </div>
    );
}

/* ---------------- Small UI Component ---------------- */

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm border-b pb-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

