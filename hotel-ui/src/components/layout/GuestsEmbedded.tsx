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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { BookType, Check, ChevronDown } from "lucide-react";
import COUNTRY_CODES from '../../utils/countryCode.json'
import { cn } from "@/lib/utils";
import countries from '../../utils/countries.json'
import SearchSelectPopover from "./SearchSelectPopover";
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
    const [openCountry, setOpenCountry] = useState(false);
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

    const getCountryCode = (phone?: string) =>
        phone?.split(" ")[0] || "+91";

    const getPhoneNumber = (phone?: string) =>
        phone?.split(" ")[1] || "";

    const countryCodeItems = COUNTRY_CODES.map(c => ({
        label: `${c.country_name_code} (${c.country_code})`,
        value: c.country_code
    }));

    const countryItems = countries.map(c => ({
        label: c,
        value: c
    }));

    /* -------- UI -------- */
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>

                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                    <div className="flex flex-wrap gap-2">
                        {!isEditing && <Button
                            variant="heroOutline"
                           
                            onClick={() => {
                                // setOriginalGuests(JSON.parse(JSON.stringify(guests)));
                                setIsEditing(true);
                                setIsAdding(false);
                            }}
                        >
                            Update
                        </Button>}

                        <Button
                            variant="heroOutline"
                         
                            disabled={!remainingGuests || remainingGuests < 0}
                            onClick={() => {
                                setRemainingGuests(remainingGuests - 1)
                                setOriginalGuests(
                                    guests.filter(g => g.id)
                                );

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
                                    className="min-w-[132px]"
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={isLoading}
                                >
                                    Save Guests
                                </Button>
                                <Button
                                    variant="hero"
                                    className="min-w-[92px]"
                                    onClick={() => {
                                        setRemainingGuests(maxGuests - data?.guests?.length)
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
            </div>

            {editableGuests.map((g) => {
                const index = guests.findIndex(x => x === g);
                const key = g.id ?? g.temp_key!;

                return (
                    <div
                        key={key}
                        className="rounded-[5px] border border-border bg-background p-6 space-y-4 shadow-sm"
                    >
                        <div className="flex justify-between">
                            <p className="font-medium">
                                Guest {index + 1}
                            </p>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={index === 0}
                                onClick={() => removeGuest(index)}
                            >
                                Remove
                            </Button>
                        </div>

                        {/* Names */}
                        <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">

                            {/* SALUTATION */}
                            <div className="space-y-1">

                                {/* SINGLE LABEL */}
                                <Label>Guest Name *</Label>

                                <div className="flex gap-2">

                                    {/* SALUTATION (small width) */}
                                    <NativeSelect
                                        disabled={!isEditing}
                                        tabIndex={isEditing ? 0 : -1}
                                        className="h-10 w-20 rounded-[3px] border px-3 text-sm bg-background"
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

                                    {/* FIRST NAME (remaining width) */}
                                    <Input
                                        className={`
                                                flex-1
                                                ${!isEditing ? "pointer-events-none select-none" : "bg-background"}
                                                ${errors[index]?.first_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            `}
                                        readOnly={!isEditing}
                                        tabIndex={isEditing ? 0 : -1}
                                        value={g.first_name}
                                        onChange={(e) =>
                                            updateGuest(index, {
                                                first_name: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />

                                </div>

                                {/* INLINE ERROR */}
                                {errors[index]?.first_name && (
                                    <p className="text-xs text-red-500">
                                        {errors[index].first_name}
                                    </p>
                                )}

                            </div>


                            <div className="space-y-1">
                                <Label>Middle Name</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className={!isEditing ? "pointer-events-none select-none" : "bg-background"}
                                    value={g.middle_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            middle_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Last Name</Label>
                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className={!isEditing ? "pointer-events-none select-none" : "bg-background"}
                                    value={g.last_name ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            last_name: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Gender</Label>
                                <NativeSelect
                                    disabled={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className="h-10 w-full rounded-[3px] border px-3 text-sm bg-background"
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
                                <Label>Age</Label>

                                <Input
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    className={!isEditing ? "pointer-events-none select-none" : "bg-background"}
                                    value={g.age ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            age: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Phone</Label>
                                <div className="flex gap-[2px]">

                                    {/* Country Code */}
                                    <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-[4rem] bg-background"
                                            >
                                                {getCountryCode(g.phone)}
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>

                                        <PopoverContent className="w-56 p-0">
                                            <Command>
                                                <CommandInput placeholder="Search country..." />
                                                <CommandEmpty>No country found</CommandEmpty>

                                                <CommandGroup
                                                    className="max-h-60 overflow-y-auto"
                                                    onWheel={(e) => e.stopPropagation()}
                                                >
                                                    {COUNTRY_CODES.map((c) => (
                                                        <CommandItem
                                                            key={c.country_code}
                                                            value={`${c.country_name_code} ${c.country_code}`}
                                                            onSelect={() => {

                                                                const number = getPhoneNumber(g.phone);

                                                                updateGuest(index, {
                                                                    phone: `${c.country_code} ${number}`.trim(),
                                                                });

                                                                // ✅ CLOSE popover
                                                                setOpenCountry(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4 opacity-0" />
                                                            {c.country_name_code} ({c.country_code})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <Input
                                        className={`
                                            ${!isEditing ? "pointer-events-none select-none" : "bg-background"}
                                            ${errors[index]?.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        `}
                                        readOnly={!isEditing}
                                        tabIndex={isEditing ? 0 : -1}
                                        value={getPhoneNumber(g.phone)}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 10) {
                                                const number = normalizeNumberInput(e.target.value).toString();
                                                const code = getCountryCode(g.phone);

                                                updateGuest(index, {
                                                    phone: `${code} ${number}`.trim(),
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                {errors[index]?.phone && (
                                    <p className="text-xs text-red-500">
                                        {errors[index].phone}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input
                                    className={`
                                            ${!isEditing ? "pointer-events-none select-none" : "bg-background"}
                                            ${errors[index]?.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        `}
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.email ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            email: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                                {errors[index]?.email && (
                                    <p className="text-xs text-red-500">
                                        {errors[index].email}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Label>Nationality</Label>
                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] bg-background border border-border px-3 text-sm"
                                    value={g.nationality ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            nationality: normalizeTextInput(e.target.value),
                                            // country: normalizeTextInput(e.target.value)
                                        })
                                    }
                                >
                                    <option value="">Select nationality</option>
                                    <option value="indian">Indian</option>
                                    <option value="nri">NRI</option>
                                    <option value="foreigner">Foreigner</option>
                                </NativeSelect>
                            </div>

                            {g.nationality === "foreigner" && (

                                <div className="space-y-2">

                                    <Label>Country*</Label>

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
                            )}


                            <div className="space-y-1">
                                <Label>Address</Label>
                                <Input
                                    className="bg-background"
                                    readOnly={!isEditing}
                                    value={g.address ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            address: normalizeTextInput(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>ID Type</Label>
                                {/* <Input
                                    className="bg-background"
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.id_type ?? ""}
                                    onChange={(e) =>
                                        updateGuest(index, {
                                            id_type: normalizeTextInput(e.target.value),
                                        })
                                    }
                                /> */}

                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={g.id_type ?? ""}
                                    onChange={(e) => {
                                        updateGuest(index, {
                                            id_type: normalizeTextInput(e.target.value),
                                        })
                                    }}
                                >
                                    <option value="">-- Please Select --</option>
                                    <option value="Aadhaar">Aadhaar</option>
                                    <option value="Aadhaar">Aadhaar</option>
                                    <option value="PAN">PAN</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Driving License">Driving License</option>
                                    <option value="Voter ID">Voter ID</option>
                                    <option value="Apaar ID">Apaar ID</option>
                                    <option value="Passport ID">Passport ID</option>
                                    {/* <option value="Other">Other</option> */}
                                </NativeSelect>
                            </div>

                            <div className="space-y-1">
                                <Label>ID Number</Label>
                                <Input
                                    className="bg-background"
                                    readOnly={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    value={g.id_number ?? ""}
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
                                    className="bg-background"
                                    type="file"
                                    accept="image/*"
                                    disabled={!isEditing}
                                    tabIndex={isEditing ? 0 : -1}
                                    onChange={(e) =>
                                        handleFile(key, e.target.files?.[0])
                                    }
                                />
                            </div>

                            {g.nationality?.toLowerCase() === "foreigner" && (
                                <>
                                    <div className="space-y-1">
                                        <Label>Visa Number *</Label>
                                        <Input
                                            className="bg-background"
                                            readOnly={!isEditing}
                                            value={g.visa_number ?? ""}
                                            onChange={(e) =>
                                                updateGuest(index, {
                                                    visa_number: normalizeTextInput(e.target.value),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Issue Date *</Label>
                                        <ResponsiveDatePicker
                                            value={parseDate(g.visa_issue_date)}
                                            placeholder="DD/MM/YY"
                                            onChange={(date) =>
                                                updateGuest(index, {
                                                    visa_issue_date: formatDate(date),
                                                })
                                            }
                                            label="Visa Issue Date"
                                            disabled={!isEditing}
                                            className="bg-background"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Expiry Date *</Label>
                                        <ResponsiveDatePicker
                                            value={parseDate(g.visa_expiry_date)}
                                            placeholder="DD/MM/YY"
                                            onChange={(date) =>
                                                updateGuest(index, {
                                                    visa_expiry_date: formatDate(date),
                                                })
                                            }
                                            label="Visa Expiry Date"
                                            disabled={!isEditing}
                                            className="bg-background"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {g.has_id_proof && g.id && (
                            <Button
                                size="sm"
                                variant="heroOutline"
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
                );
            })}



            {guests.map((g, i) => {
                return !isEditing && (
                    <div
                        className="overflow-hidden rounded-[5px] border border-border bg-background shadow-sm"
                        key={i}
                    >
                        {/* Name */}
                        <div className="flex flex-col gap-4 p-6 pb-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-foreground">
                                    {g.salutation} {g.first_name} {g.middle_name} {g.last_name}
                                </p>
                            </div>

                            {g.gender && (
                                <span className="text-xs px-2 py-0.5 rounded bg-secondary">
                                    {g.gender}
                                </span>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid gap-x-8 gap-y-7 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
                            <InfoRow label="Phone" value={g?.phone?.split(" ")[1] && g.phone} />
                            <InfoRow label="Email" value={g.email} />
                            <InfoRow label="Age" value={g.age} />
                            <InfoRow label="Nationality" value={g.nationality} />
                            <InfoRow label="Address" value={g.address} />
                            <InfoRow label="Coming From" value={g.coming_from} />
                            <InfoRow label="Going To" value={g.going_to} />
                            <InfoRow label="ID Type" value={g.id_type} />
                            <InfoRow label="ID Number" value={g.id_number} />

                            {g.has_id_proof && g.id && (
                                <div className="flex items-end">
                                    <Button
                                        size="sm"
                                        variant="heroOutline"
                                        className="w-fit"
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

                        {/* Emergency */}
                        {(g.emergency_contact || g.emergency_contact_name) && (
                            <div className="border-t border-border px-6 py-5">
                                <p className="mb-2 text-sm font-medium text-foreground">
                                    Emergency Contact
                                </p>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <InfoRow
                                        label="Name"
                                        value={g.emergency_contact_name}
                                    />
                                    <InfoRow
                                        label="Phone"
                                        value={g.emergency_contact}
                                    />
                                </div>
                            </div>
                        )}

                        {g.nationality?.toLowerCase() === "foreigner" && (
                            <div className="border-t border-border px-6 py-5">
                                <p className="mb-2 text-sm font-medium text-foreground">Visa Details</p>

                                <div className="grid gap-6 sm:grid-cols-3">
                                    <InfoRow label="Visa Number" value={g.visa_number} />
                                    <InfoRow label="Issue Date" value={formatReadableDate(g.visa_issue_date)} />
                                    <InfoRow label="Expiry Date" value={formatReadableDate(g.visa_expiry_date)} />
                                </div>
                            </div>
                        )}

                    </div>
                )
            }
            )}

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
}: {
    label: string;
    value?: string | null;
}) {
    if (!value) return null;

    return (
        <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">
                {value}
            </p>
        </div>
    );
}
