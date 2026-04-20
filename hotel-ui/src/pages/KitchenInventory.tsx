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
import { useAdjustStockMutation, useCreateInventoryMutation, useGetInventoryMasterByTypesQuery, useGetKitchenInventoryQuery, useGetLogsByTableQuery, useGetLogsQuery, useGetMyPropertiesQuery, useUpdateInventoryMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { normalizeNumberInput, normalizeSignedNumberInput } from "@/utils/normalizeTextInput";
import KitchenInventoryBulkAdjustSheet from "@/components/KitchenInventoryBulkAdjustSheet";
import { AppDataGrid, DataGridPagination, type ColumnDef } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, RefreshCcw } from "lucide-react";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

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

export default function KitchenInventory() {
    const [inventoryPage, setInventoryPage] = useState(1);
    const [auditPage, setAuditPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [unitFilter, setUnitFilter] = useState("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [selectedItem, setSelectedItem] = useState<KitchenItem | null>(null);

    const [editForm, setEditForm] = useState({
        id: 0,
        quantity: 0,
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
    const [auditLimit, setAuditLimit] = useState(20);
    const [bulkOpen, setBulkOpen] = useState(false);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    });

    const {
        data: kitchenInventory,
        isLoading: kitchenInventoryLoading,
        isFetching: kitchenInventoryFetching,
        refetch: refetchKitchenInventory
    } = useGetKitchenInventoryQuery({ propertyId: selectedPropertyId, page: inventoryPage, limit: inventoryLimit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: masterInventory } = useGetInventoryMasterByTypesQuery({ type: "KITCHEN", propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const {
        data: logs,
        isLoading: logsLoading,
        isFetching: logsFetching,
        refetch: refetchLogs
    } = useGetLogsByTableQuery({ tableName: "kitchen_inventory", propertyId: selectedPropertyId, page: auditPage, limit: auditLimit }, {
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
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        setInventoryPage(1);
        setAuditPage(1);
    }, [selectedPropertyId]);

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

    const openManage = (item: KitchenItem) => {
        setSelectedItem(item);
        setEditForm({
            quantity: Number(item.quantity),
            id: +item.id,
            comments: ""
        });
        setIsEditing(false);
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

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)
    const inventoryCategoryOptions = useMemo(() => {
        const categories = Array.from(
            new Set((kitchenInventory?.data ?? []).map((item: KitchenItem) => item.inventory_type).filter(Boolean))
        );

        return categories.sort((a, b) => String(a).localeCompare(String(b)));
    }, [kitchenInventory?.data]);

    const inventoryUnitOptions = useMemo(() => {
        const units = Array.from(
            new Set((kitchenInventory?.data ?? []).map((item: KitchenItem) => item.unit).filter(Boolean))
        );

        return units.sort((a, b) => String(a).localeCompare(String(b)));
    }, [kitchenInventory?.data]);

    const filteredKitchenInventory = useMemo(() => {
        const rows = kitchenInventory?.data ?? [];
        const query = searchQuery.trim().toLowerCase();

        return rows.filter((item: KitchenItem) =>
            (!query ||
                [
                    item.name,
                    item.inventory_type,
                    item.quantity,
                    item.unit,
                ].some((field) => String(field ?? "").toLowerCase().includes(query))) &&
            (!categoryFilter || item.inventory_type === categoryFilter) &&
            (!unitFilter || item.unit === unitFilter)
        );
    }, [kitchenInventory?.data, searchQuery, categoryFilter, unitFilter]);

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
                new Date(audit.created_on).toLocaleString(),
            ].some((field) => String(field ?? "").toLowerCase().includes(query));

            const matchesAction = !historyActionFilter || audit.event_type === historyActionFilter;

            return matchesQuery && matchesAction;
        });
    }, [logs?.data, historySearchQuery, historyActionFilter]);

    const historyActionOptions = useMemo(() => {
        const actions = Array.from(
            new Set((logs?.data ?? []).map((audit: any) => audit.event_type).filter(Boolean))
        );

        return actions.sort((a, b) => String(a).localeCompare(String(b)));
    }, [logs?.data]);

    const resetInventoryFilters = () => {
        setSearchInput("");
        setSearchQuery("");
        setCategoryFilter("");
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

    const exportKitchenInventory = () => {
        if (!filteredKitchenInventory.length) {
            toast.info("No inventory items to export");
            return;
        }

        const formatted = filteredKitchenInventory.map((item: KitchenItem) => ({
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
        if (!filteredHistoryLogs.length) {
            toast.info("No history rows to export");
            return;
        }

        const formatted = filteredHistoryLogs.map((audit: any) => {
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
                DATE: new Date(audit.created_on).toLocaleString(),
            };
        });

        exportToExcel(formatted, "Kitchen-Inventory-History.xlsx");
        toast.success("Export completed");
    };
    /* ---------------- UI ---------------- */

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">

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
                            Add Stock
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
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
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
                                            label="TYPE"
                                            value={categoryFilter}
                                            onChange={(value) => {
                                                setCategoryFilter(value);
                                                setInventoryPage(1);
                                            }}
                                            options={[
                                                { label: "Any", value: "" },
                                                ...inventoryCategoryOptions.map((category) => ({
                                                    label: String(category),
                                                    value: String(category),
                                                })),
                                            ]}
                                        />

                                        <GridToolbarSelect
                                            label="UNIT"
                                            value={unitFilter}
                                            onChange={(value) => {
                                                setUnitFilter(value);
                                                setInventoryPage(1);
                                            }}
                                            options={[
                                                { label: "Any", value: "" },
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
                                                    onClick: exportKitchenInventory,
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
                                    columns={[
                                        {
                                            label: "Item ID",
                                            headClassName: "text-center",
                                            cellClassName: "text-center font-medium min-w-[90px]",
                                            render: (item: KitchenItem) => (
                                                <button
                                                    type="button"
                                                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                                    onClick={() => openManage(item)}
                                                    aria-label={`Open summary view for kitchen item ${formatModuleDisplayId("kitchen", item.id)}`}
                                                >
                                                    {formatModuleDisplayId("kitchen", item.id)}
                                                </button>
                                            ),
                                        },
                                        {
                                            label: "Item",
                                            key: "name",
                                            cellClassName: "font-semibold text-foreground",
                                        },
                                        {
                                            label: "Category",
                                            key: "inventory_type",
                                            cellClassName: "text-muted-foreground",
                                        },
                                        {
                                            label: "Stock",
                                            render: (item: any) => {
                                                const lowStock = Number(item.quantity) <= item.reorder_level;
                                                return (
                                                    <span className={lowStock ? "font-medium text-red-600" : "font-medium text-foreground"}>
                                                        {item.quantity}
                                                    </span>
                                                );
                                            },
                                        },
                                        {
                                            label: "Unit",
                                            key: "unit",
                                            cellClassName: "text-muted-foreground",
                                        },
                                    ] as ColumnDef[]}
                                    data={filteredKitchenInventory}
                                    loading={kitchenInventoryLoading || kitchenInventoryFetching}
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
                                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    onClick={() => openManage(item)}
                                                    aria-label={`View and edit details for inventory item ${item.name}`}
                                                >
                                                    <Pencil className="w-4 h-4 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View / Edit Details</TooltipContent>
                                        </Tooltip>
                                    )}
                                    enablePagination={Boolean(kitchenInventory?.pagination)}
                                    paginationProps={kitchenInventory?.pagination ? {
                                        page: inventoryPage,
                                        totalPages: kitchenInventory.pagination.totalPages ?? 1,
                                        setPage: setInventoryPage,
                                        totalRecords: kitchenInventory.pagination.totalItems ?? kitchenInventory.pagination.total ?? kitchenInventory.data?.length ?? 0,
                                        limit: inventoryLimit,
                                        onLimitChange: (value) => {
                                            setInventoryLimit(value);
                                            setInventoryPage(1);
                                        },
                                        disabled: kitchenInventoryLoading || kitchenInventoryFetching,
                                    } : undefined}
                                />
                            </div>
                        </div>
                    </div>)}

                {activeTab === "audit" && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
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
                                            label="ACTION"
                                            value={historyActionFilter}
                                            onChange={(value) => {
                                                setHistoryActionFilter(value);
                                                setAuditPage(1);
                                            }}
                                            options={[
                                                { label: "Any", value: "" },
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
                                    columns={[
                                        {
                                            label: "Item",
                                            cellClassName: "font-medium",
                                            render: (audit: any) => {
                                                const details = parseAuditDetails(audit.details);
                                                return details?.entity?.inventory_name || "--";
                                            },
                                        },
                                        {
                                            label: "Action",
                                            headClassName: "text-center",
                                            cellClassName: "text-center font-medium",
                                            key: "event_type",
                                        },
                                        {
                                            label: "Change",
                                            render: (audit: any) => {
                                                const details = parseAuditDetails(audit.details);
                                                const before = details?.before;
                                                const after = details?.after;
                                                const entity = details?.entity;
                                                const unit = entity?.use_type === "usable" ? entity?.unit || "" : "";

                                                return before
                                                    ? `${before.quantity}${unit ? ` ${unit}` : ""} -> ${after?.quantity}${unit ? ` ${unit}` : ""}`
                                                    : `${after?.quantity}${unit ? ` ${unit}` : ""}`;
                                            },
                                        },
                                        {
                                            label: "User",
                                            cellClassName: "text-muted-foreground",
                                            render: (audit: any) => `${audit.user_first_name} ${audit.user_last_name}`,
                                        },
                                        {
                                            label: "Date",
                                            cellClassName: "text-xs text-muted-foreground",
                                            render: (audit: any) => new Date(audit.created_on).toLocaleString(),
                                        },
                                    ] as ColumnDef[]}
                                    data={filteredHistoryLogs}
                                    loading={logsLoading || logsFetching}
                                    emptyText="No audit logs found"
                                    minWidth="860px"
                                    enablePagination={Boolean(logs?.pagination)}
                                    paginationProps={logs?.pagination ? {
                                        page: auditPage,
                                        totalPages: logs.pagination.totalPages ?? 1,
                                        setPage: setAuditPage,
                                        totalRecords: logs.pagination.totalItems ?? logs.pagination.total ?? logs.data?.length ?? 0,
                                        limit: auditLimit,
                                        onLimitChange: (value) => {
                                            setAuditLimit(value);
                                            setAuditPage(1);
                                        },
                                        disabled: logsLoading || logsFetching,
                                    } : undefined}
                                />
                            </div>
                        </div>
                    </div>
                )}



                {/* Pagination */}
                <div className="shrink-0 flex justify-end text-sm">

                </div>

            </section>

            {/* ================= MANAGE SHEET ================= */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-4xl lg:max-w-5xl overflow-y-auto">
                    <SheetHeader>

                        <div className="flex items-center justify-between w-full">

                            <SheetTitle>
                                Inventory Item
                            </SheetTitle>

                            {permission?.can_create && (
                                <div className="flex gap-2 mr-6">
                                    {!isEditing && <Button
                                        variant="heroOutline"
                                        onClick={() => {
                                            setIsEditing(true);
                                        }}
                                    >
                                        Update Stock
                                    </Button>}
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


                    {selectedItem && (
                        <div className="space-y-6 mt-6">

                            {!isEditing ? (
                                <>
                                    {/* View Mode */}
                                    <div className="space-y-3">
                                        <Info label="Name" value={selectedItem.name} />
                                        <Info label="Category" value={selectedItem.inventory_type} />
                                        <Info label="Stock" value={`${selectedItem.quantity} ${selectedItem.unit}`} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Edit Mode */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Update {selectedItem.name} Quantity</Label>
                                            <Input
                                                type="text"
                                                value={editForm.quantity}
                                                onChange={(e) =>
                                                    setEditForm(f => ({ ...f, quantity: +normalizeNumberInput(e.target.value) }))
                                                }
                                            />
                                            <div className="space-y-1">
                                                <Label>Comments</Label>
                                                <textarea
                                                    className="w-full min-h-[50px] rounded-[3px] border px-3 py-2 text-sm"
                                                    value={editForm.comments}
                                                    onChange={(e) =>
                                                        setEditForm(f => ({ ...f, comments: e.target.value }))
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-4">
                                            <Button variant="heroOutline" onClick={() => setIsEditing(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="hero" onClick={saveEdit}>
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>
                    )}

                    {/* ================= AUDIT HISTORY ================= */}

                    <div className="pt-6">

                        <h3 className="text-sm font-semibold mb-3">
                            Audit History
                        </h3>

                        {!auditLogs?.data?.length ? (
                            <p className="text-sm text-muted-foreground">
                                No audit history found.
                            </p>
                        ) : (

                            <div className="space-y-3">

                                {/* Table */}
                                <div className="border rounded overflow-hidden">

                                    <table className="w-full text-xs">

                                        <thead className="bg-white border-b">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Action</th>
                                                <th className="px-3 py-2 text-left">Change</th>
                                                <th className="px-3 py-2 text-left">User</th>
                                                <th className="px-3 py-2 text-left">Date</th>
                                                <th className="px-3 py-2 text-left">Comments</th>
                                            </tr>
                                        </thead>

                                        <tbody>

                                            {auditLogs.data.map(audit => {

                                                const details = parseAuditDetails(audit.details);

                                                const before = details?.before;
                                                const after = details?.after;

                                                const entity = details?.entity;

                                                const unit = entity?.use_type === "usable"
                                                    ? entity?.unit || ""
                                                    : "";

                                                const changeText = before
                                                    ? `${after?.quantity - before.quantity}${unit ? " " + unit : ""} | ${before.quantity}${unit ? " " + unit : ""} → ${after?.quantity}${unit ? " " + unit : ""}`
                                                    : `Created with ${after?.quantity}${unit ? " " + unit : ""}`;


                                                return (

                                                    <tr key={audit.id} className="border-b bg-white ">

                                                        <td className="px-3 py-2 font-medium">
                                                            {audit.event_type}
                                                        </td>

                                                        <td className="px-3 py-2 text-muted-foreground">
                                                            {changeText}
                                                        </td>

                                                        <td className="px-3 py-2 text-muted-foreground">
                                                            {audit.user_first_name} {audit.user_last_name}
                                                        </td>

                                                        <td className="px-3 py-2 text-muted-foreground">
                                                            {new Date(audit.created_on).toLocaleString()}
                                                        </td>

                                                        <td className="px-3 py-2 text-muted-foreground">
                                                            {audit.comments}
                                                        </td>
                                                    </tr>

                                                );
                                            })}

                                        </tbody>

                                    </table>

                                </div>

                                <DataGridPagination
                                    page={itemAuditPage}
                                    totalPages={auditLogs?.pagination?.totalPages ?? 1}
                                    setPage={setItemAuditPage}
                                    totalRecords={auditLogs?.pagination?.totalItems ?? auditLogs?.pagination?.total ?? auditLogs?.data?.length ?? 0}
                                    limit={itemAuditLimit}
                                    onLimitChange={(value) => {
                                        setItemAuditLimit(value);
                                        setItemAuditPage(1);
                                    }}
                                    disabled={!auditLogs}
                                />

                            </div>

                        )}

                    </div>


                </SheetContent>
            </Sheet>

            {/* ================= CREATE MODAL ================= */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Inventory Item</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Inventory Item *</Label>

                            <NativeSelect
                                className={`
                                        w-full h-10 rounded px-3 border
                                        ${createErrors.inventory_master_id
                                        ? "border-red-500"
                                        : "border-border"}
                                        `}
                                value={createForm.inventory_master_id ?? ""}
                                onChange={(e) => setCreateForm(f => ({ ...f, inventory_master_id: Number(e.target.value) }))}
                            >

                                <option value="" disabled>-- Please Select --</option>

                                {masterInventory && masterInventory?.filter(item => item.is_active).map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            {createErrors.inventory_master_id && (
                                <p className="text-xs text-red-500 mt-1">
                                    {createErrors.inventory_master_id}
                                </p>
                            )}

                        </div>


                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Quantity*</Label>
                                <Input
                                    className={`bg-white ${createErrors.quantity
                                        ? "border-red-500"
                                        : ""
                                        }`}
                                    value={createForm.quantity}
                                    onChange={(e) => setCreateForm(f => ({ ...f, quantity: +normalizeNumberInput(e.target.value) }))}
                                />
                                {createErrors.quantity && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {createErrors.quantity}
                                    </p>
                                )}
                            </div>

                            {isItemUsable && <div>
                                <Label>Unit*</Label>
                                <NativeSelect
                                    className={`
                                            w-full h-10 rounded px-3 border
                                            ${createErrors.unit
                                            ? "border-red-500"
                                            : "border-border"}
                                            `}
                                    value={createForm.unit ?? ""}
                                    onChange={(e) => setCreateForm(f => ({ ...f, unit: e.target.value }))}
                                >

                                    <option value="" disabled>Select item</option>
                                    <option value="Kilo Gram">Kilo Gram</option>
                                    <option value="Gram">Gram</option>
                                    <option value="Litre">Litre</option>
                                    <option value="Milliliter">Milliliter</option>
                                </NativeSelect>
                                {createErrors.unit && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {createErrors.unit}
                                    </p>
                                )}

                            </div>}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="heroOutline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="hero" onClick={createItem}>
                                Create Item
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ================= ADJUST STOCK SHEET ================= */}

            <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">

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

                            <div className="flex gap-2 pt-4">
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

                        </div>
                    )}

                </SheetContent>
            </Sheet>

            <KitchenInventoryBulkAdjustSheet
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                propertyId={selectedPropertyId}
                masterInventory={masterInventory}
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

