import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MenuItemSelect } from "./MenuItemSelect";

type Row = {
    id?: string;
    inventory_master_id: number | null;
    name?: string;
    unit?: string;
    quantity: string;
};

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    propertyId: number;
    masterInventory: any[];
    onSubmit: (rows: any[]) => void;
};

export default function KitchenInventoryBulkAdjustSheet({
    open,
    onOpenChange,
    propertyId,
    masterInventory,
    onSubmit
}: Props) {

    const emptyRow = () => ({
        id: crypto.randomUUID(),
        inventory_master_id: null,
        quantity: ""
    });

    const [rows, setRows] = useState<Row[]>([emptyRow()]);
    const [showErrors, setShowErrors] = useState(false);

    /* RESET WHEN CLOSED */

    useEffect(() => {
        if (!open) {
            setRows([emptyRow()]);
            setShowErrors(false);
        }
    }, [open]);

    /* UPDATE */

    const updateRow = (index: number, patch: Partial<Row>) => {
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

    function getRowErrors(row: Row) {
        return {
            inventory_master_id: !row.inventory_master_id,
            quantity: !row.quantity
        };
    }

    /* SUBMIT */

    const handleSubmit = () => {

        setShowErrors(true);

        const hasError = rows.some(r => {
            const err = getRowErrors(r);
            return err.inventory_master_id || err.quantity;
        });

        if (hasError) return;

        const payload = rows.map(r => ({
            property_id: propertyId,
            inventory_master_id: r.inventory_master_id,
            quantity: Number(r.quantity)
        }));

        onSubmit(payload);
    };

    const selectedIds = rows
        .map(r => r.inventory_master_id)
        .filter(Boolean);

    return (

        <Sheet open={open} onOpenChange={onOpenChange}>

            <SheetContent side="right" className="w-full sm:max-w-4xl h-full overflow-y-auto">

                <SheetHeader>
                    <SheetTitle>Bulk Adjust Kitchen Inventory</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">

                    <div className="border rounded-md overflow-hidden">

                        <Table className="text-sm">

                            <TableHeader>
                                <TableRow className="h-9">
                                    <TableHead>Inventory Item *</TableHead>
                                    <TableHead>Adjustment Quantity *</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>

                                {rows.map((row, index) => {

                                    const errors = getRowErrors(row);
                                    const selectedMaster = masterInventory?.find(
                                        m => m.id == row.inventory_master_id
                                    );

                                    const unit =
                                        selectedMaster?.use_type === "usable"
                                            ? selectedMaster?.unit
                                            : "";

                                    return (

                                        <TableRow key={row.id} className="border-b hover:bg-muted/30">

                                            {/* ITEM SELECT */}
                                            <TableCell className="border-r p-1">

                                                <MenuItemSelect
                                                    value={row.inventory_master_id}
                                                    items={masterInventory || []}
                                                    itemName="name"
                                                    disabledIds={selectedIds.filter(id => id !== row.inventory_master_id)}
                                                    extraClasses={cn(
                                                        "h-8 text-sm",
                                                        showErrors && errors.inventory_master_id && "border border-red-500"
                                                    )}
                                                    onSelect={(id) =>
                                                        updateRow(index, { inventory_master_id: id })
                                                    }
                                                />

                                            </TableCell>

                                            {/* QUANTITY */}
                                            <TableCell className="border-r p-1">

                                                <input
                                                    type="number"
                                                    placeholder="+ add / - reduce"
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border border-input",
                                                        showErrors && errors.quantity && "border-red-500"
                                                    )}
                                                    value={row.quantity}
                                                    onChange={(e) =>
                                                        updateRow(index, { quantity: e.target.value })
                                                    }
                                                />

                                            </TableCell>

                                            {/* Unit */}
                                            <TableCell className="border-r p-1">
                                                <div className="h-8 flex items-center px-2 text-sm text-muted-foreground">
                                                    {unit || "-"}
                                                </div>

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
                            Adjust Stock
                        </Button>

                    </div>

                </div>

            </SheetContent>

        </Sheet>

    );
}
