import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import FormInput from "@/components/forms/FormInput";
import { NativeSelect } from "@/components/ui/native-select";
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
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent">

            <h3 className="font-semibold text-base">
                Personal Details
            </h3>

            {/* ================= STAFF PHOTO ================= */}

            <div className="space-y-2">

                <Label>Staff Photo</Label>

                <div className="relative h-40 rounded-[3px] border border-border overflow-hidden bg-muted">

                    {mode === "edit" && value.id ? (
                        staffImageExists ? (
                            <img
                                src={`${import.meta.env.VITE_API_URL}/staff/${value.id}/image`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <User className="h-6 w-6" />
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
                                <User className="h-6 w-6" />
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

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                <div className="flex gap-2 items-end">

                    {/* SALUTATION */}
                    <div className="space-y-2 w-16 shrink-0">
                        <Label>{"\u00A0"}</Label>
                        <NativeSelect
                            disabled={viewMode}
                            className={`w-full h-10 rounded-[3px] border bg-background px-2 text-sm ${errors.salutation ? "border-red-500" : "border-border"
                                }`}
                            value={value.salutation || "Mr"}
                            onChange={(e) => {
                                setValue((prev: any) => ({
                                    ...prev,
                                    salutation: e.target.value,
                                }));
                                setErrors((prev: any) => {
                                    const next = { ...prev };
                                    delete next.salutation;
                                    return next;
                                });
                            }}
                        >
                            <option value="Mr">Mr</option>
                            <option value="Ms">Ms</option>
                            <option value="Mrs">Mrs</option>
                        </NativeSelect>
                    </div>

                    {/* FIRST NAME */}
                    <div className="flex-1">
                        <FormInput
                            label="First Name*"
                            field="first_name"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
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


                {/* ================= GENDER + MARITAL ================= */}


                <SelectField
                    label="Gender"
                    field="gender"
                    value={value}
                    setValue={setValue}
                    options={["Male", "Female", "Other"]}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                />

                <SelectField
                    label="Marital Status"
                    field="marital_status"
                    value={value}
                    setValue={setValue}
                    options={["Single", "Married"]}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                />

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


                {/* ================= NATIONALITY ================= */}

                <SelectField
                    label="Nationality"
                    field="nationality"
                    value={value}
                    setValue={setValue}
                    options={["Indian", "NRI", "Foreigner"]}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                />

                {/* ================= DOB ================= */}

                <div className="space-y-2">

                    <Label>Date of Birth*</Label>

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
                        className={errors.dob ? "border-red-500" : ""}
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


/* ================= INTERNAL SELECT FIELD ================= */

function SelectField({
    label,
    field,
    value,
    setValue,
    options,
    errors,
    setErrors,
    viewMode,
}: any) {

    return (
        <div className="space-y-2">

            <Label>{label}*</Label>

            <NativeSelect
                disabled={viewMode}
                className={`w-full h-10 rounded-[3px] border bg-background px-3 text-sm ${errors[field] ? "border-red-500" : "border-border"
                    }`}
                value={value[field] || ""}
                onChange={(e) => {

                    setValue((prev: any) => ({
                        ...prev,
                        [field]: e.target.value,
                    }));

                    setErrors((prev: any) => {
                        const next = { ...prev };
                        delete next[field];
                        return next;
                    });
                }}
            >
                <option value="" disabled>-- Please Select --</option>

                {options.map((opt: string) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}

            </NativeSelect>

        </div>
    );
}

