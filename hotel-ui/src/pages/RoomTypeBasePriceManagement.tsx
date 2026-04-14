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
import { Download } from "lucide-react";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";

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
    const [propertyId, setPropertyId] = useState<number | undefined>();

    const [rows, setRows] = useState<RateRow[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(9);
    const [editMode, setEditMode] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState("");
    const [filterBedType, setFilterBedType] = useState("");
    const [filterAcType, setFilterAcType] = useState("");
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: properties, isLoading: propertiesLoading, isUninitialized: propertiesUninitialized } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const {
        data: roomTypesData,
        isLoading: roomTypesLoading,
        isFetching: roomTypesFetching,
        isUninitialized: roomTypesUninitialized
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

    useEffect(() => {
        if (!propertyId && properties?.properties?.length > 0) {
            setPropertyId(properties.properties[0].id);
        }
    }, [properties]);

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

    useEffect(() => {
        setPage(1);
    }, [propertyId, filterCategory, filterBedType, filterAcType]);

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

    const formatted = roomTypesData?.data?.map(r => ({
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


    /* ---------- UI ---------- */
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-2xl font-bold">Room Category</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage base pricing per room configuration
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {permission?.can_create && (
                            !editMode ? (
                                <Button
                                    variant="hero"
                                    onClick={() => setEditMode(true)}
                                >
                                    Edit Prices
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="heroOutline"
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
                                        disabled={updatedRates.length === 0}
                                        onClick={() => setConfirmOpen(true)}
                                    >
                                        Update
                                    </Button>
                                </>
                            )
                        )}
                        <Download
                            color="hsl(189.29deg 68.89% 44.12%)"
                            className="cursor-pointer"
                            onClick={() =>
                                exportToExcel(
                                    formatted,
                                    "room-categories.xlsx",
                                    "Room Categories"
                                )
                            } />
                    </div>
                </div>

                <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                <div className="mb-4 flex flex-wrap gap-4 items-end [&>div]:w-[220px]">

                    {/* PROPERTY */}
                    {(isSuperAdmin || isOwner) && (
                        <div className="max-w-sm space-y-2">
                            <Label>Property</Label>
                            <NativeSelect
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={propertyId}
                                onChange={(e) => setPropertyId(+e.target.value)}
                            >
                                <option value="" disabled>Select Property</option>

                                {properties?.properties?.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.brand_name}
                                    </option>
                                ))}
                            </NativeSelect>
                        </div>
                    )}

                    {/* ROOM CATEGORY */}
                    <div className="space-y-2">
                        <Label>Room Category</Label>
                        <NativeSelect
                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">All</option>
                            {categoryOptions?.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </NativeSelect>
                    </div>

                    {/* BED TYPE */}
                    <div className="space-y-2">
                        <Label>Bed Type</Label>
                        <NativeSelect
                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                            value={filterBedType}
                            onChange={(e) => setFilterBedType(e.target.value)}
                        >
                            <option value="">All</option>
                            {bedOptions?.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </NativeSelect>
                    </div>

                    {/* AC TYPE */}
                    <div className="space-y-2">
                        <Label>AC Type</Label>
                        <NativeSelect
                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                            value={filterAcType}
                            onChange={(e) => setFilterAcType(e.target.value)}
                        >
                            <option value="">All</option>
                            {acOptions?.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </NativeSelect>
                    </div>

                </div>
                <AppDataGrid
                    columns={[
                        {
                            label: "Room Category",
                            key: "room_category_name",
                        },
                        {
                            label: "AC Type",
                            key: "ac_type_name",
                        },
                        {
                            label: "Bed Type",
                            key: "bed_type_name",
                        },
                        {
                            label: "Base Price",
                            render: (r: RateRow) =>
                                !editMode ? (
                                    <span>{r.base_price || 0}</span>
                                ) : (
                                    <Input
                                        type="text"
                                        min={0}
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
                    data={rows}
                    loading={roomTypesLoading}
                    emptyText="No room categories found"
                    minWidth="760px"
                    enablePagination
                    paginationProps={{
                        page,
                        totalPages,
                        setPage,
                        totalRecords: roomTypesData?.pagination?.total ?? rows.length,
                        limit,
                        onLimitChange: (value) => {
                            setLimit(value);
                            setPage(1);
                        },
                        disabled: roomTypesLoading || roomTypesFetching,
                    }}
                />
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

