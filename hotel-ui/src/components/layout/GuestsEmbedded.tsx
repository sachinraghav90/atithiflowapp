import { useEffect, useState } from "react";
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
} from "@/redux/services/hmsApi";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { cn } from "@/lib/utils";
import countries from '../../utils/countries.json'
import SearchSelectPopover from "./SearchSelectPopover";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { formatAppDate, parseAppDate, toISODateOnly } from "@/utils/dateFormat";

/* ---------------- Types ---------------- */
export type GuestForm = {
    id?: string;
    temp_key?: string;

    first_name: string;
    middle_name?: string;
    last_name?: string;

    phone?: string;
    email?: string;
    country_code?: string;

    gender?: "MALE" | "FEMALE" | "OTHER";
    age?: string;

    nationality?: string;
    country?: string;
    address?: string;

    guest_type?: "ADULT" | "CHILD";

    id_type?: string;
    id_number?: string;
    has_id_proof?: boolean;

    emergency_contact?: string;
    emergency_contact_name?: string;

    visa_number?: string;
    visa_issue_date?: string;
    visa_expiry_date?: string;
    salutation?: string;
    coming_from?: string;
    going_to?: string;
};

type Props = {
    bookingId: string;
    totalGuest?: number;
    guestCount: number;
};

const parseDate = (value?: string) =>
    parseAppDate(value);

const formatDate = (date: Date | null) => {
    return toISODateOnly(date);
};


