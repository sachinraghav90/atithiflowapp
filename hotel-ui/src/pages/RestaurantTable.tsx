import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
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
import { useCreateRestaurantTableMutation, useGetMyPropertiesQuery, useGetRestaurantTableQuery, useUpdateRestaurantTableMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { DataGridPagination } from "@/components/ui/data-grid";

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

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

// CREATE
export function buildCreateTablePayload(data: {
    property_id: number;
    table_no: string;
    capacity: number;
    location: string;
    status: string;
    min_order_amount: number;
    is_active: boolean;
}, propertyId) {
    return {
        property_id: propertyId,
        table_no: data.table_no,
        capacity: data.capacity,
        location: data.location,
        status: data.status,
        min_order_amount: data.min_order_amount,
        is_active: data.is_active
    };
}

// UPDATE
function buildUpdateTablePayload(data: {
    table_no: string;
    capacity: number;
    status: string;
    updated_by: string;
}) {
    return {
        table_no: data.table_no,
        capacity: data.capacity,
        status: data.status,
        updated_by: data.updated_by
    };
}

// STATUS ONLY UPDATE
function buildStatusUpdatePayload(status: string, updatedBy: string) {
    return {
        status,
        // updated_by: updatedBy
    };
}


export function RestaurantTables() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [open, setOpen] = useState(false);

    const [form, setForm] = useState({
        property_id: null,
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

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useGetRestaurantTableQuery({ propertyId: selectedPropertyId, page, limit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createRestaurantTable] = useCreateRestaurantTableMutation()
    const [updateRestaurantTable] = useUpdateRestaurantTableMutation()

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);
    /* ---------------- Actions ---------------- */

    const createTable = () => {
        const payload = buildCreateTablePayload(form, selectedPropertyId);
        const promise = createRestaurantTable(payload).unwrap()
        toast.promise(promise, {
            error: "Error creating table",
            pending: "Creating table please wait",
            success: "Table created successfully"
        })
        setOpen(false);
    };

    const updateTableStatus = (tableId: string, status: string) => {
        const payload = buildStatusUpdatePayload(status, "uuid");
        const promise = updateRestaurantTable({ id: tableId, payload }).unwrap()
        toast.promise(promise, {
            error: "Error updating status",
            pending: "Updating status please wait",
            success: "Status updated!"
        })
    };

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex flex-col flex-1 overflow-hidden p-6 lg:p-8 gap-6">

                {/* Header */}
                <div className="flex justify-between items-center shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold">Restaurant Tables</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage dining tables & seating
                        </p>
                    </div>
                    {(isSuperAdmin || isOwner) && (
                        <div className="w-full sm:w-64 space-y-1">
                            <Label className="text-xs">Property</Label>
                            <NativeSelect
                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                value={selectedPropertyId ?? ""}
                                onChange={(e) =>
                                    setSelectedPropertyId(Number(e.target.value) || null)
                                }
                                disabled={!(isSuperAdmin || isOwner)}
                            >
                                <option value="" disabled>Select property</option>
                                {!myPropertiesLoading &&
                                    myProperties?.properties?.map((property) => (
                                        <option key={property.id} value={property.id}>
                                            {property.brand_name}
                                        </option>
                                    ))}
                            </NativeSelect>
                        </div>
                    )}
                    {permission?.can_create && <Button variant="hero" onClick={() => setOpen(true)}>
                        Add Table
                    </Button>}
                </div>

                {/* Table List */}
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                    {/* Restaurant Tables Table */}
                    <div className="rounded-[5px] border bg-card overflow-hidden">

                        {/* Header */}
                        <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b text-sm font-medium text-muted-foreground">
                            <span>Table No</span>
                            <span>Capacity</span>
                            <span>Location</span>
                            <span>Min Order (₹)</span>
                            <span>Status</span>
                            {/* <span></span> */}
                        </div>

                        {/* Rows */}
                        {data?.data?.map((table) => (
                            <div
                                key={table.id}
                                className="grid grid-cols-5 gap-4 px-6 py-4 border-b items-center text-sm"
                            >
                                {/* Table No */}
                                <div className="font-medium">
                                    {table.table_no}
                                </div>

                                {/* Capacity */}
                                <div>
                                    {table.capacity}
                                </div>

                                {/* Location */}
                                <div className="text-muted-foreground">
                                    {table.location || "—"}
                                </div>

                                {/* Min Order */}
                                <div>
                                    ₹{table.min_order_amount || 0}
                                </div>

                                {/* Status */}
                                <div>
                                    <NativeSelect
                                        className="h-9 rounded-[3px] border px-2 text-sm w-full"
                                        value={table.status}
                                        onChange={(e) =>
                                            permission?.can_create &&
                                            updateTableStatus(table.id, e.target.value)
                                        }
                                    >
                                        {TABLE_STATUSES.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </div>

                                {/* Actions (future-proof) */}
                                {/* <div className="text-xs text-muted-foreground">
                                    —
                                </div> */}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pagination */}
                <DataGridPagination
                    page={page}
                    totalPages={data?.pagination?.totalPages ?? 1}
                    setPage={setPage}
                    totalRecords={data?.pagination?.totalItems ?? data?.pagination?.total ?? data?.data?.length ?? 0}
                    limit={limit}
                    onLimitChange={(value) => {
                        setLimit(value);
                        setPage(1);
                    }}
                    disabled={!data}
                />

            </section>

            {/* ================= CREATE TABLE MODAL ================= */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Table</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Table No *</Label>
                            <Input
                                value={form.table_no}
                                onChange={(e) =>
                                    setForm(f => ({ ...f, table_no: e.target.value }))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label>Capacity</Label>
                                <Input
                                    type="text"
                                    value={form.capacity}
                                    min={1}
                                    onChange={(e) =>
                                        setForm(f => ({ ...f, capacity: +(normalizeNumberInput(e.target.value)) }))
                                    }
                                />
                            </div>

                            {/* <div>
                                <Label>Status</Label>
                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                    value={form.status}
                                    onChange={(e) =>
                                        setForm(f => ({ ...f, status: e.target.value }))
                                    }
                                >
                                    {TABLE_STATUSES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </NativeSelect>
                            </div> */}
                        </div>

                        <div>
                            <Label>Location</Label>
                            <Input
                                value={form.location}
                                onChange={(e) =>
                                    setForm(f => ({ ...f, location: e.target.value }))
                                }
                            />
                        </div>

                        <div>
                            <Label>Minimum Order Amount</Label>
                            <Input
                                type="number"
                                value={form.min_order_amount}
                                onChange={(e) =>
                                    setForm(f => ({ ...f, min_order_amount: Number(e.target.value) }))
                                }
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="heroOutline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="hero" onClick={createTable}>
                                Create Table
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

