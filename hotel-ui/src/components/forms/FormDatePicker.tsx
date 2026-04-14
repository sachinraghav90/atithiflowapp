import DatePicker from "react-datepicker";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export default function FormDatePicker({
    label,
    field,
    value,
    setValue,
    errors,
    setErrors,
    required,
    selected,
    onChange,
    customInput
}: any) {
    const normalizedSelected =
        selected instanceof Date && !Number.isNaN(selected.getTime())
            ? selected
            : null;

    const error = errors?.[field];
    const hoverError =
        error?.type === "required" ? error.message : "";

    return (
        <div className="space-y-2">

            <Label title={hoverError}>
                {label} {required && "*"}
            </Label>
            <div>
                <DatePicker
                    selected={normalizedSelected}
                    onChange={(date) => {

                        onChange(date);

                        setErrors((prev: any) => {
                            const next = { ...prev };
                            delete next[field];
                            return next;
                        });
                    }}
                    customInput={
                        <Input
                            readOnly
                            className={error ? "border-red-500 bg-white" : "bg-white"}
                        />
                    }
                />
            </div>
            {error?.type === "invalid" && (
                <p className="text-xs text-red-500">
                    {error.message}
                </p>
            )}

        </div>
    );
}
