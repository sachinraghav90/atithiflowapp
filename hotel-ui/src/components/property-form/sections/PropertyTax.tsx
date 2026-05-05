import FormInput from "@/components/forms/FormInput";
import { Label } from "@/components/ui/label";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { NativeSelect } from "@/components/ui/native-select";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;
    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;
    viewMode: boolean;
};

export default function PropertyTax({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    /* ================= VALIDATION REGEX ================= */

    const GST_REGEX =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    const PAN_REGEX =
        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    /* ================= LIVE VALIDATION ================= */

    const validateGST = (val: string) => {
        if (!val) return;

        if (!GST_REGEX.test(val.toUpperCase())) {
            setErrors((p: any) => ({
                ...p,
                gst_no: {
                    type: "invalid",
                    message: "Invalid GSTIN format",
                },
            }));
        }
    };

    const validatePAN = (val: string) => {
        if (!val) return;

        if (!PAN_REGEX.test(val.toUpperCase())) {
            setErrors((p: any) => ({
                ...p,
                pan_no: {
                    type: "invalid",
                    message: "Invalid PAN format",
                },
            }));
        }
    };

    const inlineError = (field: string) =>
        errors[field]?.type === "invalid"
            ? errors[field].message
            : null;

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">

            <h3 className="text-xs font-semibold text-primary/90 uppercase tracking-[0.16em]">
                Legal & Tax Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                {/* GSTIN */}

                <div>
                    <FormInput
                        label="GSTIN"
                        field="gst_no"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        onChangeExtra={(val: string) =>
                            validateGST(val.toUpperCase())
                        }
                        transform={(val: string) => val.toUpperCase()}
                    />
                </div>

                {/* ROOM TAX RATE */}

                <FormInput
                    label="Room Tax Rate %"
                    field="room_tax_rate"
                    type="text"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    transform={(val: string) =>
                        normalizeNumberInput(val)
                    }
                    maxLength={2}
                />

                {/* GST RATE SELECT */}

                <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">GST Rate for Rooms *</Label>

                    <NativeSelect
                        disabled={viewMode}
                        value={value.gst}
                        title={errors.gst?.message || ""}
                        className={`w-full h-11 rounded-[3px] border px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 ${errors.gst
                            ? "border-red-500 bg-background"
                            : "border-border/70 bg-background"
                            }`}
                        onChange={(e) =>
                            setValue((prev: any) => ({
                                ...prev,
                                gst: Number(e.target.value),
                            }))
                        }
                    >
                        <option value="" disabled>-- Please Select --</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                    </NativeSelect>
                </div>

            </div>
        </div>
    );
}

