import { Label } from "@/components/ui/label";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { useEffect } from "react";
import { APP_DATE_INPUT_PLACEHOLDER, parseAppDate, toISODateOnly } from "@/utils/dateFormat";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;

    roles: any[];
    excludedRoles: string[];

    properties: any[];
    myPropertiesLoading: boolean;
    isSuperAdmin: boolean;

    isPrivilegeUser?: boolean
};

export default function PropertyRole({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
    roles,
    excludedRoles,
    properties,
    myPropertiesLoading,
    isPrivilegeUser
}: Props) {

    const parseDate = (value?: string) =>
        parseAppDate(value);

    const formatDate = (date: Date | null) => {
        return toISODateOnly(date);
    };

    useEffect(() => {
        if (!isPrivilegeUser && Array.isArray(properties) && properties.length > 0) {
            setValue((prev: any) => ({
                ...prev,
                property_id: properties[0].id,
            }));
        }
    }, [properties, isPrivilegeUser])

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent [&>h3+*]:!mt-4">

            <h3 className="text-sm font-semibold text-primary/90">
                Property & Role Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">

                {/* PROPERTY */}
                {isPrivilegeUser && (
                    <FormSelect
                        label="Property"
                        field="property_id"
                        value={value}
                        setValue={setValue}
                        errors={errors}
                        setErrors={setErrors}
                        required
                        viewMode={viewMode}
                    >
                        <option value="" disabled>-- Please Select --</option>
                        {!myPropertiesLoading &&
                            properties?.map((property) => (
                                <option key={property.id} value={property.id}>
                                    {property.brand_name}
                                </option>
                            ))}
                    </FormSelect>
                )}

                {/* ROLE */}
                <div className="space-y-1">
                    <Label className="text-sm">Role *</Label>
                    <FormSelect
                        label=""
                        field="role_ids"
                        value={{ role_ids: value.role_ids?.[0] || "" }}
                        setValue={(fn: any) => {
                            const updated = fn({ role_ids: value.role_ids?.[0] || "" });
                            setValue((prev: any) => ({
                                ...prev,
                                role_ids: [updated.role_ids],
                            }));
                        }}
                        errors={errors}
                        setErrors={setErrors}
                        viewMode={viewMode}
                    >
                        <option value="" disabled>-- Please Select --</option>
                        {roles
                            ?.filter(
                                (role) =>
                                    !excludedRoles?.includes(role.name.toUpperCase())
                            )
                            .map((role) => (
                                <option value={role.id} key={role.id}>
                                    {role.name}
                                </option>
                            ))}
                    </FormSelect>
                </div>

                {/* EMPLOYMENT TYPE */}
                <FormSelect
                    label="Employment Type"
                    field="employment_type"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                >
                    <option value="">-- Please Select --</option>
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                </FormSelect>

                {/* JOIN DATE */}
                <div className="space-y-1">
                    <Label className="text-sm">Joining Date *</Label>
                    <ResponsiveDatePicker
                        value={parseDate(value.hire_date)}
                        minDate={new Date(2000, 0, 1)}
                        onChange={(date) =>
                            setValue((prev: any) => ({
                                ...prev,
                                hire_date: formatDate(date),
                            }))
                        }
                        placeholder={APP_DATE_INPUT_PLACEHOLDER}
                        label="Joining Date"
                        disabled={viewMode}
                        className={errors.hire_date ? "border-red-500" : "border-border/70"}
                    />
                    {errors.hire_date?.type === "invalid" && (
                        <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
                            {errors.hire_date.message}
                        </p>
                    )}
                </div>

                {/* DEPARTMENT */}
                <FormInput
                    label="Department"
                    field="department"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    maxLength={100}
                />

                {/* DESIGNATION */}
                <FormInput
                    label="Designation"
                    field="designation"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    maxLength={100}
                />
            </div>

        </div>
    );
}
