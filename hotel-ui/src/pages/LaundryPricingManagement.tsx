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
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterX, RefreshCcw } from "lucide-react";
import { getStatusColor } from "@/constants/statusColors";
import { toast } from "react-toastify";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";

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
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(9);
    const [editMode, setEditMode] = useState(false);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createRows, setCreateRows] = useState<CreateLaundryForm[]>([
        { itemName: "", description: "", itemRate: "" }
    ]);

    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [showCreateErrors, setShowCreateErrors] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
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

    const resetFiltersHandler = () => {
        if (myProperties?.properties?.[0]?.id) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
        setSearchQuery("");
        setStatusFilter("");
        setPage(1);
    };

    const filteredItems = useMemo(() => {
        const statusFiltered = statusFilter
            ? items.filter((item) => String(item.is_active) === statusFilter)
            : items;

        return filterGridRowsByQuery(statusFiltered, searchQuery, [
            (item) => item.item_name,
            (item) => item.description,
            (item) => item.item_rate,
            (item) => item.is_active ? "Active" : "Inactive",
        ]);
    }, [items, searchQuery, statusFilter]);

    /* ---------------- UI ---------------- */
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Laundry Pricing
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage laundry items & pricing
                        </p>
                    </div>

                    {permission?.can_create && <div className="flex gap-2">
                        <Button
                            variant="heroOutline"
                            onClick={() => setSheetOpen(true)}
                        >
                            Add Item
                        </Button>

                        {!editMode ? (
                            <Button
                                variant="hero"
                                onClick={() => setEditMode(true)}
                            >
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="hero"
                                    disabled={!hasUpdates}
                                    onClick={handleBulkUpdate}
                                >
                                    Update Prices
                                </Button>
                                <Button
                                    variant="hero"
                                    onClick={() => setEditMode(false)}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>}
                </div>
                <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                    <GridToolbar className="mb-2">
                        {(isSuperAdmin || isOwner) && (
                            <GridToolbarSelect
                                label="PROPERTY"
                                value={selectedPropertyId}
                                onChange={(value) => {
                                    setSelectedPropertyId(value);
                                    setPage(1);
                                }}
                                className="min-w-[220px]"
                                options={[
                                    { label: "--Please Select--", value: "", disabled: true },
                                    ...(!myPropertiesLoading
                                        ? (myProperties?.properties?.map((property) => ({
                                            label: property.brand_name,
                                            value: property.id,
                                        })) ?? [])
                                        : []),
                                ]}
                            />
                        )}

                        <GridToolbarSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search laundry items..."
                        />

                        <GridToolbarSelect
                            label="STATUS"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="min-w-[180px]"
                            options={[
                                { label: "Any", value: "" },
                                { label: "Active", value: "true" },
                                { label: "Inactive", value: "false" },
                            ]}
                        />

                        <GridToolbarActions
                            actions={[
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
                    </GridToolbar>

                    <AppDataGrid
                    columns={[
                        {
                            label: "Item",
                            render: (item: EditableLaundry) =>
                                editMode && !item.system_generated ? (
                                    <Input
                                        className="text-xs"
                                        value={item.item_name}
                                        onChange={(e) => updateItem(item.id, { item_name: e.target.value })}
                                    />
                                ) : (
                                    item.item_name
                                ),
                        },
                        {
                            label: "Description",
                            render: (item: EditableLaundry) =>
                                editMode ? (
                                    <Input
                                        value={item.description ?? ""}
                                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                    />
                                ) : (
                                    item.description || "—"
                                ),
                        },
                        {
                            label: "Rate",
                            render: (item: EditableLaundry) =>
                                editMode ? (
                                    <Input
                                        type="text"
                                        className="w-28 text-sm"
                                        value={item.item_rate}
                                        onChange={(e) =>
                                            updateItem(item.id, {
                                                item_rate: normalizeNumberInput(e.target.value).toString(),
                                            })
                                        }
                                    />
                                ) : (
                                    <span className="text-sm">₹{item.item_rate}</span>
                                ),
                        },
                        {
                            label: "Status",
                            render: (item: EditableLaundry) =>
                                editMode ? (
                                    <Switch
                                        checked={item.is_active}
                                        onCheckedChange={(val) => updateItem(item.id, { is_active: val })}
                                    />
                                ) : (
                                    <span
                                        className={cn(
                                            "inline-flex items-center px-3 py-1 text-xs font-semibold rounded-[3px]",
                                            getStatusColor(item.is_active ? "active" : "inactive", "toggle")
                                        )}
                                    >
                                        {item.is_active ? "Active" : "Inactive"}
                                    </span>
                                ),
                        },
                    ] as ColumnDef[]}
                    data={filteredItems}
                    loading={laundryLoading}
                    emptyText="No laundry pricing found"
                    minWidth="760px"
                    enablePagination
                    paginationProps={{
                        page,
                        totalPages,
                        setPage,
                        totalRecords: data?.data?.pagination?.total ?? items.length,
                        limit,
                        onLimitChange: (value) => {
                            setLimit(value);
                            setPage(1);
                        },
                        disabled: laundryLoading || laundryFetching,
                    }}
                    />
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

                                                <input
                                                    id={`laundry-create-item-name-${index}`}
                                                    name={`laundry_create_item_name_${index}`}
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border bg-white outline-none focus:ring-1 focus:ring-primary",
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

                                                <input
                                                    id={`laundry-create-description-${index}`}
                                                    name={`laundry_create_description_${index}`}
                                                    className="w-full h-8 px-2 text-sm rounded border border-input bg-white outline-none focus:ring-1 focus:ring-primary"
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

                                                <input
                                                    id={`laundry-create-rate-${index}`}
                                                    name={`laundry_create_rate_${index}`}
                                                    type="text"
                                                    className="w-full h-8 px-2 text-sm rounded border border-input bg-white outline-none focus:ring-1 focus:ring-primary"
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

                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                    onClick={() => removeCreateRow(index)}
                                                    disabled={createRows.length === 1}
                                                >
                                                    ✕
                                                </button>

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

