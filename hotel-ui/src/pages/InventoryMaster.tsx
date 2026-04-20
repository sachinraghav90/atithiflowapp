import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateInventoryMasterMutation, useGetInventoryQuery, useGetInventoryTypesQuery, useUpdateInventoryMasterMutation } from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useAppSelector } from "@/redux/hook";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, RefreshCcw, FilterX, Download } from "lucide-react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { exportToExcel } from "@/utils/exportToExcel";
import { getStatusColor } from "@/constants/statusColors";

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
};

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

export default function InventoryMaster() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [inventoryTypeFilter, setInventoryTypeFilter] = useState("");
    const [useTypeFilter, setUseTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
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
    const {
        myProperties,
        isLoading: myPropertiesLoading
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
    } = useGetInventoryQuery({ propertyId: selectedPropertyId, page, limit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createInventoryMaster] = useCreateInventoryMasterMutation()
    const [updateInventoryMaster] = useUpdateInventoryMasterMutation()

    function validate(form: InventoryForm) {
        const errors: Record<string, string> = {};
        if (!form.inventory_type_id) errors.inventory_type_id = "Required";
        if (!form.name.trim()) errors.name = "Name required";
        if (!form.use_type.trim()) errors.use_type = "Use type required";
        return errors;
    }

    function handleForm() {
        setSubmitted(true);
        const errors = validate(form);
        setFormErrors(errors);
        if (Object.keys(errors).length) return;

        if (mode === "add") {
            const payload = buildCreateInventoryPayload(form, +selectedPropertyId);
            const promise = createInventoryMaster(payload).unwrap()
            toast.promise(promise, {
                error: "Error creating inventory",
                pending: "Creating please wait",
                success: "Created successfully"
            })
        }

        if (mode === "edit" && selected) {
            const payload = buildUpdateInventoryPayload(form);
            const promise = updateInventoryMaster({ body: payload, id: selected.id }).unwrap()
            toast.promise(promise, {
                error: "Error updating inventory",
                pending: "Updating please wait",
                success: "Updated successfully"
            })
        }
        setMode(null);
    }

    const openEdit = (item: InventoryItem) => {
        setSelected(item);
        setForm({
            inventory_type_id: item.inventory_type_id,
            use_type: item.use_type,
            name: item.name,
            is_active: item.is_active,
        });
        setMode("edit");
    };

    const openView = (item: InventoryItem) => {
        setSelected(item);
        setMode("view");
    };

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    // CLIENT SIDE FILTERING (Since API doesn't support search/type yet, but we want UI to reflect intent)
    const rawData = inventoryMaster?.data ?? [];
    const inventoryRows = useMemo(() => {
        return rawData.filter(item => {
            const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = !inventoryTypeFilter || item.inventory_type_id === Number(inventoryTypeFilter);
            const matchesUse = !useTypeFilter || item.use_type === useTypeFilter;
            const matchesStatus = !statusFilter || (statusFilter === "active" ? item.is_active : !item.is_active);
            return matchesSearch && matchesType && matchesUse && matchesStatus;
        });
    }, [rawData, searchQuery, inventoryTypeFilter, useTypeFilter, statusFilter]);

    const handleExport = () => {
        if (!inventoryRows.length) return toast.error("No data to export");
        
        const formatted = inventoryRows.map((item) => ({
            "Inventory ID": formatModuleDisplayId("inventory", item.id),
            "Name": item.name,
            "Inventory Type": item.inventory_type || "—",
            "Use Type": item.use_type.charAt(0).toUpperCase() + item.use_type.slice(1),
            "Status": item.is_active ? "Active" : "Inactive",
            "Created On": new Date(item.created_on).toLocaleDateString("en-GB")
        }));
        
        exportToExcel(formatted, "InventoryMaster.xlsx");
    };

    const totalPages = inventoryMaster?.pagination?.totalPages ?? 1;

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId]);

    useEffect(() => {
        if (searchInput.trim() === "") {
            setSearchQuery("");
            setPage(1);
        }
    }, [searchInput]);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#f8fafc]">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-6 space-y-4">
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
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
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
                                    setForm({
                                        inventory_type_id: null,
                                        use_type: "fix",
                                        name: "",
                                        is_active: true,
                                    });
                                    setMode("add");
                                }}
                            >
                                <span className="text-lg">+</span> Add Inventory
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            {/* Row 1 */}
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
                                    label="TYPE"
                                    value={inventoryTypeFilter}
                                    onChange={(val) => {
                                        setInventoryTypeFilter(val);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...inventoryTypes.map(t => ({ label: t.type, value: String(t.id) }))
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="USE"
                                    value={useTypeFilter}
                                    onChange={(val) => {
                                        setUseTypeFilter(val);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Fix", value: "fix" },
                                        { label: "Usable", value: "usable" },
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
                                            onClick: () => refetchInventory(),
                                            disabled: inventoryFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>

                            {/* Row 2 */}
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSelect
                                    label="STATUS"
                                    value={statusFilter}
                                    onChange={(val) => {
                                        setStatusFilter(val);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Active Only", value: "active" },
                                        { label: "Inactive Only", value: "inactive" },
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
                                    key: "inventory_type",
                                    cellClassName: "whitespace-nowrap text-muted-foreground",
                                },
                                {
                                    label: "Use Type",
                                    key: "use_type",
                                    cellClassName: "capitalize font-medium text-foreground/80",
                                },
                                {
                                    label: "Status",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (item: InventoryItem) => (
                                        <span className={cn(
                                            "px-3 py-1 rounded-[3px] text-xs font-semibold",
                                            getStatusColor(item.is_active ? "active" : "inactive", "toggle")
                                        )}>
                                            {item.is_active ? "Active" : "Inactive"}
                                        </span>
                                    )
                                },
                                {
                                    label: "Created",
                                    cellClassName: "text-muted-foreground text-xs font-medium whitespace-nowrap",
                                    render: (item: InventoryItem) => new Date(item.created_on).toLocaleDateString("en-GB")
                                },
                            ] satisfies ColumnDef[]}
                            data={inventoryRows}
                            loading={inventoryLoading}
                            emptyText="No inventory items found"
                            minWidth="800px"
                            enablePagination
                            paginationProps={{
                                page,
                                totalPages,
                                setPage,
                                totalRecords: inventoryMaster?.pagination?.total ?? inventoryRows.length,
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
                                                        className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                        aria-label={`Edit details for inventory ${item.name}`}
                                                        onClick={() => openEdit(item)}
                                                    >
                                                        <Pencil className="w-4 h-4 mx-auto" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit Details</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                )
                            }
                        />
                    </div>


                {/* MODAL */}
                <Dialog open={!!mode} onOpenChange={() => setMode(null)}>
                    <DialogContent className="max-w-xl">

                        <DialogHeader>
                            <DialogTitle>
                                {mode === "view" ? "View Inventory" :
                                    mode === "edit" ? "Edit Inventory" :
                                        "Add Inventory"}
                            </DialogTitle>
                        </DialogHeader>

                        {mode === "view" && selected && (

                            <div className="space-y-4 text-sm">

                                <div>
                                    <Label>Name</Label>
                                    <p className="font-medium">{selected.name}</p>
                                </div>

                                <div>
                                    <Label>Inventory Type</Label>
                                    <p>{selected.inventory_type}</p>
                                </div>

                                <div>
                                    <Label>Use Type</Label>
                                    <p className="capitalize">{selected.use_type}</p>
                                </div>

                                <div>
                                    <Label>Status</Label>
                                    <p>{selected.is_active ? "Active" : "Inactive"}</p>
                                </div>

                                <div>
                                    <Label>Created On</Label>
                                    <p>{new Date(selected.created_on).toLocaleDateString("en-GB")}</p>
                                </div>

                                {permission?.can_create && (
                                    <Button
                                        variant="hero"
                                        className="w-full"
                                        onClick={() => openEdit(selected)}
                                    >
                                        Edit Inventory
                                    </Button>
                                )}
                            </div>
                        )}
                        
                        {(mode === "edit" || mode === "add") && (
                        
                            <div className="space-y-4">
                        
                                <div className="grid grid-cols-2 gap-4">
                        
                                    {/* TYPE */}
                                    <div>
                                        <Label htmlFor="inventory-type">Inventory Type*</Label>
                                        <NativeSelect
                                            id="inventory-type"
                                            name="inventory_type_id"
                                            className={submitted && formErrors.inventory_type_id ? "w-full h-10 border rounded px-3 border-red-500" : "w-full h-10 border rounded px-3"}
                                            value={form.inventory_type_id ?? ""}
                                            onChange={(e) => {
                                                setForm({ ...form, inventory_type_id: Number(e.target.value) })
                                                setFormErrors(e => ({ ...e, inventory_type_id: "" }))
                                            }}
                                        >
                                            <option value="">-- Please Select --</option>
                                            {inventoryTypes.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.type}
                                                </option>
                                            ))}
                                        </NativeSelect>
                                    </div>
                        
                                    {/* USE TYPE */}
                                    <div>
                                        <Label htmlFor="inventory-use-type">Use Type*</Label>
                                        <NativeSelect
                                            id="inventory-use-type"
                                            name="inventory_use_type"
                                            className={submitted && formErrors.use_type ? "w-full h-10 border rounded px-3 border-red-500" : "w-full h-10 border rounded px-3"}
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
                        
                                    {/* NAME */}
                                    <div className="col-span-2">
                                        <Label htmlFor="inventory-name">Name*</Label>
                                        <Input
                                            id="inventory-name"
                                            name="inventory_name"
                                            value={form.name}
                                            className={submitted && formErrors.name ? "border-red-500" : ""}
                                            onChange={(e) => {
                                                setForm({ ...form, name: normalizeTextInput(e.target.value) })
                                                setFormErrors(e => ({ ...e, name: "" }))
                                            }}
                                        />
                                    </div>
                                    {<div className="flex items-center gap-2">
                                        <Switch
                                            checked={form?.is_active}
                                            onCheckedChange={(v) =>
                                                setForm({ ...form, is_active: v })
                                            }
                                        />
                                        <Label>Active</Label>
                                    </div>}
                                </div>
                        
                                <Button
                                    variant="hero"
                                    className="w-full"
                                    onClick={handleForm}
                                >
                                    {mode === "add" ? "Create Inventory" : "Save Changes"}
                                </Button>
                        
                            </div>
                        
                        )}
                        
                    </DialogContent>
                </Dialog>
            </div>
            </section>
        </div >
    );
}

