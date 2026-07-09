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
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent [&>h3+*]:!mt-4">

            <h3 className="text-sm font-semibold text-primary/90">
                Contact & Login
            </h3>

            {/* ================= EMAIL + PHONE ================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
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

                <FormInput
                    label="Phone"
                    field="phone1"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    required
                    viewMode={viewMode}
                    prefixControl={
                        <PhonePrefixSelect
                            value={value.phone1_country_code ?? "+91"}
                            disabled={viewMode}
                            onValueChange={(countryCode) =>
                                setValue((prev: any) => ({
                                    ...prev,
                                    phone1_country_code: countryCode,
                                }))
                            }
                            triggerClassName={cn(
                                "h-11 rounded-l-[3px] rounded-r-none border-border/70 shadow-none hover:bg-background hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                errors.phone1 && "border-red-500"
                            )}
                        />
                    }
                    transform={(v) => v.replace(/\D/g, "").slice(0, 10)}
                />

                <FormInput
                    label="Alternate Phone"
                    field="phone2"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    prefixControl={
                        <PhonePrefixSelect
                            value={value.phone2_country_code ?? "+91"}
                            disabled={viewMode}
                            onValueChange={(countryCode) =>
                                setValue((prev: any) => ({
                                    ...prev,
                                    phone2_country_code: countryCode,
                                }))
                            }
                            triggerClassName={cn(
                                "h-11 rounded-l-[3px] rounded-r-none border-border/70 shadow-none hover:bg-background hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                errors.phone2 && "border-red-500"
                            )}
                        />
                    }
                    transform={(v) => v.replace(/\D/g, "").slice(0, 10)}
                />

                {mode === "add" && (
                    <FormInput
                        label="Password"
                        field="password"
                        type="password"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        required
                        viewMode={viewMode}
                    />
                )}

                {mode === "add" && (
                    <FormInput
                        label="Confirm Password"
                        field="confirm_password"
                        type="password"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        required
                        viewMode={viewMode}
                        onChangeExtra={handleConfirmPassword}
                    />
                )}
            </div>

            {/* ================= ADDRESS ================= */}

            <div className="space-y-1">
                <Label className="text-sm text-foreground">Address</Label>
                <textarea
                    disabled={viewMode}
                    value={value.address || ""}
                    className={cn(
                        "w-full min-h-[80px] rounded-[3px] border border-border/70 bg-background px-3 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all",
                        errors.address && "border-red-500 text-red-500"
                    )}
                    onChange={(e) => {
                        setValue((prev: any) => ({
                            ...prev,
                            address: e.target.value,
                        }));
                        setErrors?.((p: any) => ({
                            ...p,
                            address: "",
                        }));
                    }}
                />
            </div>

        </div>
    );
}
