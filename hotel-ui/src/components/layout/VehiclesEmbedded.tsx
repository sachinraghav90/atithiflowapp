import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

function cloneVehicles(vehicles: VehicleForm[]) {
    return JSON.parse(JSON.stringify(vehicles)) as VehicleForm[];
}

export default function VehiclesEmbedded({ bookingId, rooms }: Props) {
    const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [originalVehicles, setOriginalVehicles] = useState<VehicleForm[]>([]);

    const { data } = useGetVehiclesByBookingQuery(
        { bookingId },
        { skip: !bookingId }
    );

    const [upsertVehicles, { isLoading }] = useAddVehiclesMutation();

    useEffect(() => {
        if (!data?.vehicles) return;
        setVehicles(data.vehicles);
        setOriginalVehicles(data.vehicles);
    }, [data]);

    const startEditing = () => {
        setOriginalVehicles(cloneVehicles(vehicles));
        setIsEditing(true);
    };

    const addVehicle = () => {
        if (!isEditing) {
            startEditing();
        }

        setVehicles((prev) => [...prev, { ...EMPTY_VEHICLE }]);
    };

    const removeVehicle = (index: number) => {
        setVehicles((prev) => prev.filter((_, i) => i !== index));
    };

    const updateVehicle = (index: number, patch: Partial<VehicleForm>) => {
        setVehicles((prev) =>
            prev.map((vehicle, i) => (i === index ? { ...vehicle, ...patch } : vehicle))
        );
    };

    const handleCancel = () => {
        setVehicles(cloneVehicles(originalVehicles));
        setIsEditing(false);
    };

    const handleSave = async () => {
        const payload = vehicles.map((vehicle) => ({
            ...vehicle,
            vehicle_type: vehicle.vehicle_type || null,
            vehicle_name: vehicle.vehicle_name?.trim() || "",
            vehicle_number: vehicle.vehicle_number?.trim() || "",
            color: vehicle.color?.trim() || "",
            room_no: vehicle.room_no?.trim() || "",
        }));

        try {
            await upsertVehicles({ bookingId, vehicles: payload }).unwrap();
            toast.success("Vehicles updated successfully");
            setOriginalVehicles(cloneVehicles(payload));
            setIsEditing(false);
        } catch {
            toast.error("Failed to update vehicles");
        }
    };

    const columns = useMemo<ColumnDef<VehicleForm>[]>(() => [
        {
            label: "Type",
            className: "w-[150px]",
            render: (vehicle, index) => (
                isEditing ? (
                    <NativeSelect
                        value={vehicle.vehicle_type ?? ""}
                        onChange={(e) =>
                            updateVehicle(index, {
                                vehicle_type: e.target.value as VehicleType | "",
                            })
                        }
                        className="h-9 min-w-[130px] rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="CAR">Car</option>
                        <option value="BIKE">Bike</option>
                        <option value="OTHER">Other</option>
                    </NativeSelect>
                ) : (
                    <span>{vehicle.vehicle_type || "—"}</span>
                )
            ),
        },
        {
            label: "Name",
            render: (vehicle, index) => (
                isEditing ? (
                    <Input
                        value={vehicle.vehicle_name ?? ""}
                        className="h-9"
                        onChange={(e) =>
                            updateVehicle(index, {
                                vehicle_name: normalizeTextInput(e.target.value),
                            })
                        }
                    />
                ) : (
                    <span>{vehicle.vehicle_name || "—"}</span>
                )
            ),
        },
        {
            label: "Number",
            render: (vehicle, index) => (
                isEditing ? (
                    <Input
                        value={vehicle.vehicle_number ?? ""}
                        className="h-9"
                        onChange={(e) =>
                            updateVehicle(index, {
                                vehicle_number: normalizeTextInput(e.target.value),
                            })
                        }
                    />
                ) : (
                    <span>{vehicle.vehicle_number || "—"}</span>
                )
            ),
        },
        {
            label: "Color",
            render: (vehicle, index) => (
                isEditing ? (
                    <Input
                        value={vehicle.color ?? ""}
                        className="h-9"
                        onChange={(e) =>
                            updateVehicle(index, {
                                color: normalizeTextInput(e.target.value),
                            })
                        }
                    />
                ) : (
                    <span>{vehicle.color || "—"}</span>
                )
            ),
        },
        {
            label: "Room",
            className: "w-[150px]",
            render: (vehicle, index) => (
                isEditing ? (
                    <NativeSelect
                        value={vehicle.room_no ?? ""}
                        onChange={(e) =>
                            updateVehicle(index, {
                                room_no: normalizeTextInput(e.target.value),
                            })
                        }
                        className="h-9 min-w-[130px] rounded-md border border-input bg-background px-3 text-sm"
                    >
                        {rooms.map((room) => (
                            <option key={room.room_id} value={room.room_no}>
                                {room.room_no}
                            </option>
                        ))}
                    </NativeSelect>
                ) : (
                    <span>{vehicle.room_no || "—"}</span>
                )
            ),
        },
    ], [isEditing, rooms]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Vehicles</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage multiple vehicle entries in one save.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <Button
                            variant="heroOutline"
                            disabled={vehicles.length === 0}
                            onClick={startEditing}
                        >
                            Edit
                        </Button>
                    )}

                    <Button variant="heroOutline" onClick={addVehicle}>
                        + Add Vehicle
                    </Button>

                    {isEditing && (
                        <>
                            <Button variant="heroOutline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={() => setConfirmOpen(true)}
                                disabled={isLoading}
                            >
                                Save Vehicles
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <AppDataGrid
                columns={columns}
                data={vehicles}
                minWidth="900px"
                emptyText="No vehicles added"
                actions={isEditing
                    ? (_, index) => (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Trash2
                                    className="mx-auto h-4 w-4 cursor-pointer text-red-500 transition-colors hover:text-red-700"
                                    aria-label="Remove vehicle row"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        removeVehicle(index);
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent className="bg-white text-black shadow-md">
                                Remove Vehicle
                            </TooltipContent>
                        </Tooltip>
                    )
                    : undefined}
                actionLabel="Action"
                actionClassName="text-center w-[90px]"
                rowKey={(vehicle, index) => vehicle.id ?? `vehicle-${index}`}
            />

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
