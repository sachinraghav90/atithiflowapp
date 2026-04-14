import FormInput from "@/components/forms/FormInput";
import { Label } from "@/components/ui/label";
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
import COUNTRY_CODES from '../../../utils/countryCode.json'
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { useState } from "react";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
    mode: "add" | "edit" | "view";
};

export default function ContactLogin({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
    mode,
}: Props) {

    const [countryCodeModal, setCountryCodeModal] = useState({
        1: false,
        2: false
    })

    /* ================= CONFIRM PASSWORD LOGIC ================= */

    const handleConfirmPassword = (val: string) => {

        setValue((prev: any) => ({
            ...prev,
            confirm_password: val,
        }));

        // UI validation only
        if (value.password && val !== value.password) {
            setErrors((p: any) => ({
                ...p,
                confirm_password: {
                    type: "invalid",
                    message: "Passwords do not match",
                },
            }));
        } else {
            setErrors((p: any) => ({
                ...p,
                confirm_password: "",
            }));
        }
    };

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-card">

            <h3 className="font-semibold text-base">
                Contact & Login
            </h3>

            {/* ================= EMAIL + PHONE ================= */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                <FormInput
                    label="Email"
                    field="email"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                    maxLength={150}
                />

                {/* ================= PHONE ================= */}

                <div className="space-y-2">

                    <Label className="font-bold">
                        Phone *
                    </Label>

                    {(() => {

                        const error = errors?.phone1;

                        const raw = value.phone1 || "";

                        let countryCode = "+91";
                        let phone = "";

                        if (raw.startsWith("+")) {
                            const match = raw.match(/^(\+\d+)\s?(.*)$/);
                            countryCode = match?.[1] || "";
                            phone = match?.[2] || "";
                        } else {
                            phone = raw;
                        }

                        const updatePhone = (code: string, ph: string) => {

                            setValue((prev: any) => ({
                                ...prev,
                                phone1: `${code} ${ph}`.trim(),
                            }));

                            setErrors((prev: any) => {
                                const next = { ...prev };
                                delete next.phone1;
                                return next;
                            });
                        };

                        return (

                            <div className="flex gap-[2px]">

                                {/* ===== COUNTRY CODE ===== */}

                                <Popover open={countryCodeModal[1]} onOpenChange={(open) =>
                                    setCountryCodeModal(prev => ({ ...prev, 1: open }))
                                }
                                >

                                    <PopoverTrigger asChild>

                                        <Button
                                            variant="outline"
                                            disabled={viewMode}
                                            className={cn(
                                                "h-10 bg-white justify-between rounded-r-none w-[85px]",
                                                error && "border-red-500"
                                            )}
                                        >
                                            {countryCode || "Code"}
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>

                                    </PopoverTrigger>

                                    <PopoverContent className="w-[220px] p-0">

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

                                                            updatePhone(
                                                                c.country_code,
                                                                phone
                                                            );
                                                            setCountryCodeModal(prev => ({ ...prev, 1: !prev[1] }))
                                                        }}
                                                    >
                                                        {c.country_name_code} ({c.country_code})
                                                    </CommandItem>

                                                ))}

                                            </CommandGroup>

                                        </Command>

                                    </PopoverContent>

                                </Popover>

                                {/* ===== PHONE INPUT ===== */}

                                <Input
                                    disabled={viewMode}
                                    value={phone}
                                    title={error?.type === "required" ? error.message : ""}
                                    maxLength={15}
                                    className={cn(
                                        "h-10 rounded-l-none bg-white",
                                        error && "border-red-500"
                                    )}
                                    onChange={(e) => {

                                        let v = normalizeTextInput(e.target.value);

                                        updatePhone(countryCode, v);
                                    }}
                                />

                            </div>

                        );

                    })()}

                    {/* inline invalid error like FormInput */}

                    {errors?.phone1?.type === "invalid" && (
                        <p className="text-xs text-red-500">
                            {errors.phone1.message}
                        </p>
                    )}

                </div>


                {/* ================= ALTERNATE PHONE ================= */}

                <div className="space-y-2">

                    <Label className="font-bold">
                        Alternate Phone
                    </Label>

                    {(() => {

                        const error = errors?.phone2;

                        const raw = value.phone2 || "";

                        let countryCode = "+91";
                        let phone = "";

                        if (raw.startsWith("+")) {
                            const match = raw.match(/^(\+\d+)\s?(.*)$/);
                            countryCode = match?.[1] || "";
                            phone = match?.[2] || "";
                        } else {
                            phone = raw;
                        }

                        const updatePhone = (code: string, ph: string) => {

                            setValue((prev: any) => ({
                                ...prev,
                                phone2: `${code} ${ph}`.trim(),
                            }));

                            setErrors((prev: any) => {
                                const next = { ...prev };
                                delete next.phone2;
                                return next;
                            });
                        };

                        return (

                            <div className="flex gap-[2px]">

                                {/* ===== COUNTRY CODE ===== */}

                                <Popover
                                    open={countryCodeModal[2]}
                                    onOpenChange={(open) =>
                                        setCountryCodeModal(prev => ({ ...prev, 2: open }))
                                    }

                                >

                                    <PopoverTrigger asChild>

                                        <Button
                                            variant="outline"
                                            disabled={viewMode}
                                            className={cn(
                                                "h-10 bg-white justify-between rounded-r-none w-[85px]",
                                                error && "border-red-500"
                                            )}
                                        >
                                            {countryCode || "Code"}
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>

                                    </PopoverTrigger>

                                    <PopoverContent className="w-[220px] p-0">

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

                                                            updatePhone(
                                                                c.country_code,
                                                                phone
                                                            );

                                                            setCountryCodeModal(prev => ({
                                                                ...prev,
                                                                2: false
                                                            }));
                                                        }}
                                                    >
                                                        {c.country_name_code} ({c.country_code})
                                                    </CommandItem>

                                                ))}

                                            </CommandGroup>

                                        </Command>

                                    </PopoverContent>

                                </Popover>

                                {/* ===== PHONE INPUT ===== */}

                                <Input
                                    disabled={viewMode}
                                    value={phone}
                                    title={error?.type === "required" ? error.message : ""}
                                    maxLength={15}
                                    className={cn(
                                        "h-10 rounded-l-none bg-white",
                                        error && "border-red-500"
                                    )}
                                    onChange={(e) => {

                                        let v = normalizeTextInput(e.target.value);

                                        updatePhone(countryCode, v);
                                    }}
                                />

                            </div>

                        );

                    })()}

                    {errors?.phone2?.type === "invalid" && (
                        <p className="text-xs text-red-500">
                            {errors.phone2.message}
                        </p>
                    )}

                </div>

                {mode === "add" && <FormInput
                    label={mode === "add" ? "Password" : "Password"}
                    field="password"
                    type="password"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required={mode === "add"}
                    viewMode={viewMode}
                />}
                {mode === "add" && <FormInput
                    label={mode === "add" ? "Confirm Password" : "Confirm Password"}
                    field="confirm_password"
                    type="password"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required={mode === "add"}
                    viewMode={viewMode}
                />}

            </div>

            {/* ================= ADDRESS ================= */}

            <div className="space-y-2">

                <Label>Address</Label>

                <textarea
                    disabled={viewMode}
                    value={value.address || ""}
                    className={`w-full min-h-[80px] rounded-[3px] border border-border px-3 py-2 text-sm ${errors.address ? "border-red-500" : ""
                        }`}
                    onChange={(e) => {

                        setValue((prev: any) => ({
                            ...prev,
                            address: e.target.value,
                        }));

                        setErrors((p: any) => ({
                            ...p,
                            address: "",
                        }));
                    }}
                />

            </div>

        </div>
    );
}
