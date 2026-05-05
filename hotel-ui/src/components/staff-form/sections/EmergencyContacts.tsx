import FormInput from "@/components/forms/FormInput";
import { Label } from "@/components/ui/label";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;
    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;
    viewMode: boolean;
};

export default function EmergencyContacts({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent">

            <h3 className="font-semibold text-base">
                Emergency Contacts
            </h3>

            <div className="space-y-4">
                {/* PRIMARY CONTACT ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-10 gap-x-6 gap-y-4 items-end">
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Name"
                            field="emergency_contact_name"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Relation"
                            field="emergency_contact_relation"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-4">
                        <FormInput
                            label="Phone"
                            field="emergency_contact"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            prefix="+91"
                            transform={(v) => v.replace(/\D/g, "").slice(0, 10)}
                        />
                    </div>
                </div>

                {/* SECONDARY CONTACT ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-10 gap-x-6 gap-y-4 items-end">
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Secondary Contact Name"
                            field="emergency_contact_name_2"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <FormInput
                            label="Relation"
                            field="emergency_contact_relation_2"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            maxLength={50}
                        />
                    </div>
                    <div className="sm:col-span-4">
                        <FormInput
                            label="Phone"
                            field="emergency_contact_2"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            prefix="+91"
                            transform={(v) => v.replace(/\D/g, "").slice(0, 10)}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
