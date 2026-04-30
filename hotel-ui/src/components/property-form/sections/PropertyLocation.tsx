import FormInput from "@/components/forms/FormInput";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
};

export default function PropertyLocation({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    return (
        <div className="space-y-4 border border-border rounded-[5px] p-4 bg-card">

            <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">
                Location & Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">

                {/* ADDRESS */}

                <div className="sm:col-span-2">
                    <FormInput
                        label="Address (Full Street Address)"
                        field="address_line_1"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                        required
                        maxLength={200}
                    />
                </div>

                {/* CITY / STATE / POSTAL */}

                <FormInput
                    label="City"
                    field="city"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={100}
                />

                <FormInput
                    label="State"
                    field="state"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={100}
                />

                <FormInput
                    label="Postal Code / PIN"
                    field="postal_code"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={20}
                />


                {/* COUNTRY */}

                <FormInput
                    label="Country"
                    field="country"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={100}
                />

                {/* PHONE / EMAIL */}


                <FormInput
                    label="Phone Number"
                    field="phone"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={15}
                />

                <FormInput
                    label="Email Address"
                    field="email"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    maxLength={150}
                />

            </div>

        </div>
    );
}
