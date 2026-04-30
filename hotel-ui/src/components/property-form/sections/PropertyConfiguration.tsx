import FormInput from "@/components/forms/FormInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { NativeSelect } from "@/components/ui/native-select";

type Props = {
    value: any;
    setValue: (fn: (prev: any) => any) => void;
    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;
    viewMode: boolean;
    mode?: "add" | "edit" | "view";
};

export default function PropertyConfiguration({
    value,
    setValue,
    errors,
    setErrors,
    viewMode,
}: Props) {

    /* ================= FLOOR SYNC ================= */

    const syncFloors = (totalFloors: number) => {

        setValue((prev: any) => {

            let floors = [...(prev.floors || [])];

            if (totalFloors > floors.length) {
                for (let i = floors.length + 1; i <= totalFloors; i++) {
                    floors.push({
                        floor_number: i,
                        total_rooms: 1,
                    });
                }
            }

            if (totalFloors < floors.length) {
                floors = floors.slice(0, totalFloors);
            }

            floors = floors.map((f, index) => ({
                ...f,
                floor_number: index + 1,
            }));

            return {
                ...prev,
                total_floors: totalFloors,
                floors,
            };
        });
    };

    /* ================= TOTAL ROOMS AUTO CALC ================= */

    const totalRooms =
        (value.floors || []).reduce(
            (acc: number, curr: any) =>
                acc + Number(curr.total_rooms || 0),
            0
        );

    return (
        <div className="space-y-4 border border-border rounded-[5px] p-4 bg-card">

            <h3 className="font-semibold text-sm text-primary uppercase tracking-wider">
                Property Configuration
            </h3>

            {/* FLOORS + ROOMS SUMMARY */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">


                {/* Serial Number */}

                <FormInput
                    label="Serial Number"
                    field="serial_number"
                    value={value.serial_number}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    type="text"
                    maxLength={3}
                />

                {/* Serial Suffix */}

                <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Serial Suffix *</Label>

                    <NativeSelect
                        disabled={viewMode}
                        value={value.serial_suffix}
                        title={errors.serial_suffix?.message || ""}
                        className={`w-full h-9 rounded-[3px] border px-3 text-sm ${errors.serial_suffix
                            ? "border-red-500 bg-background"
                            : "border-border bg-background"
                            }`}
                        onChange={(e) =>
                            setValue((prev: any) => ({
                                ...prev,
                                serial_suffix: e.target.value,
                            }))
                        }
                    >
                        <option value="">-- Please Select --</option>
                        <option value="001">001</option>
                        <option value="002">002</option>
                        <option value="003">003</option>
                    </NativeSelect>
                </div>

                {/* TOTAL FLOORS */}

                <FormInput
                    label="Total Floors"
                    field="total_floors"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    required
                    type="text"
                    maxLength={2}
                    onChangeExtra={(val: string) =>
                        syncFloors(+normalizeNumberInput(val))
                    }
                />

                {/* TOTAL ROOMS AUTO */}

                <div className="space-y-1">

                    <Label className="text-xs font-medium text-muted-foreground">Total Rooms</Label>

                    <input
                        disabled
                        value={totalRooms}
                        className="w-full h-9 rounded-[3px] border border-border px-3 text-sm bg-muted/20"
                    />

                </div>

            </div>

            {/* FLOOR CONFIGURATION TABLE */}

            <div className="space-y-3">

                <Label className="text-xs font-medium text-muted-foreground">Floor Configuration</Label>

                <div className="border border-border rounded-[3px] overflow-hidden">

                    {/* HEADER */}

                    <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-muted/50 text-muted-foreground">

                        <span>Floor</span>
                        <span>Rooms Count</span>
                        <span />

                    </div>

                    {/* ROWS */}

                    {value.floors?.map((floor: any, index: number) => (

                        <div
                            key={index}
                            className="grid grid-cols-[1fr_.6fr_auto] gap-3 px-3 py-2 border-t items-center"
                        >

                            <span className="text-sm font-medium">Floor {floor.floor_number}</span>

                            <input
                                disabled={viewMode}
                                value={floor.total_rooms}
                                maxLength={2}
                                className="w-full h-8 rounded-[3px] border border-border px-3 text-sm bg-background focus:ring-1 focus:ring-primary outline-none"
                                onChange={(e) => {

                                    const val = normalizeNumberInput(e.target.value);

                                    setValue((prev: any) => {

                                        const floors = [...prev.floors];

                                        floors[index] = {
                                            ...floors[index],
                                            total_rooms: val,
                                        };

                                        return { ...prev, floors };

                                    });
                                }}
                            />

                            {!viewMode && (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                        syncFloors(
                                            Math.max(
                                                value.total_floors - 1,
                                                0
                                            )
                                        )
                                    }
                                >
                                    Remove
                                </Button>
                            )}

                        </div>
                    ))}

                    {!value.floors?.length && (
                        <div className="text-sm text-muted-foreground p-4 text-center">
                            No floors added
                        </div>
                    )}

                </div>

                {!viewMode && (
                    <Button
                        size="sm"
                        variant="heroOutline"
                        className="h-8 text-xs"
                        onClick={() =>
                            syncFloors(
                                (value.total_floors || 0) + 1
                            )
                        }
                    >
                        Add Floor
                    </Button>
                )}

            </div>

        </div>
    );
}

