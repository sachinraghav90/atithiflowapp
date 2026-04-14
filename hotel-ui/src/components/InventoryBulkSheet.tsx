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

type InventoryRow = {
    id?: string;
    inventory_type_id: number | null;
    use_type: string;
    unit?: string;
    name: string;
    touched?: {
        name?: boolean;
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
        setRows(prev => prev.filter(r => r.id !== id));
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
            <SheetContent side="right" className="w-full sm:max-w-4xl h-full overflow-y-auto">

                <SheetHeader>
                    <SheetTitle>Create Inventory (Bulk)</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">

                    <div className="border rounded-md overflow-hidden">

                        <Table className="text-sm">

                            <TableHeader>
                                <TableRow className="h-9">
                                    <TableHead>Inventory Type *</TableHead>
                                    <TableHead>Use Type</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Name *</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>

                                {rows.map((row, index) => {

                                    const errors = getRowErrors(row);

                                    return (

                                        <TableRow key={row.id} className="border-b hover:bg-muted/30">

                                            {/* TYPE */}
                                            <TableCell className="border-r p-1">
                                                <MenuItemSelect
                                                    value={row.inventory_type_id}
                                                    items={inventoryTypes || []}
                                                    disabledIds={[]}
                                                    itemName="type"
                                                    extraClasses={cn(
                                                        "h-8 text-sm",
                                                        showErrors && errors.inventory_type_id && "border border-red-500"
                                                    )}
                                                    onSelect={(id) =>
                                                        updateRow(index, { inventory_type_id: id })
                                                    }
                                                />
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
                                                <NativeSelect
                                                    disabled={row.use_type !== "usable"}
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border border-input",
                                                        row.use_type !== "usable" && "opacity-40 pointer-events-none",
                                                        showErrors && errors.unit && "border-red-500"
                                                    )}
                                                    value={row.unit || ""}
                                                    onChange={(e) =>
                                                        updateRow(index, { unit: e.target.value })
                                                    }
                                                >
                                                    <option value="">-- Select --</option>
                                                    <option value="pcs">PCS</option>
                                                    <option value="kg">KG</option>
                                                    <option value="gm">GM</option>
                                                    <option value="ltr">LTR</option>
                                                    <option value="ml">ML</option>
                                                    <option value="box">BOX</option>
                                                    <option value="pack">PACK</option>
                                                </NativeSelect>
                                            </TableCell>

                                            {/* NAME */}
                                            <TableCell className="border-r p-1">
                                                <input
                                                    value={row.name}
                                                    onChange={(e) =>
                                                        updateRow(index, { name: e.target.value })
                                                    }
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border border-input",
                                                        (showErrors || row.touched?.name) &&
                                                        (errors.name ||
                                                            errors.duplicateInForm ||
                                                            errors.duplicateExisting) &&
                                                        "border-red-500"
                                                    )}
                                                    onBlur={() =>
                                                        updateRow(index, {
                                                            touched: { ...row.touched, name: true }
                                                        })
                                                    }
                                                    title={
                                                        (showErrors || row.touched?.name)
                                                            ? errors.duplicateExisting
                                                                ? "Inventory already exists"
                                                                : errors.duplicateInForm
                                                                    ? "Duplicate in list"
                                                                    : errors.name
                                                                        ? "Required"
                                                                        : ""
                                                            : ""
                                                    }
                                                />
                                            </TableCell>

                                            {/* REMOVE */}
                                            <TableCell className="flex justify-center p-1">
                                                <button
                                                    className="text-red-500"
                                                    onClick={() => removeRow(row.id)}
                                                    disabled={rows.length === 1}
                                                >
                                                    ✕
                                                </button>
                                            </TableCell>

                                        </TableRow>
                                    );
                                })}

                            </TableBody>

                        </Table>

                    </div>

                    <div className="flex justify-between">
                        <Button variant="heroOutline" onClick={addRow}>
                            + Add Row
                        </Button>

                        <Button variant="hero" onClick={handleSubmit}>
                            Create Inventory
                        </Button>
                    </div>

                </div>

            </SheetContent>
        </Sheet>

    );
}

