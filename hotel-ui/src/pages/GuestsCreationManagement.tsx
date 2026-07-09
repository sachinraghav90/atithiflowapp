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
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { parseAppDate, toISODateOnly } from "@/utils/dateFormat";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { cn } from "@/lib/utils";
import { XCircle } from "lucide-react";

/* -------------------- Types -------------------- */
type Guest = {
    salutation?: "Mr." | "Mrs." | "Ms.";
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
        salutation: "Mr.",
        first_name: "",
        last_name: "",
        phone: "",
        emergency_contact: "",
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

            <main className={`${collapsed ? "lg:ml-16" : "lg:ml-56"} flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto app-scrollbar`}>
                <section className="p-6 lg:p-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold">Guests</h1>
                        <p className="text-sm text-muted-foreground">
                            Add guests for this booking
                        </p>
                    </div>

                    {/* Shared Fields */}
                    <div className="rounded-[5px] border border-border bg-card p-4 space-y-4 mt-4">
                        <h3 className="text-sm font-semibold text-primary/90">Common Information</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormInput
                                label="Nationality"
                                field="nationality"
                                value={{ nationality: sharedNationality }}
                                setValue={(fn: any) => {
                                    const updated = fn({ nationality: sharedNationality });
                                    setSharedNationality(updated.nationality);
                                }}
                            />

                            <FormInput
                                label="Address"
                                field="address"
                                value={{ address: sharedAddress }}
                                setValue={(fn: any) => {
                                    const updated = fn({ address: sharedAddress });
                                    setSharedAddress(updated.address);
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormInput
                                label="Emergency Contact Name"
                                field="emergency_contact_name"
                                value={{ emergency_contact_name: sharedEmergencyName }}
                                setValue={(fn: any) => {
                                    const updated = fn({ emergency_contact_name: sharedEmergencyName });
                                    setSharedEmergencyName(updated.emergency_contact_name);
                                }}
                            />

                            <FormInput
                                label="Emergency Contact Number"
                                field="emergency_contact"
                                value={{ emergency_contact: sharedEmergencyPhone }}
                                setValue={(fn: any) => {
                                    const updated = fn({ emergency_contact: sharedEmergencyPhone });
                                    setSharedEmergencyPhone(updated.emergency_contact);
                                }}
                                prefixControl={
                                    <PhonePrefixSelect
                                        value={"+91"}
                                        onValueChange={() => { }}
                                    />
                                }
                                transform={(v: string) => v.replace(/\D/g, "").slice(0, 15)}
                            />
                        </div>
                    </div>

                    {/* Guests */}
                    {guests.map((guest, index) => (
                        <div
                            key={index}
                            className="rounded-[5px] border border-border bg-card p-6 space-y-4 mt-4"
                        >
                            <h3 className="text-sm font-semibold text-primary/90">Guest {index + 1}</h3>

                            {/* Names */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                {/* COMBINED SALUTATION + FIRST NAME */}
                                <div className="space-y-1">
                                    <Label className="text-foreground font-bold px-0.5">First Name *</Label>
                                    <div className="flex -space-x-px">
                                        {/* SALUTATION */}
                                        <div className="w-[64px] shrink-0">
                                            <FormSelect
                                                label=""
                                                field="salutation"
                                                value={guest}
                                                setValue={(fn: any) => {
                                                    const updated = fn(guest);
                                                    setGuests(prev => prev.map((g, i) => i === index ? updated : g));
                                                }}
                                                className="h-11 rounded-r-none border-r-0 justify-center gap-0 !px-0 !bg-background !shadow-none"
                                                hideIcon={false}
                                                isVertical={false}
                                            >
                                                <option value="Mr.">Mr.</option>
                                                <option value="Mrs.">Mrs.</option>
                                                <option value="Ms.">Ms.</option>
                                            </FormSelect>
                                        </div>

                                        {/* FIRST NAME */}
                                        <div className="flex-1">
                                            <FormInput
                                                label=""
                                                field="first_name"
                                                value={guest}
                                                setValue={(fn: any) => {
                                                    const updated = fn(guest);
                                                    updateGuest(index, { first_name: updated.first_name });
                                                }}
                                                required
                                                className="rounded-l-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <FormInput
                                    label="Middle Name"
                                    field="middle_name"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { middle_name: updated.middle_name });
                                    }}
                                />

                                <FormInput
                                    label="Last Name"
                                    field="last_name"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { last_name: updated.last_name });
                                    }}
                                    required
                                />
                            </div>

                            {/* Contact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormInput
                                    label="Phone"
                                    field="phone"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { phone: updated.phone });
                                    }}
                                    prefixControl={
                                        <PhonePrefixSelect
                                            value={"+91"}
                                            onValueChange={() => {}}
                                        />
                                    }
                                    transform={(v: string) => v.replace(/\D/g, "").slice(0, 15)}
                                />

                                <FormInput
                                    label="Email"
                                    field="email"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { email: updated.email });
                                    }}
                                />
                            </div>

                            {/* Gender & DOB */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormSelect
                                    label="Gender"
                                    field="gender"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { gender: updated.gender });
                                    }}
                                >
                                    <option value="">Select</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </FormSelect>

                                <div className="space-y-1">
                                    <Label>Date of Birth</Label>
                                    <ResponsiveDatePicker
                                        value={parseAppDate(guest.dob)}
                                        onChange={(date) =>
                                            updateGuest(index, {
                                                dob: toISODateOnly(date),
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* ID Proof */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormSelect
                                    label="ID Type"
                                    field="id_type"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { id_type: updated.id_type });
                                    }}
                                >
                                    <option value="">Select</option>
                                    <option value="AADHAAR">Aadhaar</option>
                                    <option value="PASSPORT">Passport</option>
                                </FormSelect>

                                <FormInput
                                    label="ID Number"
                                    field="id_number"
                                    value={guest}
                                    setValue={(fn: any) => {
                                        const updated = fn(guest);
                                        updateGuest(index, { id_number: updated.id_number });
                                    }}
                                />

                                <div className="space-y-1">
                                    <Label>ID Proof</Label>
                                    <div className="relative group">
                                        <Input
                                            className={cn(
                                                "h-11 bg-background pr-10",
                                                !idProofFiles[index] && "file:text-muted-foreground"
                                            )}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleIdUpload(index, e.target.files?.[0])
                                            }
                                        />
                                        {idProofFiles[index] && (
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-destructive transition-colors"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIdProofFiles((prev) => {
                                                        const copy = [...prev];
                                                        copy[index] = null;
                                                        return copy;
                                                    });
                                                    const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                                                    if (input) input.value = "";
                                                }}
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
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

