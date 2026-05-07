import FormInput from "@/components/forms/FormInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { NativeSelect } from "@/components/ui/native-select";
import { DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell } from "@/components/ui/data-grid";
import { Trash2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const floors = value.floors || [];
    const showFloorActions = !viewMode && floors.length > 1;

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">

            <h3 className="text-sm font-semibold text-primary/90">
                Property Configuration
            </h3>

            {/* FLOORS + ROOMS SUMMARY */}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                {/* Serial Number */}
                <FormInput
                    label="Serial Number"
                    field="serial_number"
                    value={value}
                    setValue={setValue}
                    errors={errors}
                    setErrors={setErrors}
                    viewMode={viewMode}
                    type="text"
                    maxLength={3}
                />

                {/* Serial Suffix */}
                <div className="space-y-1">
                    <Label className="text-foreground">Serial Suffix *</Label>
                    <NativeSelect
                        disabled={viewMode}
                        value={value.serial_suffix}
                        title={errors.serial_suffix?.message || ""}
                        className={cn(
                            "w-full h-11 rounded-[3px] border px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                            errors.serial_suffix ? "border-red-500 bg-background" : "border-border/70 bg-background"
                        )}
                        onChange={(e) =>
                            setValue((prev: any) => ({
                                ...prev,
                                serial_suffix: e.target.value,
                            }))
                        }
                    >
                        <option value="">-- Select --</option>
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
                    <Label className="text-foreground">Total Rooms</Label>
                    <input
                        disabled
                        value={totalRooms}
                        className="w-full h-11 rounded-[3px] border border-border/70 px-3 text-sm bg-muted/20 font-bold"
                    />
                </div>

            </div>

            {/* FLOOR CONFIGURATION TABLE - Standardized Editable Grid */}
            <div className="space-y-3 pt-2">
                <Label className="text-foreground">Floor Configuration</Label>

                <div className="editable-grid-compact border rounded-[5px] overflow-hidden flex flex-col">
                    <div className="overflow-x-auto w-full bg-background border-b border-border">
                        <div className="w-full min-w-[560px]">
                            <DataGrid>
                                <DataGridHeader>
                                    <DataGridHead>Floor Number</DataGridHead>
                                    <DataGridHead>Rooms Count *</DataGridHead>
                                    {showFloorActions && (
                                        <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                    )}
                                </DataGridHeader>

                            <tbody>
                                {floors.map((floor: any, index: number) => (
                                    <DataGridRow key={index}>
                                        <DataGridCell>
                                            <span className="text-sm font-semibold">Floor {floor.floor_number}</span>
                                        </DataGridCell>

                                        <DataGridCell>
                                            <input
                                                disabled={viewMode}
                                                value={floor.total_rooms}
                                                maxLength={2}
                                                placeholder="0"
                                                className="w-full h-9 rounded-[3px] border border-border bg-background px-3 text-sm font-bold shadow-none outline-none focus:ring-1 focus:ring-primary"
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
                                        </DataGridCell>

                                        {showFloorActions && (
                                            <DataGridCell className="text-center">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors mx-auto"
                                                    aria-label="Remove floor row"
                                                    onClick={() =>
                                                        syncFloors(Math.max(value.total_floors - 1, 0))
                                                    }
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </DataGridCell>
                                        )}
                                    </DataGridRow>
                                ))}
                            </tbody>
                            </DataGrid>
                        </div>
                    </div>

                    {!floors.length && (
                        <div className="text-xs text-muted-foreground p-8 text-center italic bg-accent/5">
                            No floors configured. Enter Total Floors to begin.
                        </div>
                    )}

                    {!viewMode && (
                        <div className="editable-grid-footer p-3 bg-muted/10">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                onClick={() => syncFloors((value.total_floors || 0) + 1)}
                            >
                                <PlusCircle className="w-4 h-4" /> Add New Floor
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
