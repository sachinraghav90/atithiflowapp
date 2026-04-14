import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { toast } from "react-toastify";
import {
    useGetGuestsByBookingQuery,
    useAddGuestsByBookingMutation,
    useGetVehiclesByBookingQuery,
    useAddVehiclesMutation,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";

/* ---------------- Types ---------------- */
type GuestForm = {
    id?: string;
    temp_key?: string;
    first_name: string;
    middle_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    gender?: string;
    dob?: string;
    nationality?: string;
    address?: string;
    guest_type?: "ADULT" | "CHILD";
    id_type?: string;
    id_number?: string;
    has_id_proof?: boolean;
    emergency_contact?: string;
    emergency_contact_name?: string;
    _removed?: boolean; // UI only
};

type VehicleForm = {
    id?: number;
    vehicle_type?: "CAR" | "BIKE" | "OTHER";
    vehicle_name?: string;
    vehicle_number?: string;
    room_no?: string;
    is_active?: boolean;
};

export default function BookingGuestsManagement() {
    const navigate = useNavigate();
    const { state } = useLocation() as any;
    const { bookingId, guestCount } = state || {};
    const [collapsed, setCollapsed] = useState(false);

    const isLoggedIn = useAppSelector((s) => s.isLoggedIn.value);

    const [guests, setGuests] = useState<GuestForm[]>([]);
    const [removedGuestIds, setRemovedGuestIds] = useState<string[]>([]);
    const [vehicles, setVehicles] = useState<VehicleForm[]>([]);

    const [idProofFiles, setIdProofFiles] = useState<Record<string, File>>({});
    const [previewId, setPreviewId] = useState<string | null>(null);

    const [updateAdult, setUpdateAdult] = useState(true);

    const { data } = useGetGuestsByBookingQuery({ booking_id: bookingId }, {
        skip: !bookingId || !isLoggedIn
    });

    const { data: vehiclesData } = useGetVehiclesByBookingQuery({ bookingId }, {
        skip: !isLoggedIn || !bookingId
    })

    const [upsertGuests, { isLoading }] = useAddGuestsByBookingMutation();
    const [upsertVehicles] = useAddVehiclesMutation()

    /* ---------------- Init Guests ---------------- */
    useEffect(() => {
        if (!bookingId || !guestCount) {
            navigate("/bookings");
            return;
        }

        if (!data?.guests) return;

        const existing: GuestForm[] = data.guests.map((g: any) => ({
            ...g,
        }));

        const remaining = guestCount - existing.length;

        const emptyGuests: GuestForm[] = Array.from(
            { length: Math.max(0, remaining) },
            (_, i) => ({
                temp_key: `temp-${i}`,
                first_name: "",
            })
        );

        setGuests([...existing, ...emptyGuests]);
    }, [data, bookingId, guestCount]);

    useEffect(() => {
        if (!vehiclesData?.vehicles) return;
        setVehicles(vehiclesData.vehicles);
    }, [vehiclesData]);


    /* ---------------- Helpers ---------------- */
    const updateGuest = (index: number, patch: Partial<GuestForm>) => {
        setGuests((prev) =>
            prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
        );
    };

    const addGuest = () => {
        setGuests((prev) => [
            ...prev,
            { temp_key: `temp-${Date.now()}`, first_name: "" },
        ]);
    };

    const removeGuest = (index: number) => {
        const guest = guests[index];
        if (guest.id) {
            setRemovedGuestIds((p) => [...p, guest.id!]);
        }
        setGuests((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFile = (key: string, file?: File) => {
        if (!file) return;
        setIdProofFiles((p) => ({ ...p, [key]: file }));
    };

    const addVehicle = () => {
        setVehicles((v) => [
            ...v,
            {
                vehicle_type: "CAR",
                vehicle_name: "",
                vehicle_number: "",
                room_no: "",
                is_active: true,
            },
        ]);
    };

    const removeVehicle = (index: number) => {
        setVehicles((v) => v.filter((_, i) => i !== index));
    };

    const updateVehicle = (index: number, patch: Partial<VehicleForm>) => {
        setVehicles((prev) =>
            prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
        );
    };


    /* ---------------- Validation ---------------- */
    const validate = () => {
        if (guests.some((g) => !g.first_name?.trim())) {
            toast.error("First name is required for all guests");
            return false;
        }
        return true;
    };

    /* ---------------- Save ---------------- */
    const handleSave = async () => {
        if (!validate()) return;

        const formData = new FormData();

        formData.append("guests", JSON.stringify(guests));
        formData.append(
            "removed_guest_ids",
            JSON.stringify(removedGuestIds)
        );
        formData.append("update_adult", String(updateAdult));
        formData.append(
            "adult",
            guests.filter((g) => g.guest_type !== "CHILD").length.toString()
        );

        const idProofMap: Record<string, number> = {};
        let i = 0;

        Object.entries(idProofFiles).forEach(([key, file]) => {
            formData.append("id_proofs", file);
            idProofMap[key] = i++;
        });

        formData.append("id_proof_map", JSON.stringify(idProofMap));

        try {
            await upsertGuests({ bookingId, formData }).unwrap();
            await upsertVehicles({ bookingId, vehicles }).unwrap()
            toast.success("Guests saved successfully");
            navigate("/bookings");
        } catch {
            toast.error("Failed to save guests");
        }
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="min-h-screen bg-background">
            <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            <main className={`${collapsed ? "lg:ml-16" : "lg:ml-56"} flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden`}>
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                    <div className="flex justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Guests</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage booking guests
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="heroOutline"
                                onClick={addGuest}
                            >
                                + Add Guest
                            </Button>

                            <Button
                                variant="hero"
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                Save Guests
                            </Button>
                        </div>
                    </div>

                    {guests.map((g, index) => {
                        const key = g.id ?? g.temp_key!;

                        return (
                            <div
                                key={key}
                                className="rounded-[5px] border bg-card p-6 space-y-4"
                            >
                                <div className="flex justify-between">
                                    <p className="font-semibold">
                                        Guest {index + 1}
                                    </p>

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        disabled={index === 0}
                                        onClick={() =>
                                            removeGuest(index)
                                        }
                                    >
                                        Remove
                                    </Button>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div>
                                        <Label>First Name *</Label>
                                        <Input
                                            value={g.first_name}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    first_name:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <Label>Middle Name</Label>
                                        <Input
                                            value={g.middle_name ?? ""}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    middle_name:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <Label>Last Name</Label>
                                        <Input
                                            value={g.last_name ?? ""}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    last_name:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <Input
                                        placeholder="Phone"
                                        value={g.phone ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                phone: e.target.value,
                                            })
                                        }
                                    />
                                    <Input
                                        placeholder="Email"
                                        value={g.email ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                email: e.target.value,
                                            })
                                        }
                                    />
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handleFile(
                                                key,
                                                e.target.files?.[0]
                                            )
                                        }
                                    />
                                </div>

                                {g.has_id_proof && g.id && (
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        onClick={() =>
                                            setPreviewId(
                                                `${import.meta.env.VITE_API_URL
                                                }/guests/${g.id}/id-proof`
                                            )
                                        }
                                    >
                                        View ID Proof
                                    </Button>
                                )}

                                {index === 0 && (
                                    <div className="mt-6 rounded-[5px] border bg-muted/30 p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold">Vehicle Details</p>

                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={addVehicle}
                                            >
                                                + Add Vehicle
                                            </Button>
                                        </div>

                                        {vehicles.length === 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                No vehicle added
                                            </p>
                                        )}

                                        {vehicles.map((v, vIndex) => (
                                            <div
                                                key={vIndex}
                                                className="rounded-[3px] border bg-card p-4 space-y-4"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <p className="font-medium">
                                                        Vehicle {vIndex + 1}
                                                    </p>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        onClick={() => removeVehicle(vIndex)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>

                                                <div className="grid sm:grid-cols-4 gap-4">
                                                    <div>
                                                        <Label>Vehicle Type</Label>
                                                        <NativeSelect
                                                            className="w-full h-10 rounded-[3px] border px-3 text-sm"
                                                            value={v.vehicle_type}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    vehicle_type: e.target.value as any,
                                                                })
                                                            }
                                                        >
                                                            <option value="CAR">Car</option>
                                                            <option value="BIKE">Bike</option>
                                                            <option value="OTHER">Other</option>
                                                        </NativeSelect>
                                                    </div>

                                                    <div>
                                                        <Label>Vehicle Name</Label>
                                                        <Input
                                                            value={v.vehicle_name ?? ""}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    vehicle_name: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label>Vehicle Number</Label>
                                                        <Input
                                                            value={v.vehicle_number ?? ""}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    vehicle_number: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label>Room No</Label>
                                                        <Input
                                                            value={v.room_no ?? ""}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    room_no: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </section>
            </main>

            <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ID Proof</DialogTitle>
                    </DialogHeader>
                    {previewId && (
                        <img
                            src={previewId}
                            className="rounded-lg"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

