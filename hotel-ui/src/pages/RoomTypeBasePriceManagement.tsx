import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useGetMyPropertiesQuery, useGetRoomTypesQuery, useUpdateRoomTypesMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download, FilterX, RefreshCcw, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { useGridPagination } from "@/hooks/useGridPagination";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

/* ---------------- Types ---------------- */
type RateRow = {
    id: number;
    room_category_name: string;
    bed_type_name: string;
    ac_type_name: string;
    base_price: string;
};

/* ---------------- Component ---------------- */
export default function RoomTypeBasePriceManagement() {
    const [propertyId, setPropertyId] = useState<number | null>(null);
    const { myProperties, isMultiProperty } = useAutoPropertySelect(propertyId, setPropertyId);

    const [rows, setRows] = useState<RateRow[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterBedType, setFilterBedType] = useState("");
    const [filterAcType, setFilterAcType] = useState("");
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [propertyId, filterCategory, filterBedType, filterAcType, searchQuery],
    });

    const {
        data: roomTypesData,
        isLoading: roomTypesLoading,
        isFetching: roomTypesFetching,
        isUninitialized: roomTypesUninitialized,
        refetch: refetchRoomTypes
    } = useGetRoomTypesQuery({
        propertyId,
        page,
        limit,
        category: filterCategory || undefined,
        bedType: filterBedType || undefined,
        acType: filterAcType || undefined,
    }, {
        skip: !isLoggedIn || !propertyId
    })

    /* ---------- Init ---------- */
    useEffect(() => {
        if (roomTypesLoading || roomTypesUninitialized) return
        const nextRows = (roomTypesData?.data ?? []).map((row: RateRow) => ({
            ...row,
            base_price: row.base_price == "0.00" || row.base_price == "0" ? "" : row.base_price
        }))
        setRows(nextRows);
    }, [roomTypesData, roomTypesLoading, roomTypesUninitialized]);

    const [updateRoomTypes] = useUpdateRoomTypesMutation()

    /* ---------- Update Price ---------- */
    const updatePrice = (id: number, value: string) => {
        setRows(prev =>
            prev.map(r =>
                r.id === id ? { ...r, base_price: value } : r
            )
        );
    };

    /* ---------- Detect Changes ---------- */
    const updatedRates = useMemo(() => {
        return rows
            .filter((r, i) => {
                const originalPrice = roomTypesData?.data?.[i]?.base_price;
                const normalizedOriginal = originalPrice == "0.00" || originalPrice == "0" ? "" : String(originalPrice ?? "");
                return r.base_price !== normalizedOriginal;
            })
            .map((r) => ({
                id: r.id,
                base_price: Number(r.base_price),
            }));
    }, [rows, roomTypesData]);

    /* ---------- Payload ---------- */
    const payload = useMemo(
        () => ({
            property_id: propertyId,
            rates: updatedRates,
        }),
        [updatedRates, propertyId]
    );

    const categoryOptions = useMemo<string[]>(() => {
        return roomTypesData?.filters?.categories ?? [];
    }, [roomTypesData]);

    const bedOptions = useMemo<string[]>(() => {
        return roomTypesData?.filters?.bedTypes ?? [];
    }, [roomTypesData]);

    const acOptions = useMemo<string[]>(() => {
        return roomTypesData?.filters?.acTypes ?? [];
    }, [roomTypesData]);

    const totalPages = roomTypesData?.pagination?.totalPages ?? 1;

    const updateRoomRates = () => {

        const promise = updateRoomTypes({ payload }).unwrap()
        toast.promise(promise, {
            pending: "Updating rates please wait...",
            success: "Rates update successfully",
            error: "Error updating rates"
        })
        setConfirmOpen(false);
        setEditMode(false);
    }


    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const filteredRows = useMemo(() => {
        if (!searchQuery) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter((r) =>
            r.room_category_name?.toLowerCase().includes(q) ||
            r.bed_type_name?.toLowerCase().includes(q) ||
            r.ac_type_name?.toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setFilterCategory("");
        setFilterBedType("");
        setFilterAcType("");
        resetPage();
    };

    const refreshTable = async () => {
        if (roomTypesFetching) return;
        const toastId = toast.loading("Refreshing prices...");
        try {
            await refetchRoomTypes();
            toast.dismiss(toastId);
            toast.success("Prices refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh prices");
        }
    };

    const formatted = roomTypesData?.data?.map((r: RateRow) => ({
        // ID: r.id,
        // Property: r.property_id,
        Category: r.room_category_name,
        Bed: r.bed_type_name,
        AC: r.ac_type_name,
        Price: r.base_price,
        CreatedAt: new Date(r.created_at).toLocaleDateString(),
        // UpdatedAt: r.updated_at,
    }));

    // exportToExcel(formatted, "room-categories.xlsx");

    const exportDataSheet = () => {
        if (!formatted?.length) return toast.error("No data to export");
        exportToExcel(formatted, "room-categories.xlsx", "Room Categories");
    };

    /* ---------- UI ---------- */
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    {/* Left: Title */}
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Room Categories</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage base pricing per room configuration
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* PROPERTY */}
                        {isMultiProperty && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={propertyId ?? ""}
                                    onChange={(e) => setPropertyId(+e.target.value)}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {myProperties?.properties?.map((property: { id: number; brand_name: string }) => (
                                        <option key={property.id} value={property.id}>
                                            {property.brand_name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>
                        )}

                        {permission?.can_create && editMode && (
                            <>
                                <Button
                                    variant="heroOutline"
                                    className="h-10"
                                    onClick={() => {
                                        setRows(
                                            (roomTypesData?.data ?? []).map((row: RateRow) => ({
                                                ...row,
                                                base_price: row.base_price == "0.00" || row.base_price == "0" ? "" : row.base_price
                                            }))
                                        );
                                        setEditMode(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    variant="hero"
                                    className="h-10"
                                    disabled={updatedRates.length === 0}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    Update
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="flex flex-col border-b-0">
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
                                    label="CATEGORY"
                                    value={filterCategory}
                                    onChange={setFilterCategory}
                                    options={[
                                        { label: "Any", value: "" },
                                        ...categoryOptions.map(v => ({ label: v, value: v }))
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="BED TYPE"
                                    value={filterBedType}
                                    onChange={setFilterBedType}
                                    options={[
                                        { label: "Any", value: "" },
                                        ...bedOptions.map(v => ({ label: v, value: v }))
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Rates",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportDataSheet,
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
                                            disabled: roomTypesFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>

                            <GridToolbarRow className="gap-2">
                                <GridToolbarSelect
                                    label="AC TYPE"
                                    value={filterAcType}
                                    onChange={setFilterAcType}
                                    options={[
                                        { label: "Any", value: "" },
                                        ...acOptions.map(v => ({ label: v, value: v }))
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
                            label: "Room ID",
                            headClassName: "text-center",
                            cellClassName: "text-center font-medium min-w-[90px]",
                            render: (r: RateRow) => (
                                <span className="inline-flex items-center font-semibold text-primary text-sm tracking-wide">
                                    {formatModuleDisplayId("room", r.id)}
                                </span>
                            ),
                        },
                        {
                            label: "Room Category",
                            key: "room_category_name",
                            cellClassName: "font-semibold text-foreground",
                        },
                        {
                            label: "AC Type",
                            key: "ac_type_name",
                            cellClassName: "text-muted-foreground",
                        },
                        {
                            label: "Bed Type",
                            key: "bed_type_name",
                            cellClassName: "text-muted-foreground",
                        },
                        {
                            label: "Base Price",
                            headClassName: "text-center",
                            cellClassName: "text-center font-medium",
                            render: (r: RateRow) =>
                                !editMode ? (
                                    <span className="px-2 py-1 bg-muted/50 rounded text-sm text-foreground">{r.base_price || 0}</span>
                                ) : (
                                    <Input
                                        type="text"
                                        min={0}
                                        className="h-8 max-w-[120px] mx-auto text-center font-semibold focus-visible:ring-1 focus-visible:ring-primary"
                                        value={r.base_price || 0}
                                        onChange={(e) =>
                                            updatePrice(
                                                r.id,
                                                normalizeNumberInput(e.target.value).toString()
                                            )
                                        }
                                    />
                                ),
                        },
                    ] as ColumnDef[]}
                    data={filteredRows}
                    loading={roomTypesLoading}
                    emptyText="No room categories found"
                    minWidth="760px"
                    actionLabel=""
                    actionClassName="text-center w-[60px]"
                    actions={(r: RateRow) => (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                    aria-label={`Edit price for ${r.room_category_name}`}
                                    onClick={() => setEditMode(true)}
                                >
                                    <Pencil className="w-4 h-4 mx-auto" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Price</TooltipContent>
                        </Tooltip>
                    )}
                    enablePagination
                    paginationProps={{
                        page,
                        totalPages,
                        setPage,
                        totalRecords: roomTypesData?.pagination?.total ?? rows.length,
                        limit,
                        onLimitChange: handleLimitChange,
                        disabled: roomTypesLoading || roomTypesFetching,
                    }}
                />
                    </div>
                </div>
            </section>

            {/* Confirm Update */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Price Update</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-sm">
                        <p>
                            You are about to update{" "}
                            <strong>{updatedRates.length}</strong> room
                            configuration(s).
                        </p>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="heroOutline"
                                onClick={() => setConfirmOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={updateRoomRates}
                            >
                                Confirm Update
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

