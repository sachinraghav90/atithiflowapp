import FormInput from "@/components/forms/FormInput";
import { Label } from "@/components/ui/label";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { NativeSelect } from "@/components/ui/native-select";

type FormError = {
    type: "required" | "invalid";
    message: string;
};

type PropertyTaxData = {
    gst_no: string;
    room_tax_rate: string | number;
    gst: string | number;
    restaurant_gst?: string | number;
    laundry_gst?: string | number;
    pan_no?: string;
    [key: string]: any;
};

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

    const handleGSTValidation = (val: string) => {
        if (!val) return;

        if (!GST_REGEX.test(val.toUpperCase())) {
            setErrors((p) => ({
                ...p,
                gst_no: {
                    type: "invalid",
                    message: "Invalid GSTIN format",
                },
            }));
        }
    };

    const handlePANValidation = (val: string) => {
        if (!val) return;

        if (!PAN_REGEX.test(val.toUpperCase())) {
            setErrors((p) => ({
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

            <h3 className="text-sm font-semibold text-primary/90">
                Legal & Tax Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

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
                        onChangeExtra={(val) => {
                            handleGSTValidation(val.toUpperCase());
                        }}
                        transform={(val: string) => val.toUpperCase()}
                    />
                </div>

                {/* ROOM TAX RATE */}

                <div>
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
                </div>

                <div className="space-y-1">
                    <Label className="text-foreground">GST Rate for Rooms *</Label>
                    <div className="flex gap-0">
                        <NativeSelect
                            disabled={viewMode}
                            value={value.gst !== undefined && value.gst !== null && value.gst !== "" ? Number(value.gst) : ""}
                            title={errors.gst?.message || ""}
                            className={`w-full h-11 rounded-[3px] border px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 ${errors.gst
                                ? "border-red-500 bg-background"
                                : "border-border/70 bg-background"
                                }`}
                            onChange={(e) =>
                                setValue((prev) => ({
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

                {/* GST RATE FOR RESTAURANT SELECT */}

                <div className="space-y-1">
                    <Label className="text-foreground">GST Rate for Restaurant Orders *</Label>
                    <div className="flex gap-0">
                        <NativeSelect
                            disabled={viewMode}
                            value={value.restaurant_gst !== undefined && value.restaurant_gst !== null ? Number(value.restaurant_gst) : 0}
                            title={errors.restaurant_gst?.message || ""}
                            className={`w-full h-11 rounded-[3px] border px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 ${errors.restaurant_gst
                                ? "border-red-500 bg-background"
                                : "border-border/70 bg-background"
                                }`}
                            onChange={(e) =>
                                setValue((prev) => ({
                                    ...prev,
                                    restaurant_gst: Number(e.target.value),
                                }))
                            }
                        >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                        </NativeSelect>
                    </div>
                </div>

                {/* GST RATE FOR LAUNDRY SELECT */}

                <div className="space-y-1">
                    <Label className="text-foreground">GST Rate for Laundry Orders *</Label>
                    <div className="flex gap-0">
                        <NativeSelect
                            disabled={viewMode}
                            value={value.laundry_gst !== undefined && value.laundry_gst !== null ? Number(value.laundry_gst) : 0}
                            title={errors.laundry_gst?.message || ""}
                            className={`w-full h-11 rounded-[3px] border px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 ${errors.laundry_gst
                                ? "border-red-500 bg-background"
                                : "border-border/70 bg-background"
                                }`}
                            onChange={(e) =>
                                setValue((prev) => ({
                                    ...prev,
                                    laundry_gst: Number(e.target.value),
                                }))
                            }
                        >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                        </NativeSelect>
                    </div>
                </div>

            </div>
        </div>
    );
}

