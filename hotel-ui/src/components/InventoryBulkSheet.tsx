import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { MenuItemSelect } from "./MenuItemSelect";
import { cn } from "@/lib/utils";
import { Trash2, PlusCircle } from "lucide-react";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";

type InventoryRow = {
    id?: string;
    inventory_type_id: number | null;
    use_type: string;
    unit?: string;
    name: string;
    touched?: {
        name?: boolean;
        unit?: boolean;
        inventory_type_id?: boolean;
    };
};

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    propertyId: number;
    inventoryTypes: any[];
    existingInventory: any[];
    onSubmit: (rows: any[]) => void;
};

export default function InventoryBulkSheet({
    open,
    onOpenChange,
    propertyId,
    inventoryTypes,
    existingInventory,
    onSubmit
}: Props) {

    const emptyRow = () => ({
        id: crypto.randomUUID(),
        inventory_type_id: null,
        use_type: "fix",
        unit: "",
        name: "",
        touched: {}
    });

    const [rows, setRows] = useState<InventoryRow[]>([emptyRow()]);
    const [showErrors, setShowErrors] = useState(false);

    /* RESET WHEN CLOSED */

    useEffect(() => {
        if (!open) {
            setRows([emptyRow()]);
            setShowErrors(false);
        }
    }, [open]);

    /* UPDATE ROW */

    const updateRow = (index: number, patch: Partial<InventoryRow>) => {
        setRows(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...patch };
            return copy;
        });
    };

    /* ADD / REMOVE */

    const addRow = () => {
        setShowErrors(false);
        setRows(prev => [...prev, emptyRow()]);
    };

    const removeRow = (id?: string) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter(r => r.id !== id));
        }
    };

    /* VALIDATION */

    function getRowErrors(row: InventoryRow) {

        const normalizedName = row.name?.trim().toLowerCase();

        // duplicate inside bulk form
        const duplicateInForm =
            !!normalizedName &&
            !!row.inventory_type_id &&
            rows.some(r =>
                r.id !== row.id &&
                Number(r.inventory_type_id) === Number(row.inventory_type_id) &&
                (r.name || "").trim().toLowerCase() === normalizedName
            );

        // duplicate against existing DB inventory
        const duplicateExisting =
            !!normalizedName &&
            !!row.inventory_type_id &&
            existingInventory?.some(e =>
                Number(e.inventory_type_id) === Number(row.inventory_type_id) &&
                (e.name || "").trim().toLowerCase() === normalizedName
            );

        return {
            inventory_type_id: !row.inventory_type_id,
            name: !normalizedName,
            unit: row.use_type === "usable" && !row.unit,
            duplicateInForm,
            duplicateExisting
        };
    }

    /* SUBMIT */

    const handleSubmit = () => {

        setShowErrors(true);

        const hasError = rows.some(r => {
            const err = getRowErrors(r);
            return (
                err.inventory_type_id ||
                err.name ||
                err.unit ||
                err.duplicateInForm ||
                err.duplicateExisting
            );
        });

        if (hasError) return;

        const payload = rows.map(r => ({
            property_id: propertyId,
            inventory_type_id: r.inventory_type_id,
            use_type: r.use_type,
            unit: r.use_type === "usable" ? r.unit : null,
            name: r.name
        }));

        onSubmit(payload);
    };

    return (

        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" onOpenAutoFocus={(event) => event.preventDefault()} className="w-full sm:max-w-4xl h-full overflow-y-auto bg-background p-0 flex flex-col">

                <SheetHeader className="px-6 py-4 border-b bg-background">
                    <SheetTitle>Create Inventory (Bulk)</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto bg-background">
                    <div className="px-6 pb-6 pt-3 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Inventory Details</h3>
                                <p className="text-[10px] text-muted-foreground italic">*Define required fields for new inventory items</p>
                            </div>

                        <div className="editable-grid-compact border rounded-[5px] overflow-hidden bg-background/50 border-border">
                            <Table className="text-sm">
                                <TableHeader className="bg-muted/40">
                                    <TableRow className="h-10 hover:bg-transparent">
                                        <TableHead className="font-bold text-foreground">Inventory Type *</TableHead>
                                        <TableHead className="font-bold text-foreground">Use Type</TableHead>
                                        <TableHead className="font-bold text-foreground">Unit</TableHead>
                                        <TableHead className="font-bold text-foreground">Name *</TableHead>
                                        {rows.length > 1 && (
                                            <TableHead className="w-16 text-center font-bold text-foreground">Action</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>

                            <TableBody>

                                {rows.map((row, index) => {

                                    const errors = getRowErrors(row);
                                    const isNameInvalid =
                                        (showErrors && (errors.name || errors.duplicateInForm || errors.duplicateExisting)) ||
                                        (!!row.touched?.name && (errors.duplicateInForm || errors.duplicateExisting));

                                    return (

                                        <TableRow key={row.id} className="border-b hover:bg-muted/30">

                                            {/* TYPE */}
                                            <TableCell className="border-r p-1">
                                                <ValidationTooltip
                                                    isValid={!((showErrors || row.touched?.inventory_type_id) && errors.inventory_type_id)}
                                                    message="Required field"
                                                >
                                                    <MenuItemSelect
                                                        value={row.inventory_type_id}
                                                        items={inventoryTypes || []}
                                                        disabledIds={[]}
                                                        itemName="type"
                                                        extraClasses={cn(
                                                            "h-8 text-sm w-full",
                                                            (showErrors || row.touched?.inventory_type_id) && errors.inventory_type_id && "border border-red-500"
                                                        )}
                                                        onSelect={(id) =>
                                                            updateRow(index, {
                                                                inventory_type_id: id,
                                                                touched: { ...row.touched, inventory_type_id: true }
                                                            })
                                                        }
                                                        placeholder="--Please Select--"
                                                    />
                                                </ValidationTooltip>
                                            </TableCell>

                                            {/* USE TYPE */}
                                            <TableCell className="border-r p-1">
                                                <NativeSelect
                                                    className="w-full h-8 px-2 text-sm rounded border border-input"
                                                    value={row.use_type}
                                                    onChange={(e) =>
                                                        updateRow(index, {
                                                            use_type: e.target.value,
                                                            unit: e.target.value === "usable" ? row.unit : ""
                                                        })
                                                    }
                                                >
                                                    <option value="fix">Fix</option>
                                                    <option value="usable">Usable</option>
                                                </NativeSelect>
                                            </TableCell>

                                            {/* UNIT */}
                                            <TableCell className="border-r p-1">
                                                <ValidationTooltip
                                                    isValid={!((showErrors || row.touched?.unit) && errors.unit)}
                                                    message="Required field"
                                                >
                                                    <NativeSelect
                                                        disabled={row.use_type !== "usable"}
                                                        className={cn(
                                                            "w-full h-8 px-2 text-sm rounded border border-input",
                                                            row.use_type !== "usable" && "opacity-40 pointer-events-none",
                                                            (showErrors || row.touched?.unit) && errors.unit && "border-red-500"
                                                        )}
                                                        value={row.unit || ""}
                                                        onChange={(e) =>
                                                            updateRow(index, {
                                                                unit: e.target.value,
                                                                touched: { ...row.touched, unit: true }
                                                            })
                                                        }
                                                    >
                                                        <option value="">--Please Select--</option>
                                                        <option value="pcs">PCS</option>
                                                        <option value="kg">KG</option>
                                                        <option value="gm">GM</option>
                                                        <option value="ltr">LTR</option>
                                                        <option value="ml">ML</option>
                                                        <option value="box">BOX</option>
                                                        <option value="pack">PACK</option>
                                                    </NativeSelect>
                                                </ValidationTooltip>
                                            </TableCell>

                                            {/* NAME */}
                                            <TableCell className="border-r p-1">
                                                <ValidationTooltip
                                                    isValid={!isNameInvalid}
                                                    message={
                                                        errors.duplicateExisting
                                                            ? "This item is already registered for this category."
                                                            : errors.duplicateInForm
                                                                ? "This item is repeated in your list"
                                                                : "Required field"
                                                    }
                                                >
                                                    <input
                                                        value={row.name}
                                                        onChange={(e) =>
                                                            updateRow(index, { name: e.target.value })
                                                        }
                                                        className={cn(
                                                            "w-full h-8 px-2 text-sm rounded border border-input focus:outline-none focus:ring-1 focus:ring-primary",
                                                            isNameInvalid && "border-red-500"
                                                        )}
                                                        onBlur={() =>
                                                            updateRow(index, {
                                                                touched: { ...row.touched, name: true }
                                                            })
                                                        }
                                                    />
                                                </ValidationTooltip>
                                            </TableCell>

                                            {/* REMOVE */}
                                            {rows.length > 1 && (
                                                <TableCell className="p-1 text-center">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors"
                                                        onClick={() => removeRow(row.id)}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </TableCell>
                                            )}

                                        </TableRow>
                                    );
                                })}

                            </TableBody>

                        </Table>

                            <div className="editable-grid-footer p-3 bg-muted/10">
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                    onClick={addRow}
                                >
                                    <PlusCircle className="w-4 h-4" /> Add Row
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t bg-background flex justify-end gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button variant="hero" className="min-w-[140px]" onClick={handleSubmit}>
                            Create Inventory
                        </Button>
                    </div>
                </div>
                </div>

            </SheetContent>
        </Sheet>

    );
}
