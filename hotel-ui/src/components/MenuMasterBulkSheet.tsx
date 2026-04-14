import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { Switch } from "./ui/switch";
import { MenuItemSelect } from "./MenuItemSelect";

type Row = {
    id: string;
    itemName: string;
    description: string;
    price: string;
    menuItemGroupId: string;
    isVeg: boolean;
    isActive: boolean;
    touched?: {
        itemName?: boolean;
    };
};

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    propertyId: number;
    menuGroups: any[];
    existingItems: any[];
    onSubmit: (payload: any) => void;
};

export default function MenuMasterBulkSheet({
    open,
    onOpenChange,
    propertyId,
    menuGroups,
    existingItems,
    onSubmit
}: Props) {

    const emptyRow = (): Row => ({
        id: crypto.randomUUID(),
        itemName: "",
        description: "",
        price: "",
        menuItemGroupId: "",
        isVeg: true,
        isActive: true,
        touched: {}
    });

    const [rows, setRows] = useState<Row[]>([emptyRow()]);
    const [showErrors, setShowErrors] = useState(false);

    useEffect(() => {
        if (!open) {
            setRows([emptyRow()]);
            setShowErrors(false);
        }
    }, [open]);

    const updateRow = (index: number, patch: Partial<Row>) => {
        setRows(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...patch };
            return copy;
        });
    };

    const addRow = () => {
        setShowErrors(false);
        setRows(prev => [...prev, emptyRow()]);
    };

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    /* ===== VALIDATION (same concept as inventory bulk) ===== */

    function getRowErrors(row: Row) {

        const duplicateInForm =
            row.itemName.trim() &&
            rows.filter(r =>
                r.itemName.trim().toLowerCase() === row.itemName.trim().toLowerCase()
            ).length > 1;

        const duplicateExisting =
            existingItems?.some(
                e => e.item_name.toLowerCase() === row.itemName.trim().toLowerCase()
            );

        return {
            itemName: !row.itemName.trim(),
            price: !row.price || Number(row.price) <= 0,
            group: !row.menuItemGroupId,
            duplicateInForm,
            duplicateExisting
        };
    }

    const handleSubmit = () => {

        setShowErrors(true);

        const hasError = rows.some(r => {
            const err = getRowErrors(r);
            return (
                err.itemName ||
                err.price ||
                err.group ||
                err.duplicateInForm ||
                err.duplicateExisting
            );
        });

        if (hasError) return;

        onSubmit({
            propertyId,
            items: rows.map(r => ({
                itemName: r.itemName,
                description: r.description,
                price: r.price,
                menuItemGroupId: r.menuItemGroupId,
                isVeg: r.isVeg,
                isActive: r.isActive
            }))
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-4xl h-full overflow-y-auto"
            >

                <SheetHeader>
                    <SheetTitle>Bulk Create Menu Items</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">

                    <div className="border rounded-md overflow-hidden">

                        <Table className="text-sm">

                            <TableHeader>
                                <TableRow className="h-9">
                                    <TableHead>Item Name *</TableHead>
                                    <TableHead>Group *</TableHead>
                                    <TableHead>Price *</TableHead>
                                    <TableHead>Veg</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>

                                {rows.map((row, index) => {

                                    const errors = getRowErrors(row);

                                    return (

                                        <TableRow key={row.id} className="border-b hover:bg-muted/30">

                                            {/* NAME */}
                                            <TableCell className="border-r p-1">
                                                <input
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border border-input",
                                                        (
                                                            (showErrors || row.touched?.itemName) &&
                                                            (
                                                                errors.itemName ||
                                                                errors.duplicateInForm ||
                                                                errors.duplicateExisting
                                                            )
                                                        ) && "border-red-500"
                                                    )}
                                                    value={row.itemName}
                                                    title={
                                                        (showErrors || row.touched?.itemName)
                                                            ? errors.duplicateExisting
                                                                ? "Item already exists"
                                                                : errors.duplicateInForm
                                                                    ? "Duplicate item in list"
                                                                    : errors.itemName
                                                                        ? "Required"
                                                                        : ""
                                                            : ""
                                                    }
                                                    onChange={(e) =>
                                                        updateRow(index, { itemName: e.target.value })
                                                    }
                                                    onBlur={() =>
                                                        updateRow(index, {
                                                            touched: { ...row.touched, itemName: true }
                                                        })
                                                    }
                                                />
                                            </TableCell>

                                            {/* GROUP */}
                                            <TableCell className="border-r p-1">

                                                <MenuItemSelect
                                                    value={Number(row.menuItemGroupId) || null}
                                                    items={menuGroups || []}
                                                    disabledIds={[]}
                                                    itemName="name"   // ⭐ IMPORTANT
                                                    extraClasses={cn(
                                                        "h-8 text-sm",
                                                        showErrors && errors.group && "border border-red-500"
                                                    )}
                                                    onSelect={(id) =>
                                                        updateRow(index, { menuItemGroupId: String(id) })
                                                    }
                                                />

                                            </TableCell>

                                            {/* PRICE */}
                                            <TableCell className="border-r p-1">
                                                <input
                                                    className={cn(
                                                        "w-full h-8 px-2 text-sm rounded border border-input",
                                                        showErrors && errors.price && "border-red-500"
                                                    )}
                                                    value={row.price}
                                                    onChange={(e) =>
                                                        updateRow(index, {
                                                            price: normalizeNumberInput(e.target.value).toString()
                                                        })
                                                    }
                                                />
                                            </TableCell>

                                            {/* VEG */}
                                            {/* VEG */}
                                            <TableCell className="p-1 border-r">
                                                <div className="flex items-center justify-center gap-2 h-8">
                                                    <Switch
                                                        checked={row.isVeg}
                                                        onCheckedChange={(val) =>
                                                            updateRow(index, { isVeg: val })
                                                        }
                                                    />
                                                    <span
                                                        className={cn(
                                                            "text-xs font-medium",
                                                            row.isVeg ? "text-green-600" : "text-red-600"
                                                        )}
                                                    >
                                                        {row.isVeg ? "Veg" : "Non-Veg"}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* REMOVE */}
                                            <TableCell className="p-1 w-12 text-center">
                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700 text-sm"
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
                            Create Items
                        </Button>

                    </div>

                </div>

            </SheetContent>
        </Sheet>
    );
}

