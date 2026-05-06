import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { APP_DATE_INPUT_PLACEHOLDER, parseAppDate, toISODateOnly } from "@/utils/dateFormat";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
    mode: "add" | "edit" | "view";

    staffImageExists: boolean | null;
};

export default function PersonalDetails({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
    mode,
    staffImageExists,
}: Props) {

    const parseDate = (value?: string) =>
        parseAppDate(value);

    const formatDate = (date: Date | null) => {
        return toISODateOnly(date);
    };

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent [&>h3+*]:!mt-4">

            <h3 className="text-sm font-semibold text-primary/90">
                Personal Details
            </h3>

            {/* ================= STAFF PHOTO ================= */}

            <div className="space-y-2">

                <Label className="text-sm font-medium">Staff Photo</Label>

                <div className="relative h-40 rounded-[3px] border border-border/70 overflow-hidden bg-background">

                    {mode === "edit" && value.id ? (
                        staffImageExists ? (
                            <img
                                src={`${import.meta.env.VITE_API_URL}/staff/${value.id}/image`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <User className="h-6 w-6 opacity-20" />
                            </div>
                        )
                    ) : (
                        value.image ? (
                            <img
                                src={URL.createObjectURL(value.image)}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <User className="h-6 w-6 opacity-20" />
                            </div>
                        )
                    )}

                    {!viewMode && (
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) =>
                                setValue((prev: any) => ({
                                    ...prev,
                                    image: e.target.files?.[0],
                                }))
                            }
                        />
                    )}

                </div>

            </div>

            {/* ================= NAME ================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">

                <div className="flex gap-2 items-end lg:col-span-1">

                    {/* SALUTATION */}
                    <div className="w-16 shrink-0">
                        <FormSelect
                            label={"\u00A0"}
                            field="salutation"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                        >
                            <option value="Mr">Mr</option>
                            <option value="Ms">Ms</option>
                            <option value="Mrs">Mrs</option>
                        </FormSelect>
                    </div>

                    {/* FIRST NAME */}
                    <div className="flex-1">
                        <FormInput
                            label="First Name"
                            field="first_name"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            required
                            viewMode={viewMode}
                            maxLength={100}
                        />
                    </div>

                </div>

                <FormInput
                    label="Middle Name"
                    field="middle_name"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    maxLength={100}
                />

                <FormInput
                    label="Last Name"
                    field="last_name"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                    maxLength={100}
                />

                <FormSelect
                    label="Gender"
                    field="gender"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                >
                    <option value="" disabled>-- Please Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </FormSelect>

                <FormSelect
                    label="Marital Status"
                    field="marital_status"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                >
                    <option value="" disabled>-- Please Select --</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                </FormSelect>

                <FormInput
                    label="Blood Group"
                    field="blood_group"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    required
                    setErrors={setErrors}
                    viewMode={viewMode}
                    maxLength={10}
                />

                <FormSelect
                    label="Nationality"
                    field="nationality"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                >
                    <option value="" disabled>-- Please Select --</option>
                    <option value="Indian">Indian</option>
                    <option value="NRI">NRI</option>
                    <option value="Foreigner">Foreigner</option>
                </FormSelect>

                <div className="space-y-1">
                    <Label className="text-sm">Date of Birth *</Label>
                    <ResponsiveDatePicker
                        value={parseDate(value.dob)}
                        onChange={(date) =>
                            setValue((prev: any) => ({
                                ...prev,
                                dob: formatDate(date),
                            }))
                        }
                        minDate={new Date(1900, 0, 1)}
                        placeholder={APP_DATE_INPUT_PLACEHOLDER}
                        label="Date of Birth"
                        disabled={viewMode}
                        className={errors.dob ? "border-red-500" : "border-border/70"}
                    />
                    {errors.dob?.type === "invalid" && (
                        <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
                            {errors.dob.message}
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
}
