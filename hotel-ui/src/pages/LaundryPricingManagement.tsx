import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { useCreateLaundryPricingMutation, useGetMyPropertiesQuery, useGetPropertyLaundryPricingQuery, useUpdateLaundryPricingMutation } from "@/redux/services/hmsApi";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { usePermission } from "@/rbac/usePermission";
import { useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { FilterX, RefreshCcw, Download } from "lucide-react";
import { getStatusColor } from "@/constants/statusColors";
import { toast } from "react-toastify";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { exportToExcel } from "@/utils/exportToExcel";
import { useGridPagination } from "@/hooks/useGridPagination";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

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

type EditableLaundry = LaundryItem & {
    _edited?: boolean;
};

type CreateLaundryForm = {
    itemName: string;
    description?: string;
    itemRate: number | "";
};

/* ---------------- Component ---------------- */
export default function LaundryPricingManagement() {
    /* ---------------- State ---------------- */
    const [items, setItems] = useState<EditableLaundry[]>([]);
    const [editMode, setEditMode] = useState(false);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createRows, setCreateRows] = useState<CreateLaundryForm[]>([
        { itemName: "", description: "", itemRate: "" }
    ]);

    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [showCreateErrors, setShowCreateErrors] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, statusFilter, searchQuery],
    });

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const {
        data,
        isLoading: laundryLoading,
        isFetching: laundryFetching,
        refetch: refetchLaundryPricing
    } = useGetPropertyLaundryPricingQuery({ propertyId: selectedPropertyId, page, limit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createLaundryPrice] = useCreateLaundryPricingMutation()
    const [updateBulkLaundryPricing] = useUpdateLaundryPricingMutation()

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (Array.isArray(data?.data?.data)) {
            setItems(
                data.data.data.map((i: LaundryItem) => ({
                    ...i,
                    _edited: false,
                }))
            );
            return;
        }

        setItems([]);
    }, [data]);

    /* ---------------- Helpers ---------------- */
    const updateItem = (
        id: string,
        patch: Partial<EditableLaundry>
    ) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === id ? { ...i, ...patch, _edited: true } : i
            )
        );
    };

    const hasUpdates = useMemo(
        () => items.some((i) => i._edited),
        [items]
    );

    const totalPages = data?.data?.pagination?.totalPages ?? 1;

    function buildCreateLaundryPayload(
        propertyId: number,
        form: CreateLaundryForm
    ) {
        return {
            propertyId,
            itemName: form.itemName,
            description: form.description || null,
            itemRate: Number(form.itemRate),
        };
    }

    function buildLaundryBulkUpdatePayload(
        items: EditableLaundry[]
    ) {
        return {
            updates: items
                .filter((i) => i._edited)
                .map((i) => {
                    const payload: {
                        id: number;
                        itemRate: number;
                        is_active: boolean;
                        description?: string | null;
                        itemName?: string;
                    } = {
                        id: Number(i.id),
                        itemRate: Number(i.item_rate),
                        is_active: i.is_active
                    };

                    if (i.description !== undefined) {
                        payload.description = i.description;
                    }

                    if (!i.system_generated) {
                        payload.itemName = i.item_name;
                    }

                    return payload;
                }),
        };
    }

    const addCreateRow = () => {
        setShowCreateErrors(false)
        setCreateRows(prev => [
            ...prev,
            { itemName: "", description: "", itemRate: "" }
        ]);
    };

    const removeCreateRow = (index: number) => {
        setCreateRows(prev => prev.filter((_, i) => i !== index));
    };

    const updateCreateRow = (
        index: number,
        patch: Partial<CreateLaundryForm>
    ) => {
        setCreateRows(prev =>
            prev.map((r, i) =>
                i === index ? { ...r, ...patch } : r
            )
        );
    };

    const handleCreateLaundry = async () => {

        setShowCreateErrors(true);

        const hasError = createRows.some((r, i) => {
            const err = getCreateRowErrors(r, i);
            return err.itemName || err.itemRate;
        });

        if (hasError) {
            return;
        }
    }

    /* ---------------- Handlers ---------------- */
    const handleBulkUpdate = async () => {
        const payload = buildLaundryBulkUpdatePayload(items);

        if (!payload.updates.length) return;

        try {
            await updateBulkLaundryPricing(payload).unwrap();

            setItems((prev) =>
                prev.map((i) => ({ ...i, _edited: false }))
            );

            setEditMode(false);
        } catch (err) {
            console.error("Bulk update failed", err);
        }
    };

    function buildBulkCreateLaundryPayload(
        propertyId: number,
        rows: CreateLaundryForm[]
    ) {

        return {
            property_id: propertyId,
            items: rows
                .filter(r => r.itemName?.trim()) // only valid rows
                .map(r => ({
                    itemName: r.itemName.trim(),
                    description: r.description || null,
                    itemRate: Number(r.itemRate || 0),
                }))
        };
    }

    function getCreateRowErrors(
        row: CreateLaundryForm,
        index: number
    ) {

        const name = row.itemName?.trim().toLowerCase();

        /* ---------- empty validations ---------- */

        const itemNameRequired = !name;
        const itemRateRequired = !row.itemRate || Number(row.itemRate) <= 0;

        /* ---------- duplicate in createRows ---------- */

        const duplicateInForm = createRows.some((r, i) => {

            if (i === index) return false;

            return r.itemName?.trim().toLowerCase() === name;
        });

        /* ---------- duplicate against existing DB items ---------- */

        const duplicateExisting = items.some((existing) => {

            return existing.item_name?.trim().toLowerCase() === name;
        });

        return {
            itemName: itemNameRequired || duplicateInForm || duplicateExisting,
            itemRate: itemRateRequired,
            duplicateInForm,
            duplicateExisting
        };
    }

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId]);

    const refreshTable = async () => {
        if (laundryFetching) return;
        const toastId = toast.loading("Refreshing laundry pricing...");

        try {
            await refetchLaundryPricing();
            toast.dismiss(toastId);
            toast.success("Laundry pricing refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh laundry pricing");
        }
    };

    const exportPricesSheet = () => {
        if (!filteredItems || filteredItems.length === 0) {
            toast.info("No data to export");
            return;
        }

        const formatted = filteredItems.map(item => ({
            "Laundry ID": formatModuleDisplayId("laundry", item.id),
            "Item Name": item.item_name,
            "Description": item.description || "—",
            "Rate (Rs)": item.item_rate,
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

        return filterGridRowsByQuery(filtered, searchQuery, [
            (item) => item.item_name,
            (item) => item.description,
            (item) => item.item_rate,
            (item) => item.is_active ? "Active" : "Inactive",
        ]);
    }, [items, searchQuery, statusFilter]);

    const laundryColumns = useMemo<ColumnDef<EditableLaundry>[]>(() => [
        {
            label: "Laundry ID",
            cellClassName: "font-medium min-w-[90px]",
            render: (item) => (
                <span className="font-medium text-primary">
                    {formatModuleDisplayId("laundry", item.id)}
                </span>
            ),
        },
        {
            label: "Item",
            cellClassName: "font-semibold text-foreground",
            render: (item) =>
                editMode && !item.system_generated ? (
                    <Input
                        className="h-8 text-sm"
                        value={item.item_name}
                        onChange={(e) => updateItem(item.id, { item_name: e.target.value })}
                    />
                ) : (
                    item.item_name
                ),
        },
        {
            label: "Description",
            cellClassName: "text-muted-foreground",
            render: (item) =>
                editMode ? (
                    <Input
                        className="h-8 text-sm"
                        value={item.description ?? ""}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    />
                ) : (
                    item.description || "-"
                ),
        },
        {
            label: "Rate",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (item) =>
                editMode ? (
                    <div className="flex justify-center">
                        <Input
                            type="text"
                            className="h-8 w-28 text-sm text-center"
                            value={item.item_rate}
                            onChange={(e) =>
                                updateItem(item.id, {
                                    item_rate: normalizeNumberInput(e.target.value).toString(),
                                })
                            }
                        />
                    </div>
                ) : (
                    <span className="inline-flex min-w-[96px] justify-center rounded-[3px] bg-muted/40 px-3 py-1 text-sm font-semibold">
                        Rs {item.item_rate}
                    </span>
                ),
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (item) =>
                editMode ? (
                    <div className="flex justify-center">
                        <Switch
                            checked={item.is_active}
                            onCheckedChange={(val) => updateItem(item.id, { is_active: val })}
                        />
                    </div>
                ) : (
                    <span
                        className={cn(
                            "inline-flex min-w-[88px] justify-center px-3 py-1 text-xs font-semibold rounded-[3px]",
                            getStatusColor(item.is_active ? "active" : "inactive", "toggle")
                        )}
                    >
                        {item.is_active ? "Active" : "Inactive"}
                    </span>
                ),
        },
    ], [editMode, items]);

    /* ---------------- UI ---------------- */
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Laundry Pricing</h1>
                        <p className="text-sm text-muted-foreground">Manage laundry items & pricing</p>
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
                                <Button variant="heroOutline" className="h-10" onClick={() => setSheetOpen(true)}>
                                    Add Item
                                </Button>

                                {!editMode ? (
                                    <Button variant="hero" className="h-10" onClick={() => setEditMode(true)}>
                                        Edit
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="hero" className="h-10" disabled={!hasUpdates} onClick={handleBulkUpdate}>
                                            Update Prices
                                        </Button>
                                        <Button variant="heroOutline" className="h-10" onClick={() => setEditMode(false)}>
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </div>
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
                                            resetPage();
                                        }
                                    }}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        resetPage();
                                    }}
                                />

                                <GridToolbarSelect
                                    label="STATUS"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        resetPage();
                                    }}
                                    options={[
                                        { label: "Any", value: "" },
                                        { label: "Active", value: "true" },
                                        { label: "Inactive", value: "false" },
                                    ]}
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
                            columns={laundryColumns}
                            data={filteredItems}
                            rowKey={(item) => item.id}
                            loading={laundryLoading || laundryFetching}
                            emptyText="No laundry items found"
                            enablePagination={Boolean(data?.data?.pagination)}
                            paginationProps={data?.data?.pagination ? {
                                page,
                                totalPages,
                                setPage,
                                totalRecords: data?.data?.pagination?.total ?? items.length,
                                limit,
                                onLimitChange: handleLimitChange,
                                disabled: laundryLoading || laundryFetching,
                            } : undefined}
                        />
                    </div>
                </div>
            </section>

            {/* Create Laundry Item Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">

                    <SheetHeader>
                        <SheetTitle>Add Laundry Items</SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">

                        {/* TABLE */}

                        <div className="border rounded-md overflow-hidden">

                            <Table className="text-sm">

                                <TableHeader>
                                    <TableRow className="h-9">
                                        <TableHead className="px-3">Item Name *</TableHead>
                                        <TableHead className="px-3">Description</TableHead>
                                        <TableHead className="px-3 w-[140px]">Rate (₹)</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>

                                    {createRows.map((row, index) => {
                                        const errors = getCreateRowErrors(row, index);
                                        return <TableRow
                                            key={index}
                                            className="border-b last:border-b-0 hover:bg-muted/30"
                                        >

                                            {/* ITEM NAME */}
                                            <TableCell className="border-r p-1">

                                                <Input
                                                    id={`laundry-create-item-name-${index}`}
                                                    name={`laundry_create_item_name_${index}`}
                                                    className={cn(
                                                        "h-8 text-sm",
                                                        showCreateErrors && errors.itemName && "border-red-500"
                                                    )}
                                                    title={
                                                        showCreateErrors
                                                            ? errors.duplicateExisting
                                                                ? "Item already exists"
                                                                : errors.duplicateInForm
                                                                    ? "Duplicate item in list"
                                                                    : errors.itemName
                                                                        ? "Item name required"
                                                                        : ""
                                                            : ""
                                                    }
                                                    value={row.itemName}
                                                    onChange={(e) =>
                                                        updateCreateRow(index, {
                                                            itemName: e.target.value
                                                        })
                                                    }
                                                />

                                            </TableCell>


                                            {/* DESCRIPTION */}
                                            <TableCell className="border-r p-1">

                                                <Input
                                                    id={`laundry-create-description-${index}`}
                                                    name={`laundry_create_description_${index}`}
                                                    className="h-8 text-sm"
                                                    value={row.description}
                                                    onChange={(e) =>
                                                        updateCreateRow(index, {
                                                            description: e.target.value
                                                        })
                                                    }
                                                />

                                            </TableCell>


                                            {/* RATE */}
                                            <TableCell className="border-r p-1">

                                                <Input
                                                    id={`laundry-create-rate-${index}`}
                                                    name={`laundry_create_rate_${index}`}
                                                    type="text"
                                                    className="h-8 text-sm"
                                                    value={row.itemRate}
                                                    onChange={(e) =>
                                                        updateCreateRow(index, {
                                                            itemRate: normalizeNumberInput(e.target.value)
                                                        })
                                                    }
                                                />

                                            </TableCell>


                                            {/* REMOVE BUTTON */}
                                            <TableCell className="flex items-center justify-center p-1">

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-transparent"
                                                    onClick={() => removeCreateRow(index)}
                                                    disabled={createRows.length === 1}
                                                >
                                                    X
                                                </Button>

                                            </TableCell>

                                        </TableRow>

                                    })}

                                </TableBody>
                            </Table>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex justify-between">

                            <Button
                                variant="heroOutline"
                                onClick={addCreateRow}
                            >
                                + Add Row
                            </Button>

                            <div className="flex gap-2">

                                <Button
                                    variant="heroOutline"
                                    onClick={() => setSheetOpen(false)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    variant="hero"
                                    onClick={handleCreateLaundry}
                                >
                                    Create Items
                                </Button>

                            </div>

                        </div>

                    </div>

                </SheetContent>

            </Sheet>
        </div >
    );
}


