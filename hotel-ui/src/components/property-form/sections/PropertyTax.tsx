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
        <div className="space-y-3 border border-border rounded-[5px] p-5 bg-card">

            <h3 className="font-semibold text-base">
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

                    {/* {inlineError("gst_no") && (
                        <p className="text-red-500 text-xs mt-1">
                            {inlineError("gst_no")}
                        </p>
                    )} */}
                </div>

                {/* PAN */}

                {/* <div>
                    <FormInput
                        label="PAN Number"
                        field="pan_no"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        onChangeExtra={(val: string) =>
                            validatePAN(val.toUpperCase())
                        }
                        transform={(val: string) => val.toUpperCase()}
                    />

                </div> */}

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
                    // required
                    transform={(val: string) =>
                        normalizeNumberInput(val)
                    }
                    maxLength={2}
                />

                {/* GST RATE SELECT */}

                <div className="space-y-2">
                    <Label>GST Rate for Rooms *</Label>

                    <NativeSelect
                        disabled={viewMode}
                        value={value.gst}
                        title={errors.gst?.message || ""}
                        className={`w-full h-10 rounded-[3px] border px-3 text-sm ${errors.gst
                            ? "border-red-500 bg-background"
                            : "border-border bg-background"
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

