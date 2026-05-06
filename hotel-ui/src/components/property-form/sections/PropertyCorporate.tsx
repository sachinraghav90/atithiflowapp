import FormInput from "@/components/forms/FormInput";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    showOfficeFields: boolean;
    setShowOfficeFields: (v: boolean) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
};

export default function PropertyCorporate({
    value,
    setValue,
    showOfficeFields,
    setShowOfficeFields,
    errors,
    setErrors,
    viewMode,
}: Props) {

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">

            <h3 className="text-sm font-semibold text-primary/90">
                Corporate Office Address (Optional)
            </h3>

            <div className="flex items-center gap-3">

                <Switch
                    disabled={viewMode}
                    checked={showOfficeFields}
                    onCheckedChange={setShowOfficeFields}
                />

                <Label className="text-xs font-medium text-muted-foreground">Add Corporate Office Details</Label>

            </div>

            {showOfficeFields && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                        <FormInput
                            label="Corporate Office Address"
                            field="address_line_1_office"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            required
                            maxLength={255}
                        />
                    </div>

                    <FormInput
                        label="Corporate Phone"
                        field="phone_office"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={15}
                        prefixControl={
                            <PhonePrefixSelect
                                value={value.phone_office_country_code ?? "+91"}
                                disabled={viewMode}
                                onValueChange={(countryCode) =>
                                    setValue((prev: any) => ({
                                        ...prev,
                                        phone_office_country_code: countryCode,
                                    }))
                                }
                                triggerClassName={cn(
                                    "h-11 w-[4.5rem] rounded-l-[3px] rounded-r-none border-border/70 border-r-0 px-3 text-sm font-semibold text-muted-foreground shadow-none hover:bg-background hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                    errors.phone_office && "border-red-500"
                                )}
                            />
                        }
                        transform={(val: string) => val.replace(/\D/g, "")}
                    />

                    <FormInput
                        label="Corporate Email"
                        field="email_office"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={150}
                    />

                    <FormInput
                        label="Corporate City"
                        field="city_office"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={100}
                    />

                    <FormInput
                        label="Corporate State"
                        field="state_office"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={100}
                    />

                    <FormInput
                        label="Corporate Postal Code"
                        field="postal_code_office"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={20}
                    />

                    <FormInput
                        label="Corporate Country"
                        field="country_office"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={100}
                    />
                </div>

            )}

        </div>
    );
}
