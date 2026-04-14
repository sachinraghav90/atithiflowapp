import { useEffect, useLayoutEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/hook";
import { useAddGuestsByBookingMutation } from "@/redux/services/hmsApi";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { NativeSelect } from "@/components/ui/native-select";

/* -------------------- Types -------------------- */
type Guest = {
    salutation?: "Mr" | "Mrs" | "Ms";
    first_name: string;
    middle_name?: string;
    last_name: string;

    gender?: "MALE" | "FEMALE" | "OTHER";
    dob?: string;

    have_vehicle?: boolean;
    address?: string;

    phone?: string;
    email?: string;

    guest_type: "ADULT" | "CHILD";
    nationality?: string;

    id_type?: string;
    id_number?: string;

    emergency_contact?: string;
    emergency_contact_name?: string;
};

/* -------------------- Helpers -------------------- */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function createEmptyGuest(type: "ADULT" | "CHILD"): Guest {
    return {
        guest_type: type,
        first_name: "",
        last_name: "",
    };
}

/* -------------------- Component -------------------- */
export default function GuestsCreationManagement() {
    const [guestCount, setGuestCount] = useState(0)
    const [bookingId, setBookingId] = useState("")
    const [guests, setGuests] = useState<Guest[]>([createEmptyGuest("ADULT")]);
    const [idProofFiles, setIdProofFiles] = useState<(File | null)[]>([]);
    const [collapsed, setCollapsed] = useState(false);

    /* Shared fields */
    const [sharedAddress, setSharedAddress] = useState("");
    const [sharedNationality, setSharedNationality] = useState("");
    const [sharedEmergencyName, setSharedEmergencyName] = useState("");
    const [sharedEmergencyPhone, setSharedEmergencyPhone] = useState("");

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const [addGuestsByBooking] = useAddGuestsByBookingMutation()

    const navigate = useNavigate()
    const state = useLocation().state

    useEffect(() => {
        if (!state) {
            navigate("/packages")
            return
        }
        const { bookingId, guestCount } = state
        if (!bookingId || !guestCount) {
            navigate("/packages")
            return
        }
        console.log("🚀 ~ GuestsCreationManagement ~ bookingId:", bookingId)
        console.log("🚀 ~ GuestsCreationManagement ~ guestCount:", guestCount)
        setGuestCount(guestCount)
        setBookingId(bookingId)
    }, [bookingId, guestCount])

    useEffect(() => {
        setGuests((prev) => {
            const updated = [...prev];
            if (guestCount > updated.length) {
                for (let i = updated.length; i < guestCount; i++) {
                    updated.push(createEmptyGuest("ADULT"));
                }
            } else {
                updated.length = guestCount || 0;
            }
            return updated;
        });
    }, [guestCount]);

    useEffect(() => {
        setIdProofFiles((prev) => {
            const updated = [...prev];
            updated.length = guests.length;
            return updated.fill(null, prev.length);
        });
    }, [guests.length]);

    function updateGuest(index: number, changes: Partial<Guest>) {
        setGuests((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...changes };
            return copy;
        });
    }

    function handleIdUpload(index: number, file?: File) {
        if (!file) return;

        setIdProofFiles((prev) => {
            const copy = [...prev];
            copy[index] = file;
            return copy;
        });
    }

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    function validate(): boolean {
        if (guests.some((g) => !g.first_name || !g.last_name)) {
            toast.error("First & Last name are required for all guests");
            return false;
        }

        if (guests.some(g => (g.phone.length > 10 || g.emergency_contact.length > 10))) {
            toast.error("mobile number length should not be more than 10")
            return false
        }

        if (guests.some(g => !validateEmail(g.email))) {
            toast.error("one or more incorrect emails")
            return false
        }

        const hasAnyIdProof = guests.some(
            (_, index) =>
                guests[index].id_type &&
                guests[index].id_number &&
                idProofFiles[index]
        );

        if (!hasAnyIdProof) {
            toast.error("At least one guest must have ID proof");
            return false;
        }

        return true;
    }

    async function handleSubmit() {
        if (!validate()) return;

        const finalGuests = guests.map((g) => ({
            ...g,
            address: g.address ?? sharedAddress,
            nationality: g.nationality ?? sharedNationality,
            emergency_contact: g.emergency_contact ?? sharedEmergencyPhone,
            emergency_contact_name: g.emergency_contact_name ?? sharedEmergencyName,
        }));

        const formData = new FormData();

        // 1️⃣ Guests JSON
        formData.append("guests", JSON.stringify(finalGuests));

        // 2️⃣ ID proofs (index-based)
        idProofFiles.forEach((file) => {
            if (file) {
                formData.append("id_proofs", file);
            }
        });

        const promise = addGuestsByBooking({
            bookingId,
            formData
        }).unwrap();

        await toast.promise(promise, {
            pending: "Creating guests...",
            success: "Guests created successfully",
            error: "Error creating guests",
        });
        navigate("/bookings")
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            <main className={`${collapsed ? "lg:ml-16" : "lg:ml-56"} flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden`}>
                <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold">Guests</h1>
                        <p className="text-sm text-muted-foreground">
                            Add guests for this booking
                        </p>
                    </div>

                    {/* Shared Fields */}
                    <div className="rounded-[5px] border border-border bg-card p-4 space-y-4 mt-4">
                        <p className="font-medium">Common Information</p>

                        <div className="space-y-1">
                            <Label>Nationality</Label>
                            <Input
                                value={sharedNationality}
                                onChange={(e) => setSharedNationality(normalizeTextInput(e.target.value))}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Address</Label>
                            <textarea
                                className="w-full min-h-[80px] rounded-[3px] border px-3 py-2 text-sm"
                                value={sharedAddress}
                                onChange={(e) => setSharedAddress(normalizeTextInput(e.target.value))}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Emergency Contact Name</Label>
                                <Input
                                    value={sharedEmergencyName}
                                    onChange={(e) => setSharedEmergencyName(normalizeTextInput(e.target.value))}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Emergency Contact Number</Label>
                                <Input
                                    value={sharedEmergencyPhone}
                                    onChange={(e) => setSharedEmergencyPhone(normalizeTextInput(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guests */}
                    {guests.map((guest, index) => (
                        <div
                            key={index}
                            className="rounded-[5px] border border-border bg-card p-6 space-y-4 mt-4"
                        >
                            <p className="font-semibold">Guest {index + 1}</p>

                            {/* Names */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label>Salutation</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={guest.salutation ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                salutation: e.target.value as any,
                                            })
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="Mr">Mr</option>
                                        <option value="Mrs">Mrs</option>
                                        <option value="Ms">Ms</option>
                                    </NativeSelect>
                                </div>

                                <div className="space-y-1">
                                    <Label>First Name *</Label>
                                    <Input
                                        value={guest.first_name}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                first_name: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>Middle Name</Label>
                                    <Input
                                        value={guest.middle_name ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                middle_name: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>Last Name *</Label>
                                    <Input
                                        value={guest.last_name}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                last_name: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Phone</Label>
                                    <Input
                                        value={guest.phone ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                phone: normalizeNumberInput(e.target.value).toString(),
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input
                                        value={guest.email ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                email: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Gender & DOB */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Gender</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={guest.gender ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                gender: e.target.value as any,
                                            })
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </NativeSelect>
                                </div>

                                <div className="space-y-1">
                                    <Label>Date of Birth</Label>
                                    <Input
                                        type="date"
                                        value={guest.dob ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                dob: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* ID Proof */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label>ID Type</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={guest.id_type ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                id_type: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="AADHAAR">Aadhaar</option>
                                        <option value="PASSPORT">Passport</option>
                                    </NativeSelect>
                                </div>

                                <div className="space-y-1">
                                    <Label>ID Number</Label>
                                    <Input
                                        value={guest.id_number ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                id_number: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>ID Proof</Label>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handleIdUpload(index, e.target.files?.[0])
                                        }
                                    />
                                </div>
                            </div>

                            {/* Vehicle */}
                            <div className="flex items-center gap-2 pt-1">
                                <Switch
                                    checked={guest.have_vehicle ?? false}
                                    onCheckedChange={(v) =>
                                        updateGuest(index, {
                                            have_vehicle: v,
                                        })
                                    }
                                />
                                <Label>Has Vehicle</Label>
                            </div>
                        </div>
                    ))}

                    {/* Submit */}
                    <div className="flex justify-end mt-4">
                        <Button variant="hero" onClick={handleSubmit}>
                            Save Guests
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    );
}

