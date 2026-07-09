import { Label } from "@/components/ui/label";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import FormMultiSelect from "@/components/forms/FormMultiSelect";
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
    isSuperAdmin,
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

    const selectedRoleId = value.role_ids?.[0];
    const isOwnerRole = roles?.find(r => r.id === selectedRoleId)?.name?.toLowerCase() === "owner";

    useEffect(() => {
        if (!isOwnerRole && value.property_limit !== undefined && value.property_limit !== null) {
            setValue((prev: any) => ({ ...prev, property_limit: null }));
        }
    }, [isOwnerRole, setValue, value.property_limit]);

    useEffect(() => {
        if (value.property_ids && value.property_limit !== null && value.property_limit !== undefined && value.property_limit !== "") {
            const limit = Number(value.property_limit);
            if (value.property_ids.length > limit) {
                setErrors((prev: any) => ({
                    ...prev,
                    property_ids: {
                        type: "invalid",
                        message: limit === 0 
                            ? "This user has 0 as the property limit." 
                            : `This user has ${limit} property limit only.`
                    }
                }));
            } else {
                setErrors((prev: any) => {
                    if (prev.property_ids?.message?.includes("property limit")) {
                        const next = { ...prev };
                        delete next.property_ids;
                        return next;
                    }
                    return prev;
                });
            }
        }
    }, [value.property_limit, value.property_ids, setErrors]);

    return (
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent [&>h3+*]:!mt-4">

            <h3 className="text-sm font-semibold text-primary/90">
                Property & Role Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">

                {/* PROPERTY */}
                {isPrivilegeUser && (
                    <FormMultiSelect
                        label="Property"
                        field="property_ids"
                        value={value}
                        setValue={(action: any) => {
                            setValue((prev: any) => {
                                const nextState = typeof action === 'function' ? action(prev) : action;
                                if (nextState.property_ids && prev.property_limit !== null && prev.property_limit !== undefined && prev.property_limit !== "") {
                                    const limit = Number(prev.property_limit);
                                    if (nextState.property_ids.length > limit && nextState.property_ids.length > (prev.property_ids?.length || 0)) {
                                        setTimeout(() => {
                                            setErrors((errPrev: any) => ({
                                                ...errPrev,
                                                property_ids: {
                                                    type: "invalid",
                                                    message: limit === 0 
                                                        ? "This user has 0 as the property limit." 
                                                        : `This user has ${limit} property limit only.`
                                                }
                                            }));
                                        }, 0);
                                        return prev;
                                    }
                                }
                                return nextState;
                            });
                        }}
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
                    </FormMultiSelect>
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
                                    {role.name?.toUpperCase()}
                                </option>
                            ))}
                    </FormSelect>
                </div>

                {/* PROPERTY LIMIT */}
                {isOwnerRole && isSuperAdmin && (
                    <div className="space-y-1">
                        <FormInput
                        defaultValue={0}
                            label="Property Limit"
                            field="property_limit"
                            value={value}
                            setValue={setValue}
                            errors={errors}
                            setErrors={setErrors}
                            viewMode={viewMode}
                            type="number"
                            min="0"
                            placeholder=""
                        />
                      
                    </div>
                )}

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
