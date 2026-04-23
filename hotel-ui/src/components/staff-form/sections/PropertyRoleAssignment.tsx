import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import FormInput from "@/components/forms/FormInput";
import { useEffect } from "react";
import { NativeSelect } from "@/components/ui/native-select";

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
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const clearError = (field: string) => {
        setErrors((prev: any) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
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
        <div className="space-y-6 border border-border rounded-[5px] p-5 bg-transparent">

            <h3 className="font-semibold text-base">
                Property & Role Assignment
            </h3>

            {/* ================= PROPERTY / DEPARTMENT / DESIGNATION ================= */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                {/* PROPERTY */}

                {isPrivilegeUser && <div className="space-y-2">

                    <Label>Property</Label>

                    <NativeSelect
                        disabled={viewMode}
                        title={errors.property_id?.type === "required" ? errors.property_id.message : ""}
                        className={`w-full h-10 rounded-[3px] border px-3 text-sm ${errors.property_id ? "border-red-500 bg-background" : "border-border bg-background"
                            }`}
                        value={value.property_id || ""}
                        onChange={(e) => {

                            setValue((prev: any) => ({
                                ...prev,
                                property_id: e.target.value,
                            }));

                            clearError("property_id");
                        }}
                    >
                        <option value="" disabled>
                            -- Please Select --
                        </option>

                        {!myPropertiesLoading &&
                            properties?.map((property) => (
                                <option key={property.id} value={property.id}>
                                    {property.brand_name}
                                </option>
                            ))}
                    </NativeSelect>

                    {errors.property_id?.type === "invalid" && (
                        <p className="text-xs text-red-500">
                            {errors.property_id.message}
                        </p>
                    )}

                </div>}

                {/* ROLE */}

                <div className="space-y-2">

                    <Label>Role*</Label>

                    <NativeSelect
                        disabled={viewMode}
                        title={errors.role_ids?.type === "required" ? errors.role_ids.message : ""}
                        className={`w-full h-10 rounded-[3px] border px-3 text-sm ${errors.role_ids ? "border-red-500 bg-background" : "border-border bg-background"
                            }`}
                        value={value.role_ids?.[0] || ""}
                        onChange={(e) => {

                            setValue((prev: any) => ({
                                ...prev,
                                role_ids: [e.target.value],
                            }));

                            clearError("role_ids");
                        }}
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
                    </NativeSelect>

                    {errors.role_ids?.type === "invalid" && (
                        <p className="text-xs text-red-500">
                            {errors.role_ids.message}
                        </p>
                    )}

                </div>

                {/* EMPLOYMENT TYPE */}

                <div className="space-y-2">

                    <Label>Employment Type</Label>

                    <NativeSelect
                        disabled={viewMode}
                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                        value={value.employment_type || ""}
                        onChange={(e) =>
                            setValue((prev: any) => ({
                                ...prev,
                                employment_type: e.target.value,
                            }))
                        }
                    >
                        <option value="">-- Please Select --</option>
                        <option value="full-time">Full Time</option>
                        <option value="part-time">Part Time</option>
                        <option value="contract">Contract</option>
                    </NativeSelect>

                </div>

                {/* JOIN DATE */}

                <div className="space-y-2">

                    <Label>Joining Date*</Label>
                    <ResponsiveDatePicker
                        value={parseDate(value.hire_date)}
                        minDate={new Date(2000, 0, 1)}
                        onChange={(date) => {

                            setValue((prev: any) => ({
                                ...prev,
                                hire_date: formatDate(date),
                            }));

                            clearError("hire_date");
                        }}
                        placeholder="DD-MM-YYYY"
                        label="Joining Date"
                        disabled={viewMode}
                        className={errors.hire_date ? "border-red-500" : ""}
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

