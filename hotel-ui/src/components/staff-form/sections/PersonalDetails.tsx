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

            <div className="flex flex-col lg:flex-row gap-8">
                {/* ================= LEFT SIDE: FORM FIELDS ================= */}
                <div className="flex-1 space-y-5">
                    {/* ROW 1: NAMES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        {/* COMBINED SALUTATION + FIRST NAME */}
                        <div className="space-y-1">
                            <Label className="text-foreground">First Name *</Label>
                            <div className="flex gap-0">
                                {/* SALUTATION */}
                                <div className="w-[64px] shrink-0">
                                    <FormSelect
                                        label=""
                                        field="salutation"
                                        value={value}
                                        setValue={setValue}
                                        errors={errors}
                                        setErrors={setErrors}
                                        viewMode={viewMode}
                                        className="h-11 px-0 rounded-r-none border-r-0"
                                        hideIcon={false}
                                    >
                                        <option value="Mr.">Mr.</option>
                                        <option value="Ms.">Ms.</option>
                                        <option value="Mrs.">Mrs.</option>
                                    </FormSelect>
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
                                        viewMode={viewMode}
                                        maxLength={100}
                                        className="rounded-l-none"
                                    />
                                </div>
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
                    </div>

                    {/* ROW 2: GENDER, MARITAL STATUS, BLOOD GROUP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
                    </div>

                    {/* ROW 3: NATIONALITY, DATE OF BIRTH */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
                        {/* Empty column for alignment */}
                        <div className="hidden md:block"></div>
                    </div>
                </div>

                {/* ================= RIGHT SIDE: STAFF PHOTO ================= */}
                <div className="w-full lg:w-40 flex flex-col items-center shrink-0">
                    <div className="space-y-2 w-full max-w-[140px]">
                        <Label className="text-sm font-medium text-center block">Staff Photo</Label>
                        
                        <div className="relative aspect-[3/4] rounded-[4px] border border-border/70 overflow-hidden bg-background shadow-sm group">
                            {mode === "edit" && value.id ? (
                                staffImageExists ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/staff/${value.id}/image`}
                                        className="w-full h-full object-cover"
                                        alt="Staff"
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                                        <User className="h-8 w-8 opacity-20" />
                                        <span className="text-[10px] mt-2 opacity-40">No Image</span>
                                    </div>
                                )
                            ) : (
                                value.image ? (
                                    <img
                                        src={URL.createObjectURL(value.image)}
                                        className="w-full h-full object-cover"
                                        alt="Staff Preview"
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                                        <User className="h-8 w-8 opacity-20" />
                                        <span className="text-[10px] mt-2 opacity-40">Upload Photo</span>
                                    </div>
                                )
                            )}

                            {!viewMode && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={(e) =>
                                            setValue((prev: any) => ({
                                                ...prev,
                                                image: e.target.files?.[0],
                                            }))
                                        }
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-[9px] text-muted-foreground text-center tracking-tighter opacity-70">
                            Passport Size Preferred
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
