import FormInput from "@/components/forms/FormInput";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;
    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;
    viewMode: boolean;
};

export default function PropertyOperations({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">

            <h3 className="text-xs font-semibold text-primary/90 uppercase tracking-[0.16em]">
                Operations & Timings
            </h3>

            {/* CHECKIN / CHECKOUT */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                <FormInput
                    label="Check-in Time"
                    field="checkin_time"
                    type="time"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                />

                <FormInput
                    label="Check-out Time"
                    field="checkout_time"
                    type="time"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                />

            </div>

        </div>
    );
}
