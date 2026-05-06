import FormInput from "@/components/forms/FormInput";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent [&>h3+*]:!mt-4">

            <h3 className="text-sm font-semibold text-primary/90">
                Emergency Contacts
            </h3>

            <div className="space-y-4">
                {/* PRIMARY CONTACT ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-10 gap-x-6 gap-y-4 items-end">
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Name"
                            field="emergency_contact_name"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Relation"
                            field="emergency_contact_relation"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-4">
                        <FormInput
                            label="Phone"
                            field="emergency_contact"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            prefixControl={
                                <PhonePrefixSelect
                                    value={value.emergency_contact_country_code ?? "+91"}
                                    disabled={viewMode}
                                    onValueChange={(countryCode) =>
                                        setValue((prev: any) => ({
                                            ...prev,
                                            emergency_contact_country_code: countryCode,
                                        }))
                                    }
                                    triggerClassName={cn(
                                        "h-11 w-[4.5rem] rounded-l-[3px] rounded-r-none border-border/70 border-r-0 px-3 text-sm font-semibold text-muted-foreground shadow-none hover:bg-background hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                        errors.emergency_contact && "border-red-500"
                                    )}
                                />
                            }
                            transform={(v) => v.replace(/\D/g, "").slice(0, 10)}
                        />
                    </div>
                </div>

                {/* SECONDARY CONTACT ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-10 gap-x-6 gap-y-4 items-end">
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Secondary Contact Name"
                            field="emergency_contact_name_2"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Relation"
                            field="emergency_contact_relation_2"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-4">
                        <FormInput
                            label="Phone"
                            field="emergency_contact_2"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            prefixControl={
                                <PhonePrefixSelect
                                    value={value.emergency_contact_2_country_code ?? "+91"}
                                    disabled={viewMode}
                                    onValueChange={(countryCode) =>
                                        setValue((prev: any) => ({
                                            ...prev,
                                            emergency_contact_2_country_code: countryCode,
                                        }))
                                    }
                                    triggerClassName={cn(
                                        "h-11 w-[4.5rem] rounded-l-[3px] rounded-r-none border-border/70 border-r-0 px-3 text-sm font-semibold text-muted-foreground shadow-none hover:bg-background hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                        errors.emergency_contact_2 && "border-red-500"
                                    )}
                                />
                            }
                            transform={(v) => v.replace(/\D/g, "").slice(0, 10)}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
