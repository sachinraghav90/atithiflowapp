import { useEffect, useState } from "react";
import { Trash2, PlusCircle, Pencil, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell } from "@/components/ui/data-grid";
import {
    useAddVehiclesMutation,
    useGetVehiclesByBookingQuery,
} from "@/redux/services/hmsApi";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";

type VehicleType = "CAR" | "BIKE" | "OTHER";

type VehicleForm = {
    id?: number;
    vehicle_type?: VehicleType | "";
    vehicle_name?: string;
    vehicle_number?: string;
    room_no?: string;
    is_active?: boolean;
    color?: string;
};

type Props = {
    bookingId: string;
    rooms: {
        room_id: number;
        room_no: string;
        room_status: string;
    }[];
};

const EMPTY_VEHICLE: VehicleForm = {
    vehicle_type: "",
    vehicle_name: "",
    vehicle_number: "",
    room_no: "",
    color: "",
    is_active: true,
};

function createEmptyVehicle(): VehicleForm {
    return { ...EMPTY_VEHICLE };
}

function cloneVehicles(vehicles: VehicleForm[]) {
    return JSON.parse(JSON.stringify(vehicles)) as VehicleForm[];
}

function withDefaultDraftVehicle(vehicles: VehicleForm[]) {
    return [...cloneVehicles(vehicles), createEmptyVehicle()];
}

function isDraftVehiclePopulated(vehicle: VehicleForm) {
    return Boolean(
        vehicle.vehicle_type ||
        vehicle.vehicle_name?.trim() ||
        vehicle.vehicle_number?.trim() ||
        vehicle.color?.trim() ||
        vehicle.room_no?.trim()
    );
}

