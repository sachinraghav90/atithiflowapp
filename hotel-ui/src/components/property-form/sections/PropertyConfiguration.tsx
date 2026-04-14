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
        <div className="space-y-3 border border-border rounded-[5px] p-5 bg-card">

            <h3 className="font-semibold text-base">
                Property Configuration
            </h3>

            {/* FLOORS + ROOMS SUMMARY */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">


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

                <div className="space-y-2">
                    <Label>Serial Suffix *</Label>

                    <NativeSelect
                        disabled={viewMode}
                        value={value.serial_suffix}
                        title={errors.serial_suffix?.message || ""}
                        className={`w-full h-10 rounded-[3px] border px-3 text-sm ${errors.serial_suffix
                            ? "border-red-500 bg-white"
                            : "border-border bg-white"
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

                <div className="space-y-2">

                    <Label>Total Rooms</Label>

                    <input
                        disabled
                        value={totalRooms}
                        className="w-full h-10 rounded-[3px] border border-border px-3 text-sm bg-white"
                    />

                </div>

            </div>

            {/* FLOOR CONFIGURATION TABLE */}

            <div className="space-y-3">

                <Label>Floor Configuration</Label>

                <div className="border border-border rounded-[3px] overflow-hidden">

                    {/* HEADER */}

                    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 text-sm bg-muted/30">

                        <span>Floor</span>
                        <span>Rooms Count</span>
                        <span />

                    </div>

                    {/* ROWS */}

                    {value.floors?.map((floor: any, index: number) => (

                        <div
                            key={index}
                            className="grid grid-cols-[1fr_.6fr_auto] gap-4 px-4 py-3 border-t"
                        >

                            <span>Floor {floor.floor_number}</span>

                            <input
                                disabled={viewMode}
                                value={floor.total_rooms}
                                maxLength={2}
                                className="w-full h-10 rounded-[3px] border border-border px-3 text-sm bg-white"
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
                                    size="sm"
                                    variant="ghost"
                                    className="border"
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

