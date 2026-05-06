import FormInput from "@/components/forms/FormInput";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { cn } from "@/lib/utils";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
};

export default function PropertyLocation({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">

            <h3 className="text-sm font-semibold text-primary/90">
                Location & Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                {/* ADDRESS */}

                <div className="sm:col-span-2">
                    <FormInput
                        label="Address (Full Street Address)"
                        field="address_line_1"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={200}
                    />
                </div>

                {/* CITY / STATE / POSTAL */}

                <FormInput
                    label="City"
                    field="city"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={100}
                />

                <FormInput
                    label="State"
                    field="state"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={100}
                />

                <FormInput
                    label="Postal Code / PIN"
                    field="postal_code"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={20}
                />


                {/* COUNTRY */}

                <FormInput
                    label="Country"
                    field="country"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={100}
                />

                {/* PHONE / EMAIL */}


                <FormInput
                    label="Phone Number"
                    field="phone"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={15}
                    prefixControl={
                        <PhonePrefixSelect
                            value={value.phone_country_code ?? "+91"}
                            disabled={viewMode}
                            onValueChange={(countryCode) =>
                                setValue((prev: any) => ({
                                    ...prev,
                                    phone_country_code: countryCode,
                                }))
                            }
                            triggerClassName={cn(
                                "h-11 w-[4.5rem] rounded-l-[3px] rounded-r-none border-border/70 border-r-0 px-3 text-sm font-semibold text-muted-foreground shadow-none hover:bg-background hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                errors.phone && "border-red-500"
                            )}
                        />
                    }
                    transform={(val: string) => val.replace(/\D/g, "")}
                />

                <FormInput
                    label="Email Address"
                    field="email"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={150}
                />

            </div>

        </div>
    );
}
