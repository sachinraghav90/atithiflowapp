import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import DatePicker from "react-datepicker";
import FormInput from "@/components/forms/FormInput";
import { NativeSelect } from "@/components/ui/native-select";

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
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-card">

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
                    <div className="space-y-2 w-[5.31rem]">

                        <Label>First Name*</Label>

                        <NativeSelect
                            disabled={viewMode}
                            className={`w-full h-10 rounded-[3px] border px-2 text-sm ${errors.salutation ? "border-red-500" : "border-border"
                                }`}
                            value={value.salutation || ""}
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
                            <option value="">--</option>
                            <option value="Mr">Mr</option>
                            <option value="Ms">Ms</option>
                            <option value="Mrs">Mrs</option>
                            {/* <option value="Dr">Dr</option> */}
                        </NativeSelect>

                    </div>

                    {/* FIRST NAME */}
                    <div className="flex-1">

                        <FormInput
                            label=""
                            field="first_name"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            // required
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

                    <DatePicker
                        className="bg-white"
                        selected={parseDate(value.dob)}
                        onChange={(date) =>
                            setValue((prev: any) => ({
                                ...prev,
                                dob: formatDate(date),
                            }))
                        }
                        minDate={new Date(1900, 0, 1)}
                        dateFormat="dd-MM-yyyy"
                        customInput={
                            <Input
                                readOnly
                                className={errors.dob ? "border-red-500 bg-white" : "bg-white"}
                                title={errors.dob?.type === "required" ? errors.dob.message : ""}
                            />
                        }
                    />
                    {errors.dob?.type === "invalid" && (
                        <p className="text-xs text-red-500">
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
                className={`w-full h-10 rounded-[3px] border px-3 text-sm ${errors[field] ? "border-red-500" : "border-border"
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

