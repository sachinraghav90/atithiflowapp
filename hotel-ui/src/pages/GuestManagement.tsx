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
import { PlusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const { state } = useLocation() as { state: { bookingId?: string; guestCount?: number } };
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

        const existing: GuestForm[] = data.guests.map((g: GuestForm) => ({
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

            <main className={`${collapsed ? "lg:ml-16" : "lg:ml-56"} flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto app-scrollbar`}>
                <section className="p-6 lg:p-8 space-y-6">
                    <div className="flex justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Guests</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage booking guests
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 text-primary hover:underline text-sm font-medium transition-colors"
                                onClick={addGuest}
                            >
                                <PlusCircle className="w-4 h-4" /> Add New Guest(s)
                            </button>

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
                                className="rounded-[5px] border border-border bg-card p-4 space-y-4 shadow-sm"
                            >
                                <div className="flex justify-between items-center border-b border-border/50 pb-3">
                                    <p className="text-sm font-semibold text-primary/90">
                                        Guest {index + 1} Profile
                                    </p>

                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
                                        disabled={index === 0}
                                        onClick={() =>
                                            removeGuest(index)
                                        }
                                    >
                                        Remove Guest
                                    </Button>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-foreground">First Name *</Label>
                                        <Input
                                            className="h-9"
                                            value={g.first_name}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    first_name:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-foreground">Middle Name</Label>
                                        <Input
                                            className="h-9"
                                            value={g.middle_name ?? ""}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    middle_name:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-foreground">Last Name</Label>
                                        <Input
                                            className="h-9"
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
                                    <div className="space-y-1">
                                        <Label className="text-foreground">Phone Number</Label>
                                        <Input
                                            className="h-9"
                                            placeholder="Enter mobile number"
                                            value={g.phone ?? ""}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    phone: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-foreground">Email Address</Label>
                                        <Input
                                            className="h-9"
                                            placeholder="Enter email"
                                            value={g.email ?? ""}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    email: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-foreground">ID Proof Photo</Label>
                                        <div className="relative group">
                                            <Input
                                                className={cn(
                                                    "h-9 py-1 px-2 text-xs pr-10",
                                                    !idProofFiles[key] && "file:text-muted-foreground"
                                                )}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                    handleFile(
                                                        key,
                                                        e.target.files?.[0]
                                                    )
                                                }
                                            />
                                            {idProofFiles[key] && (
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-destructive transition-colors"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIdProofFiles((p) => {
                                                            const copy = { ...p };
                                                            delete copy[key];
                                                            return copy;
                                                        });
                                                        const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                                                        if (input) input.value = "";
                                                    }}
                                                >
                                                    <XCircle className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {g.has_id_proof && g.id && (
                                    <div className="pt-2">
                                        <Button
                                            size="sm"
                                            variant="heroOutline"
                                            className="h-8 text-xs"
                                            onClick={() =>
                                                setPreviewId(
                                                    `${import.meta.env.VITE_API_URL
                                                    }/guests/${g.id}/id-proof`
                                                )
                                            }
                                        >
                                            View ID Proof
                                        </Button>
                                    </div>
                                )}

                                {index === 0 && (
                                    <div className="mt-6 rounded-[5px] border border-border bg-muted/20 p-4 space-y-4">
                                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                            <p className="text-sm font-semibold text-primary/90">Vehicle Details</p>

                                            <button
                                                type="button"
                                                className="flex items-center gap-1.5 text-primary hover:underline text-xs font-bold transition-colors tracking-tight"
                                                onClick={addVehicle}
                                            >
                                                <PlusCircle className="w-4 h-4" /> Add Vehicle
                                            </button>
                                        </div>

                                        {vehicles.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic py-2">
                                                No vehicles registered for this guest
                                            </p>
                                        )}

                                        {vehicles.map((v, vIndex) => (
                                            <div
                                                key={vIndex}
                                                className="rounded-[3px] border border-border bg-card p-3 space-y-4 shadow-sm"
                                            >
                                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                                    <p className="text-[11px] font-bold text-muted-foreground">
                                                        Vehicle #{vIndex + 1}
                                                    </p>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive h-6 px-2 text-[10px] font-bold"
                                                        onClick={() => removeVehicle(vIndex)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>

                                                <div className="grid sm:grid-cols-4 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-foreground">Vehicle Type</Label>
                                                        <NativeSelect
                                                            className="w-full h-8 rounded-[3px] border px-2 text-sm"
                                                            value={v.vehicle_type}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    vehicle_type: e.target.value as "CAR" | "BIKE" | "OTHER",
                                                                })
                                                            }
                                                        >
                                                            <option value="CAR">Car</option>
                                                            <option value="BIKE">Bike</option>
                                                            <option value="OTHER">Other</option>
                                                        </NativeSelect>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-foreground">Vehicle Name</Label>
                                                        <Input
                                                            className="h-8 text-sm px-2"
                                                            value={v.vehicle_name ?? ""}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    vehicle_name: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-foreground">Vehicle Number</Label>
                                                        <Input
                                                            className="h-8 text-sm px-2"
                                                            value={v.vehicle_number ?? ""}
                                                            onChange={(e) =>
                                                                updateVehicle(vIndex, {
                                                                    vehicle_number: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-foreground">Room No</Label>
                                                        <Input
                                                            className="h-8 text-sm px-2"
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