/* ---------------- Component ---------------- */
export default function GuestsEmbedded({ bookingId, guestCount, totalGuest }: Props) {
    const [guests, setGuests] = useState<GuestForm[]>([]);
    const [removedGuestIds, setRemovedGuestIds] = useState<string[]>([]);
    const [idProofFiles, setIdProofFiles] = useState<Record<string, File>>({});
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [originalGuests, setOriginalGuests] = useState<GuestForm[]>([]);
    const [errors, setErrors] = useState<Record<number, any>>({});
    const [remainingGuests, setRemainingGuests] = useState(0)
    const maxGuests = totalGuest ?? guestCount;

    const { data } = useGetGuestsByBookingQuery(
        { booking_id: bookingId },
        { skip: !bookingId }
    );

    const [upsertGuests, { isLoading }] =
        useAddGuestsByBookingMutation();

    /* -------- Init -------- */
    useEffect(() => {
        if (!data?.guests) return;

        const existing: GuestForm[] = data.guests.map((g: any) => ({ ...g }));

        const remaining = guestCount - existing.length;

        const remainingGuestsNum = maxGuests - data?.guests?.length

        const emptyGuests: GuestForm[] = Array.from(
            { length: Math.max(0, remaining) },
            (_, i) => ({
                temp_key: `temp-${i}`,
                first_name: "",
                guest_type: "ADULT",
                country_code: "+91"
            })
        );

        setGuests([...existing, ...emptyGuests]);
        setRemainingGuests(remainingGuestsNum)
    }, [data, guestCount, maxGuests]);

    /* -------- Helpers -------- */
    const updateGuest = (index: number, patch: Partial<GuestForm>) => {
        setGuests((prev) =>
            prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
        );
    };

    const addGuest = () => {
        setGuests((p) => [
            ...p,
            {
                temp_key: `temp-${Date.now()}`,
                first_name: "",
                guest_type: "ADULT",
                phone: "+91",
            },
        ]);
    };


    const removeGuest = (index: number) => {
        const guest = guests[index];
        if (guest.id) {
            setRemovedGuestIds((p) => [...p, guest.id]);
        }
        setGuests((p) => p.filter((_, i) => i !== index));
    };

    const handleFile = (key: string, file?: File) => {
        if (!file) return;
        setIdProofFiles((p) => ({ ...p, [key]: file }));
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /* -------- Validation -------- */
    const validate = () => {
        const newErrors: Record<number, any> = {};

        guests.forEach((g, index) => {
            const guestErrors: any = {};

            if (!g.first_name?.trim()) {
                guestErrors.first_name = "First name is required";
            }

            if (g.phone) {
                const phoneNumber = g.phone.split(" ")[1];

                if (phoneNumber && phoneNumber.length < 10) {
                    guestErrors.phone = "Invalid phone number";
                }
            }

            if (g.email && !emailRegex.test(g.email)) {
                guestErrors.email = "Invalid Email"
            }

            if (g.nationality?.toLowerCase() === "foreigner") {
                if (!g.visa_number)
                    guestErrors.visa_number = "Visa number required";

                if (!g.visa_issue_date)
                    guestErrors.visa_issue_date = "Issue date required";

                if (!g.visa_expiry_date)
                    guestErrors.visa_expiry_date = "Expiry date required";
            }

            if (Object.keys(guestErrors).length > 0) {
                newErrors[index] = guestErrors;
            }
        });

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    /* -------- Save -------- */
    const handleSave = async (): Promise<boolean> => {
        if (!validate()) return false;

        const adultCount = guests.filter(
            (g) => g.guest_type === "ADULT"
        ).length;

        const formData = new FormData();

        formData.append("guests", JSON.stringify(guests));
        formData.append(
            "removed_guest_ids",
            JSON.stringify(removedGuestIds)
        );

        /* booking.adult update */
        // formData.append("update_adult", "true");
        formData.append("adult", String(adultCount));

        /* ID proofs */
        const idProofMap: Record<string, number> = {};
        let i = 0;

        Object.entries(idProofFiles).forEach(([key, file]) => {
            formData.append("id_proofs", file);
            idProofMap[key] = i++;
        });

        formData.append("id_proof_map", JSON.stringify(idProofMap));

        try {
            await upsertGuests({ bookingId, formData }).unwrap();
            toast.success("Guests saved successfully");
            return true;
        } catch {
            toast.error("Failed to save guests");
            return false;
        }
    };

    const formatReadableDate = (iso: string) => {
        return formatAppDate(iso);
    };

    const downloadImage = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = "id-proof.jpg";
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    const editableGuests = isEditing
        ? isAdding
            ? guests.filter(g => !g.id)
            : guests
        : [];

    const getCountryCode = (phone?: string) => {
        const [countryCode] = phone?.trim().split(/\s+/) ?? [];

        return countryCode?.startsWith("+") ? countryCode : "+91";
    };

    const getPhoneNumber = (phone?: string) => {
        const trimmedPhone = phone?.trim();
        if (!trimmedPhone) return "";

        const [countryCode, ...numberParts] = trimmedPhone.split(/\s+/);

        return countryCode.startsWith("+") ? numberParts.join(" ") : trimmedPhone;
    };

    const getPhoneValue = (countryCode: string, phoneNumber: string) =>
        `${countryCode} ${phoneNumber}`.trim();

    const countryItems = countries.map(c => ({
        label: c,
        value: c
    }));

    /* -------- UI -------- */
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">

                <div className="flex flex-wrap gap-2">
                        {!isEditing && (
                            <Button
                                variant="heroOutline"
                                className="h-9 px-4 text-[13px] font-semibold"
                                onClick={() => {
                                    setIsEditing(true);
                                    setIsAdding(false);
                                }}
                            >
                                Update
                            </Button>
                        )}

                        <Button
                            variant="hero"
                            className="h-9 px-4 text-[13px] font-semibold"
                            onClick={() => {
                                setRemainingGuests(remainingGuests - 1);
                                setOriginalGuests(guests.filter((g) => g.id));
                                setIsEditing(true);
                                setIsAdding(true);
                                addGuest();
                            }}
                        >
                            + Add Guest
                        </Button>

                        {isEditing && (
                            <>
                                <Button
                                    variant="hero"
                                    className="h-9 px-4 text-[13px] font-semibold min-w-[120px]"
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={isLoading}
                                >
                                    Save Guests
                                </Button>
                                <Button
                                    variant="heroOutline"
                                    className="h-9 px-4 text-[13px] font-semibold min-w-[90px]"
                                    onClick={() => {
                                        setRemainingGuests(maxGuests - data?.guests?.length);
                                        setIsEditing(false);
                                        setIsAdding(false);
                                        setGuests(originalGuests);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                </div>
            </div>

            {/* Editable Form */}
            {editableGuests.map((g) => {
                const index = guests.findIndex((x) => x === g);
                const key = g.id ?? g.temp_key!;
                const currentCountryCode = getCountryCode(g.phone);

                return (
                    <div
                        key={key}
                        className="rounded-[5px] border-2 border-primary/50 bg-background p-4 space-y-4 shadow-sm"
                    >
                        {/* Guest Header */}
                        <div className="flex items-center justify-between border-b border-border/30 pb-2">
                            <p className="text-sm font-bold text-primary tracking-tight">
                                Guest {index + 1}
                            </p>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:bg-destructive/5 font-semibold px-2"
                                disabled={index === 0}
                                onClick={() => removeGuest(index)}
                            >
                                Remove
                            </Button>
                        </div>

                        {/* Form Grid */}
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                            {/* Name Section */}
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Guest Name *</Label>
                                <div className="flex gap-2">
                                    <NativeSelect
                                        className="h-9 w-20 rounded-[3px] border px-3 text-sm bg-background"
                                        value={g.salutation ?? ""}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                salutation: e.target.value as any,
                                            })
                                        }
                                    >
                                        <option value="" disabled>--</option>
                                        <option value="Mr">Mr</option>
                                        <option value="Mrs">Mrs</option>
                                        <option value="Ms">Ms</option>
                                    </NativeSelect>
                                    <Input
                                        className={`flex-1 h-9 bg-background ${errors[index]?.first_name ? "border-red-500" : ""}`}
                                        value={g.first_name}
                                        placeholder="First Name"
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                first_name: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                {errors[index]?.first_name && (
                                    <p className="text-[10px] text-red-500 mt-0.5">{errors[index].first_name}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Middle Name</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.middle_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            middle_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Last Name</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.last_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            last_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            {/* Bio Section */}
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Gender</Label>
                                <NativeSelect
                                    className="h-9 w-full rounded-[3px] border px-3 text-sm bg-background"
                                    value={g.gender ?? ""}
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
                                <Label className="text-[11px] font-semibold text-muted-foreground">Age</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.age ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            age: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Phone</Label>
                                <div className="flex gap-[2px]">
                                    <PhonePrefixSelect
                                        value={currentCountryCode}
                                        triggerClassName="h-9 px-2 text-xs"
                                        inputClassName="h-8 text-xs"
                                        itemClassName="text-xs"
                                        iconClassName="ml-1 h-3 w-3"
                                        onValueChange={(countryCode) => {
                                            const number = getPhoneNumber(g.phone);
                                            updateGuest(index, { phone: getPhoneValue(countryCode, number) });
                                        }}
                                    />
                                    <Input
                                        className={`h-9 bg-background flex-1 ${errors[index]?.phone ? "border-red-500" : ""}`}
                                        value={getPhoneNumber(g.phone)}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 10) {
                                                const number = normalizeNumberInput(e.target.value).toString();
                                                const code = getCountryCode(g.phone);
                                                updateGuest(index, { phone: getPhoneValue(code, number) });
                                            }
                                        }}
                                    />
                                </div>
                                {errors[index]?.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors[index].phone}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Email</Label>
                                <Input
                                    className={`h-9 bg-background ${errors[index]?.email ? "border-red-500" : ""}`}
                                    value={g.email ?? ""}
                                    onChange={(e) => updateGuest(index, { email: normalizeTextInput(e.target.value) })}
                                />
                                {errors[index]?.email && <p className="text-[10px] text-red-500 mt-0.5">{errors[index].email}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Nationality</Label>
                                <NativeSelect
                                    className="h-9 w-full rounded-[3px] border px-3 text-sm bg-background"
                                    value={g.nationality ?? ""}
                                    onChange={(e) => updateGuest(index, { nationality: e.target.value })}
                                >
                                    <option value="">Select nationality</option>
                                    <option value="indian">Indian</option>
                                    <option value="nri">NRI</option>
                                    <option value="foreigner">Foreigner</option>
                                </NativeSelect>
                            </div>

                            <div className="sm:col-span-1 space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Address</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.address ?? ""}
                                    onChange={(e) => updateGuest(index, { address: normalizeTextInput(e.target.value) })}
                                />
                            </div>

                            {/* ID Section */}
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">ID Type</Label>
                                <NativeSelect
                                    className="h-9 w-full rounded-[3px] border px-3 text-sm bg-background"
                                    value={g.id_type ?? ""}
                                    onChange={(e) => updateGuest(index, { id_type: e.target.value })}
                                >
                                    <option value="">-- Please Select --</option>
                                    <option value="Aadhaar">Aadhaar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Driving License">Driving License</option>
                                    <option value="Voter ID">Voter ID</option>
                                    <option value="Apaar ID">Apaar ID</option>
                                </NativeSelect>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">ID Number</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.id_number ?? ""}
                                    onChange={(e) => updateGuest(index, { id_number: normalizeTextInput(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">ID Proof</Label>
                                <Input
                                    className="h-9 bg-background px-2 py-1 text-xs"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFile(key, e.target.files?.[0])}
                                />
                            </div>

                            {/* Foreigner Specific */}
                            {g.nationality === "foreigner" && (
                                <>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">Country *</Label>
                                        <SearchSelectPopover
                                            value={g.country}
                                            placeholder="Select country"
                                            items={countryItems}
                                            onSelect={(country) =>
                                                updateGuest(index, {
                                                    country: normalizeTextInput(country),
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">Visa Number *</Label>
                                        <Input
                                            className="h-9 bg-background"
                                            value={g.visa_number ?? ""}
                                            onChange={(e) => updateGuest(index, { visa_number: normalizeTextInput(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">Visa Expiry *</Label>
                                        <ResponsiveDatePicker
                                            value={parseDate(g.visa_expiry_date)}
                                            placeholder="DD/MM/YY"
                                            onChange={(date) => updateGuest(index, { visa_expiry_date: formatDate(date) })}
                                            className="h-9 bg-background"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Additional Info */}
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Coming From</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.coming_from ?? ""}
                                    onChange={(e) => updateGuest(index, { coming_from: normalizeTextInput(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Going To</Label>
                                <Input
                                    className="h-9 bg-background"
                                    value={g.going_to ?? ""}
                                    onChange={(e) => updateGuest(index, { going_to: normalizeTextInput(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">Emergency Contact</Label>
                                <div className="flex gap-[2px]">
                                    <PhonePrefixSelect
                                        value={getCountryCode(g.emergency_contact)}
                                        triggerClassName="h-9 px-2 text-xs"
                                        inputClassName="h-8 text-xs"
                                        itemClassName="text-xs"
                                        iconClassName="ml-1 h-3 w-3"
                                        onValueChange={(countryCode) => {
                                            const number = getPhoneNumber(g.emergency_contact);
                                            updateGuest(index, {
                                                emergency_contact: getPhoneValue(countryCode, number),
                                            });
                                        }}
                                    />
                                    <Input
                                        className="h-9 bg-background flex-1"
                                        value={getPhoneNumber(g.emergency_contact)}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 10) {
                                                const number = normalizeNumberInput(e.target.value).toString();
                                                const code = getCountryCode(g.emergency_contact);
                                                updateGuest(index, {
                                                    emergency_contact: getPhoneValue(code, number),
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* View ID Proof button (only if existing guest) */}
                        {g.has_id_proof && g.id && (
                            <div className="mt-2">
                                <Button
                                    size="sm"
                                    variant="heroOutline"
                                    className="h-8"
                                    onClick={() =>
                                        setPreviewId(
                                            `${import.meta.env.VITE_API_URL}/guests/${g.id}/id-proof`
                                        )
                                    }
                                >
                                    View ID Proof
                                </Button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Read-Only View */}
            {!isEditing && guests.map((g, i) => {
                return (
                    <div
                        className="overflow-hidden rounded-[5px] border border-primary/30 bg-background shadow-sm mb-4 last:mb-0"
                        key={i}
                    >
                        {/* Name Header */}
                        <div className="flex items-center justify-between border-b border-border/50 bg-primary/5 px-5 py-3">
                            <h3 className="text-sm font-bold text-foreground tracking-tight">
                                {g.salutation} {g.first_name} {g.middle_name} {g.last_name}
                            </h3>

                            {g.has_id_proof && g.id && (
                                <Button
                                    size="sm"
                                    variant="heroOutline"
                                    className="h-7 rounded-[4px] px-3 text-[11px] font-semibold"
                                    onClick={() =>
                                        setPreviewId(
                                            `${import.meta.env.VITE_API_URL}/guests/${g.id}/id-proof`
                                        )
                                    }
                                >
                                    View ID Proof
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
                            {/* Left Side: Guest Details */}
                            <div className="px-5 py-3">
                                <p className="mb-3 text-[12px] font-bold text-primary">
                                    Guest Details
                                </p>

                                <div className="grid grid-cols-1 gap-x-12 gap-y-0.5 sm:grid-cols-2">
                                    <InfoRow label="Phone" value={g?.phone} />
                                    <InfoRow label="Email" value={g.email} />
                                    <InfoRow label="Gender" value={g.gender} />
                                    <InfoRow label="Age" value={g.age} />
                                    <InfoRow label="Nationality" value={g.nationality} />
                                    <InfoRow label="ID Type" value={g.id_type} />
                                    <InfoRow label="From" value={g.coming_from} />
                                    <InfoRow label="To" value={g.going_to} />
                                    <InfoRow label="ID Number" value={g.id_number} />

                                    <div className="sm:col-span-2 border-t border-border/30 mt-2 pt-1.5">
                                        <InfoRow label="Address" value={g.address} className="items-start" />
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Emergency Contact & Others */}
                            <div className="px-5 py-3 border-t lg:border-t-0 lg:border-l border-border/50 bg-accent/5">
                                <div className="space-y-6">
                                    {/* Emergency Contact */}
                                    <div>
                                        <p className="mb-3 text-[12px] font-bold text-primary">
                                            Emergency Contact
                                        </p>
                                        <div className="space-y-0.5">
                                            <InfoRow
                                                label="Name"
                                                value={g.emergency_contact_name || "—"}
                                            />
                                            <InfoRow
                                                label="Phone"
                                                value={g.emergency_contact || "—"}
                                            />
                                        </div>
                                    </div>

                                    {/* Visa Details */}
                                    {g.nationality?.toLowerCase() === "foreigner" && (
                                        <div className="pt-3 border-t border-border/30">
                                            <p className="mb-3 text-[12px] font-bold text-primary">Visa Details</p>
                                            <div className="space-y-0.5">
                                                <InfoRow label="Visa No" value={g.visa_number} />
                                                <InfoRow label="Issue" value={formatReadableDate(g.visa_issue_date)} />
                                                <InfoRow label="Expiry" value={formatReadableDate(g.visa_expiry_date)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {guests.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No guests added
                </p>
            )}

            {/* ID Preview */}
            <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
                <DialogContent className="max-w-lg [&>button.absolute]:hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>ID Proof</span>

                            {previewId && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadImage(previewId)}
                                >
                                    Download
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {previewId && (
                        <div className="flex justify-center">
                            <img
                                src={previewId}
                                className="rounded-lg max-h-[70vh] object-contain"
                                alt="ID Proof"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Save</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to save guest details?
                    </p>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            onClick={async () => {
                                setConfirmOpen(false);

                                const success = await handleSave();

                                if (success) {
                                    setIsEditing(false);
                                    setIsAdding(false);
                                }
                            }}
                            disabled={isLoading}
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

function InfoRow({
    label,
    value,
    className,
}: {
    label: string;
    value?: string | null;
    className?: string;
}) {
    if (!value) return null;

    return (
        <div className={cn("flex items-baseline gap-10 py-0", className)}>
            <dt className="text-[11px] font-semibold text-muted-foreground w-20 shrink-0 leading-5">{label}</dt>
            <dd className="text-[13px] font-medium text-foreground break-all leading-5">{value}</dd>
        </div>
    );
}
