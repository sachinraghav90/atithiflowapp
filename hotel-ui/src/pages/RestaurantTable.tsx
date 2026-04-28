import { useEffect, useState, useMemo } from "react";
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
    useCreateRestaurantTableMutation, 
    useGetMyPropertiesQuery, 
    useGetRestaurantTableQuery, 
    useUpdateRestaurantTableMutation 
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { 
    GridToolbar, 
    GridToolbarActions, 
    GridToolbarRow, 
    GridToolbarSearch, 
    GridToolbarSpacer 
} from "@/components/ui/grid-toolbar";
import { Pencil, Download, FilterX, RefreshCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusColor } from "@/constants/statusColors";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { GridBadge } from "@/components/ui/grid-badge";

const TABLE_STATUSES = ["Available", "Occupied", "Reserved", "Out of Service"];

type RestaurantTable = {
    id: string;
    property_id: string;
    table_no: string;
    capacity: number;
    location: string;
    status: string;
    min_order_amount: string;
    is_active: boolean;
};

export function RestaurantTables() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    
    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

    const [form, setForm] = useState({
        table_no: "",
        capacity: 1,
        location: "",
        status: "Available",
        min_order_amount: 0,
        is_active: true
    });

    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { 
        myProperties, 
        isMultiProperty, 
        isInitializing, 
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data, isLoading, isFetching, refetch } = useGetRestaurantTableQuery({ 
        propertyId: selectedPropertyId, 
        page: 1,
        limit: 1000
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createRestaurantTable] = useCreateRestaurantTableMutation()
    const [updateRestaurantTable] = useUpdateRestaurantTableMutation()



    const handleForm = async () => {
        if (!selectedPropertyId) return;

        if (mode === "add") {
            const payload = {
                property_id: selectedPropertyId,
                table_no: form.table_no,
                capacity: form.capacity,
                location: form.location,
                status: form.status,
                min_order_amount: form.min_order_amount,
                is_active: form.is_active
            };
            const promise = createRestaurantTable(payload).unwrap()
            toast.promise(promise, {
                error: "Error creating table",
                pending: "Creating table...",
                success: "Table created successfully"
            })
            await promise;
        } else if (mode === "edit" && selectedTable) {
            const payload = {
                table_no: form.table_no,
                capacity: form.capacity,
                status: form.status,
                location: form.location,
                min_order_amount: form.min_order_amount,
                is_active: form.is_active
            };
            const promise = updateRestaurantTable({ id: selectedTable.id, payload }).unwrap()
            toast.promise(promise, {
                error: "Error updating table",
                pending: "Updating table...",
                success: "Table updated successfully"
            })
            await promise;
        }
        setMode(null);
    };

    const openEdit = (table: RestaurantTable) => {
        setSelectedTable(table);
        setForm({
            table_no: table.table_no,
            capacity: table.capacity,
            location: table.location || "",
            status: table.status,
            min_order_amount: Number(table.min_order_amount) || 0,
            is_active: table.is_active
        });
        setMode("edit");
    };

    const openView = (table: RestaurantTable) => {
        setSelectedTable(table);
        setMode("view");
    };

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const tableRows = useMemo(() => {
        const raw = data?.data ?? [];
        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase();
        return raw.filter(t => 
            t.table_no?.toLowerCase().includes(q) || 
            t.location?.toLowerCase().includes(q) ||
            t.status?.toLowerCase().includes(q)
        );
    }, [data, searchQuery]);

    const totalRecords = tableRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const paginatedTableRows = useMemo(() => {
        const start = (page - 1) * limit;
        return tableRows.slice(start, start + limit);
    }, [tableRows, page, limit]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const handleExport = () => {
        if (!tableRows.length) return toast.error("No data to export");
        const formatted = tableRows.map(t => ({
            "Table ID": formatModuleDisplayId("table", t.id),
            "Table No": t.table_no,
            "Capacity": t.capacity,
            "Location": t.location || "—",
            "Min Order": `₹${t.min_order_amount}`,
            "Status": t.status,
        }));
        exportToExcel(formatted, "RestaurantTables.xlsx");
    };

    const columns: ColumnDef<RestaurantTable>[] = [
        {
            label: "Table ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (t) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => openView(t)}
                >
                    {formatModuleDisplayId("table", t.id)}
                </button>
            ),
        },
        {
            label: "Table No",
            cellClassName: "font-semibold text-foreground",
            render: (t) => t.table_no,
        },
        {
            label: "Capacity",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (t) => t.capacity,
        },
        {
            label: "Location",
            cellClassName: "text-muted-foreground",
            render: (t) => t.location || "—",
        },
        {
            label: "Min Order",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (t) => `₹${t.min_order_amount || 0}`,
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (t) => (
                <GridBadge status={t.status} statusType="restaurantTable">
                    {t.status}
                </GridBadge>
            ),
        },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Restaurant Tables</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage dining tables & seating configurations
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {(isSuperAdmin || isOwner) && myProperties?.properties?.length > 0 && (
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
                                    {myProperties.properties.map((p) => (
                                        <option key={p.id} value={p.id}>{p.brand_name}</option>
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
                                        table_no: "",
                                        capacity: 1,
                                        location: "",
                                        status: "Available",
                                        min_order_amount: 0,
                                        is_active: true
                                    });
                                    setMode("add");
                                }}
                            >
                                <span className="text-lg">+</span> Add Table
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
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        setPage(1);
                                    }}
                                />

                                <GridToolbarSpacer />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Tables",
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
                                                setPage(1);
                                            },
                                        },
                                        {
                                            key: "refresh",
                                            label: "Refresh Data",
                                            icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: () => refetch(),
                                            disabled: isFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={columns}
                            data={paginatedTableRows}
                            loading={isLoading || isInitializing}
                            emptyText="No tables found"
                            minWidth="900px"
                            enablePagination
                            paginationProps={{
                                page,
                                totalPages,
                                setPage,
                                totalRecords,
                                limit,
                                onLimitChange: (val) => { setLimit(val); setPage(1); },
                                disabled: isLoading || isFetching,
                            }}
                            actionLabel=""
                            actionClassName="text-center w-[60px]"
                            actions={(t) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            onClick={() => openEdit(t)}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Table</TooltipContent>
                                </Tooltip>
                            )}
                        />
                    </div>
                </div>
            </section>

            {/* View / Edit / Add Sheet */}
            <Sheet open={!!mode} onOpenChange={() => setMode(null)}>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>
                            {mode === "view" ? "Table Summary" : mode === "edit" ? "Edit Table" : "Add Table"}
                        </SheetTitle>
                    </SheetHeader>

                    {mode === "view" && selectedTable && (
                        <div className="mt-8 space-y-6 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Table ID</Label>
                                    <p className="font-semibold text-primary">{formatModuleDisplayId("table", selectedTable.id)}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                                    <div>
                                        <span className={cn(
                                            "px-3 py-1 rounded-[3px] text-xs font-semibold",
                                            getStatusColor(selectedTable.status.toLowerCase().replace(/ /g, "_"), "laundry")
                                        )}>
                                            {selectedTable.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Table Number</Label>
                                <p className="text-lg font-bold">{selectedTable.table_no}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Capacity</Label>
                                    <p className="font-medium text-base">{selectedTable.capacity} Persons</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Min Order Amount</Label>
                                    <p className="font-medium text-base">₹{selectedTable.min_order_amount || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Location</Label>
                                <p className="text-foreground/80">{selectedTable.location || "No location specified"}</p>
                            </div>

                            <div className="pt-6 border-t">
                                <Button
                                    variant="heroOutline"
                                    className="w-full"
                                    onClick={() => setMode(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}

                    {(mode === "edit" || mode === "add") && (
                        <div className="mt-8 space-y-4">
                            <div className="space-y-2">
                                <Label>Table Number *</Label>
                                <Input 
                                    value={form.table_no}
                                    onChange={(e) => setForm({ ...form, table_no: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Capacity</Label>
                                    <Input 
                                        type="number"
                                        value={form.capacity}
                                        onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <NativeSelect 
                                        className="w-full h-10 border rounded px-3 text-sm bg-background"
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    >
                                        {TABLE_STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input 
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Minimum Order Amount</Label>
                                <Input 
                                    type="text"
                                    value={form.min_order_amount}
                                    onChange={(e) => setForm({ ...form, min_order_amount: Number(normalizeNumberInput(e.target.value)) })}
                                />
                            </div>

                            <div className="pt-6 border-t flex flex-col gap-2">
                                <Button 
                                    variant="hero" 
                                    className="w-full"
                                    onClick={handleForm}
                                >
                                    {mode === "add" ? "Create Table" : "Save Changes"}
                                </Button>
                                <Button 
                                    variant="heroOutline" 
                                    className="w-full"
                                    onClick={() => setMode(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
