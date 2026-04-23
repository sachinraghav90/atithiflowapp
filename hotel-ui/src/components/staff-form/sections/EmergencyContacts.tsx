import FormInput from "@/components/forms/FormInput";
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
import { ChevronDown } from "lucide-react";
import COUNTRY_CODES from "../../../utils/countryCode.json";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { useState } from "react";
import { Label } from "@/components/ui/label";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;
    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;
    viewMode: boolean;
};

export default function EmergencyContacts({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    const [countryCodeModal, setCountryCodeModal] = useState({
        3: false,
        4: false,
    });

    /* ================= PHONE CELL ================= */

    const PhoneCell = (field: string, modalIndex: number, required?: boolean) => {

        const error = errors?.[field];
        const raw = value[field] || "";

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
                [field]: `${code} ${ph}`.trim(),
            }));

            setErrors((prev: any) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        };

        return (
            <div className="space-y-1">

                <div className="flex gap-[2px]">

                    <Popover
                        open={countryCodeModal[modalIndex]}
                        onOpenChange={(open) =>
                            setCountryCodeModal(prev => ({
                                ...prev,
                                [modalIndex]: open,
                            }))
                        }
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={viewMode}
                                className={cn(
                                    "h-10 bg-background justify-between rounded-r-none w-[85px]",
                                    error && "border-red-500"
                                )}
                            >
                                {countryCode}
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
                                                updatePhone(c.country_code, phone);
                                                setCountryCodeModal(prev => ({
                                                    ...prev,
                                                    [modalIndex]: false,
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

                    <Input
                        disabled={viewMode}
                        value={phone}
                        maxLength={15}
                        title={error?.type === "required" ? error.message : ""}
                        className={cn(
                            "h-10 rounded-l-none bg-background",
                            error && "border-red-500"
                        )}
                        onChange={(e) => {
                            const v = normalizeTextInput(e.target.value);
                            updatePhone(countryCode, v);
                        }}
                    />
                </div>

                {error?.type === "invalid" && (
                    <p className="text-xs text-red-500">{error.message}</p>
                )}

            </div>
        );
    };

    return (
        <div className="space-y-5 border border-border rounded-[5px] p-5 bg-transparent">

            <h3 className="font-semibold text-base">
                Emergency Contacts
            </h3>

            {/* TABLE HEADER */}

            <div className="grid grid-cols-10 border-b pb-2">

                <Label className="col-span-3">Name</Label>
                <Label className="col-span-3">Relation</Label>
                <Label className="col-span-4">Phone</Label>

            </div>


            {/* PRIMARY ROW */}

            <div className="grid grid-cols-10 gap-3 items-end">

                <div className="col-span-3 flex flex-col justify-end">
                    <FormInput
                        label=""
                        field="emergency_contact_name"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        maxLength={20}
                    />
                </div>

                <div className="col-span-3 flex flex-col justify-end">
                    <FormInput
                        label=""
                        field="emergency_contact_relation"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        maxLength={20}
                    />
                </div>

                <div className="col-span-4">
                    {PhoneCell("emergency_contact", 3, true)}
                </div>

            </div>


            {/* SECONDARY ROW */}

            <div className="grid grid-cols-10 gap-3 items-end">

                <div className="col-span-3 flex flex-col justify-end">
                    <FormInput
                        label=""
                        field="emergency_contact_name_2"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        maxLength={20}
                    />
                </div>

                <div className="col-span-3 flex flex-col justify-end">
                    <FormInput
                        label=""
                        field="emergency_contact_relation_2"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        maxLength={20}
                    />
                </div>

                <div className="col-span-4">
                    {PhoneCell("emergency_contact_2", 4)}
                </div>
            </div>


        </div>
    );
}
