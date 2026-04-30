import FormInput from "@/components/forms/FormInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

    const phoneRegex = /^[0-9()]{10,15}$/;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    const updateField = (field: string, val: string) => {

        setValue((prev: any) => ({
            ...prev,
            [field]: val,
        }));

        // clear error
        setErrors((p: any) => ({
            ...p,
            [field]: undefined,
        }));

        /* live validation */

        if (field === "phone_office" && val) {
            if (!phoneRegex.test(val)) {
                setErrors((p: any) => ({
                    ...p,
                    phone_office: {
                        type: "invalid",
                        message: "Invalid phone number",
                    },
                }));
            }
        }

        if (field === "email_office" && val) {
            if (!emailRegex.test(val)) {
                setErrors((p: any) => ({
                    ...p,
                    email_office: {
                        type: "invalid",
                        message: "Invalid email address",
                    },
                }));
            }
        }
    };

    return (
        <div className="space-y-4 border border-border rounded-[5px] p-4 bg-card">

            <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">
                Corporate Office Address (Optional)
            </h3>

            {/* TOGGLE */}

            <div className="flex items-center gap-3">

                <Switch
                    disabled={viewMode}
                    checked={showOfficeFields}
                    onCheckedChange={setShowOfficeFields}
                />

                <Label className="text-xs font-medium text-muted-foreground">Add Corporate Office Details</Label>

            </div>

            {showOfficeFields && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                </div>

            )}

        </div>
    );
}