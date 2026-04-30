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
        <div className="space-y-4 border border-border rounded-[5px] p-4 bg-card">

            <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">
                Operations & Timings
            </h3>

            {/* CHECKIN / CHECKOUT */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">

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