export default function VehiclesEmbedded({ bookingId, rooms }: Props) {
    const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [originalVehicles, setOriginalVehicles] = useState<VehicleForm[]>([]);
    const [editingRowIds, setEditingRowIds] = useState<number[]>([]);

    const { data } = useGetVehiclesByBookingQuery(
        { bookingId },
        { skip: !bookingId }
    );

    const [upsertVehicles, { isLoading }] = useAddVehiclesMutation();

    useEffect(() => {
        if (!data?.vehicles) return;
        const fetchedVehicles = data.vehicles;
        setVehicles(withDefaultDraftVehicle(fetchedVehicles));
        setOriginalVehicles(fetchedVehicles);
        setEditingRowIds([]);
    }, [data]);

    const addVehicle = () => {
        setVehicles((prev) => [...prev, createEmptyVehicle()]);
    };

    const removeVehicle = (index: number) => {
        setVehicles((prev) => {
            const draftCount = prev.filter((vehicle) => !vehicle.id).length;
            if (prev[index]?.id || draftCount <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const updateVehicle = (index: number, patch: Partial<VehicleForm>) => {
        setVehicles((prev) =>
            prev.map((vehicle, i) => (i === index ? { ...vehicle, ...patch } : vehicle))
        );
    };

    const toggleEditRow = (id: number) => {
        setEditingRowIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const isRowEditable = (vehicle: VehicleForm) => {
        if (!vehicle.id) return true;
        return editingRowIds.includes(vehicle.id);
    };

    const handleCancel = () => {
        setVehicles(withDefaultDraftVehicle(originalVehicles));
        setEditingRowIds([]);
    };

    const normalizeVehicleForSave = (vehicle: VehicleForm) => ({
        ...vehicle,
        vehicle_type: vehicle.vehicle_type || null,
        vehicle_name: vehicle.vehicle_name?.trim() || "",
        vehicle_number: vehicle.vehicle_number?.trim() || "",
        color: vehicle.color?.trim() || "",
        room_no: vehicle.room_no?.trim() || "",
    });

    const isExistingVehicleChanged = (vehicle: VehicleForm) => {
        if (!vehicle.id) return false;

        const original = originalVehicles.find((item) => item.id === vehicle.id);
        if (!original) return true;

        const currentPayload = normalizeVehicleForSave(vehicle);
        const originalPayload = normalizeVehicleForSave(original);

        return (
            String(currentPayload.vehicle_type ?? "") !== String(originalPayload.vehicle_type ?? "") ||
            currentPayload.vehicle_name !== originalPayload.vehicle_name ||
            currentPayload.vehicle_number !== originalPayload.vehicle_number ||
            currentPayload.color !== originalPayload.color ||
            currentPayload.room_no !== originalPayload.room_no ||
            Boolean(currentPayload.is_active) !== Boolean(originalPayload.is_active)
        );
    };

    const draftVehicleCount = vehicles.filter((vehicle) => !vehicle.id).length;
    const hasExistingVehicles = vehicles.some((vehicle) => !!vehicle.id);
    const showVehicleActions = hasExistingVehicles || draftVehicleCount > 1;
    const newVehiclesToSave = vehicles.filter((vehicle) => !vehicle.id && isDraftVehiclePopulated(vehicle));
    const existingVehiclesToSave = vehicles.filter(isExistingVehicleChanged);
    const hasSavableVehicleChanges = newVehiclesToSave.length > 0 || existingVehiclesToSave.length > 0;

    const handleSave = async () => {
        if (!hasSavableVehicleChanges) {
            toast.info("No vehicle changes to save");
            return;
        }

        const payload = [
            ...existingVehiclesToSave,
            ...newVehiclesToSave,
        ].map(normalizeVehicleForSave);

        try {
            await upsertVehicles({ bookingId, vehicles: payload }).unwrap();
            toast.success("Vehicles updated successfully");
            setEditingRowIds([]);
        } catch {
            toast.error("Failed to update vehicles");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Vehicles</h2>
                    <p className="text-[11px] text-muted-foreground/80">
                        Manage multiple vehicle entries in one save.
                    </p>
                </div>

            </div>

            <div className="editable-grid-compact grid-header-inside-table border-2 border-primary/50 rounded-[5px] overflow-hidden flex flex-col shadow-sm">
                <div className="grid-scroll-x w-full bg-background">
                    <div className="w-full min-w-[900px]">
                        <DataGrid>
                            {/* HEADER */}
                            <DataGridHeader>
                                <DataGridHead className="border-r border-slate-200/20">Type</DataGridHead>
                                <DataGridHead className="border-r border-slate-200/20">Name</DataGridHead>
                                <DataGridHead className="border-r border-slate-200/20">Number</DataGridHead>
                                <DataGridHead className="border-r border-slate-200/20">Color</DataGridHead>
                                <DataGridHead className="border-r border-slate-200/20">Room</DataGridHead>
                                {showVehicleActions && (
                                    <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                )}
                            </DataGridHeader>

                            {/* BODY */}
                            <tbody>
                                {vehicles.map((vehicle, index) => (
                                    <DataGridRow key={vehicle.id ?? `vehicle-${index}`}>
                                        {/* TYPE */}
                                        <DataGridCell className="border-r border-slate-200/40">
                                            {isRowEditable(vehicle) ? (
                                                <NativeSelect
                                                    value={vehicle.vehicle_type ?? ""}
                                                    onChange={(e) =>
                                                        updateVehicle(index, {
                                                            vehicle_type: e.target.value as VehicleType | "",
                                                        })
                                                    }
                                                    className="h-9 w-full rounded-[3px] border border-border bg-background px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                >
                                                    <option value="" disabled>--Please Select--</option>
                                                    <option value="CAR">Car</option>
                                                    <option value="BIKE">Bike</option>
                                                    <option value="OTHER">Other</option>
                                                </NativeSelect>
                                            ) : (
                                                <span className="text-sm font-medium">{vehicle.vehicle_type || "—"}</span>
                                            )}
                                        </DataGridCell>

                                        {/* NAME */}
                                        <DataGridCell className="border-r border-slate-200/40">
                                            {isRowEditable(vehicle) ? (
                                                <Input
                                                    value={vehicle.vehicle_name ?? ""}
                                                    className="h-9 w-full rounded-[3px] border border-border bg-background px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                    onChange={(e) =>
                                                        updateVehicle(index, {
                                                            vehicle_name: normalizeTextInput(e.target.value),
                                                        })
                                                    }
                                                />
                                            ) : (
                                                <span className="text-sm font-medium">{vehicle.vehicle_name || "—"}</span>
                                            )}
                                        </DataGridCell>

                                        {/* NUMBER */}
                                        <DataGridCell className="border-r border-slate-200/40">
                                            {isRowEditable(vehicle) ? (
                                                <Input
                                                    value={vehicle.vehicle_number ?? ""}
                                                    className="h-9 w-full rounded-[3px] border border-border bg-background px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                    onChange={(e) =>
                                                        updateVehicle(index, {
                                                            vehicle_number: normalizeTextInput(e.target.value),
                                                        })
                                                    }
                                                />
                                            ) : (
                                                <span className="text-sm font-medium">{vehicle.vehicle_number || "—"}</span>
                                            )}
                                        </DataGridCell>

                                        {/* COLOR */}
                                        <DataGridCell className="border-r border-slate-200/40">
                                            {isRowEditable(vehicle) ? (
                                                <Input
                                                    value={vehicle.color ?? ""}
                                                    className="h-9 w-full rounded-[3px] border border-border bg-background px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                    onChange={(e) =>
                                                        updateVehicle(index, {
                                                            color: normalizeTextInput(e.target.value),
                                                        })
                                                    }
                                                />
                                            ) : (
                                                <span className="text-sm font-medium">{vehicle.color || "—"}</span>
                                            )}
                                        </DataGridCell>

                                        {/* ROOM */}
                                        <DataGridCell className="border-r border-slate-200/40">
                                            {isRowEditable(vehicle) ? (
                                                <NativeSelect
                                                    value={vehicle.room_no ?? ""}
                                                    onChange={(e) =>
                                                        updateVehicle(index, {
                                                            room_no: normalizeTextInput(e.target.value),
                                                        })
                                                    }
                                                    className="h-9 w-full rounded-[3px] border border-border bg-background px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                                >
                                                    <option value="" disabled>--Please Select--</option>
                                                    {rooms.map((room) => (
                                                        <option key={room.room_id} value={room.room_no}>
                                                            {room.room_no}
                                                        </option>
                                                    ))}
                                                </NativeSelect>
                                            ) : (
                                                <span className="text-sm font-medium">{vehicle.room_no || "—"}</span>
                                            )}
                                        </DataGridCell>

                                        {showVehicleActions && (
                                            <DataGridCell className="text-center">
                                                {vehicle.id ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-primary hover:text-primary/80 transition-colors"
                                                        onClick={() => toggleEditRow(vehicle.id!)}
                                                        aria-label={editingRowIds.includes(vehicle.id) ? "Stop editing vehicle row" : "Edit vehicle row"}
                                                    >
                                                        {editingRowIds.includes(vehicle.id) ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : (
                                                            <Pencil className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                ) : draftVehicleCount > 1 ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors"
                                                        onClick={() => removeVehicle(index)}
                                                        aria-label="Remove vehicle row"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    null
                                                )}
                                            </DataGridCell>
                                        )}
                                    </DataGridRow>
                                ))}
                            </tbody>
                        </DataGrid>
                    </div>
                </div>

                {/* ADD BUTTON FOOTER */}
                <div className="editable-grid-footer p-3 bg-background border-t border-border flex items-center">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors px-1"
                        onClick={addVehicle}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Add New Vehicle
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <Button
                    variant="heroOutline"
                    className="min-w-[92px]"
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <Button
                    variant="hero"
                    className="min-w-[132px]"
                    onClick={() => setConfirmOpen(true)}
                    disabled={isLoading || !hasSavableVehicleChanges}
                >
                    Save Vehicles
                </Button>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Save</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to save vehicle details?
                    </p>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="hero"
                            disabled={isLoading}
                            onClick={async () => {
                                setConfirmOpen(false);
                                await handleSave();
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
