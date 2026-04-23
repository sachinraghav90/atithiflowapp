import { useEffect, useState, useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuItemSelect } from "./MenuItemSelect";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Trash2, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { normalizeSignedNumberInput } from "@/utils/normalizeTextInput";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";

type Row = {
    id: string;
    inventory_master_id: number | null;
    quantity: string;
    unit?: string;
    touched?: {
        inventory_master_id?: boolean;
        quantity?: boolean;
    };
};

type MasterInventoryItem = {
    id: number;
    name: string;
    unit?: string | null;
    use_type?: string | null;
    is_active?: boolean;
};

type BulkAdjustRowPayload = {
    inventory_master_id: number;
    quantity: number;
    unit: string;
};

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    propertyId: number | null;
    masterInventory?: MasterInventoryItem[] | null;
    availableUnits: { id: string; label: string }[];
    currentInventory?: any[] | null;
    onSubmit: (rows: BulkAdjustRowPayload[]) => Promise<unknown> | unknown;
};

export default function KitchenInventoryBulkAdjustSheet({
    open,
    onOpenChange,
    propertyId,
    masterInventory,
    availableUnits,
    currentInventory,
    onSubmit
}: Props) {

    const emptyRow = () => ({
        id: crypto.randomUUID(),
        inventory_master_id: null,
        quantity: "",
        touched: {}
    });

    const [rows, setRows] = useState<Row[]>([emptyRow()]);
    const [showErrors, setShowErrors] = useState(false);

    const activeInventoryItems = (masterInventory ?? []).filter((item) => item?.is_active !== false);

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

    const removeRow = (id: string) => {
        if (rows.length === 1) {
            setRows([emptyRow()]);
            setShowErrors(false);
            return;
        }
        setRows(prev => prev.filter(r => r.id !== id));
    };

    /* VALIDATION */
    function getRowErrors(row: Row) {
        const isDuplicate = row.inventory_master_id &&
            rows.filter(r => r.inventory_master_id === row.inventory_master_id).length > 1;

        return {
            property_id: !propertyId,
            inventory_master_id: !row.inventory_master_id,
            quantity: !row.quantity || isNaN(Number(row.quantity)) || Number(row.quantity) === 0,
            duplicate: !!isDuplicate
        };
    }

    /* SUBMIT */
    const handleSubmit = () => {
        setShowErrors(true);

        if (!propertyId) {
            return;
        }

        const hasError = rows.some(r => {
            const err = getRowErrors(r);
            return err.property_id || err.inventory_master_id || err.quantity || err.duplicate;
        });

        if (hasError) return;

        const payload = rows.map(r => {
            const existingItem = currentInventory?.find(i => i.inventory_master_id == r.inventory_master_id);
            const masterItem = masterInventory?.find(m => m.id == r.inventory_master_id);

            return {
                inventory_master_id: Number(r.inventory_master_id),
                quantity: Number(r.quantity),
                unit: r.unit || existingItem?.unit || masterItem?.unit || ""
            };
        });

        void onSubmit(payload);
    };

    const selectedIds = rows
        .map(r => r.inventory_master_id)
        .filter(Boolean) as number[];

    const availableInventoryCount = activeInventoryItems.filter(
        (item) => !selectedIds.includes(item.id)
    ).length;

    const inventoryItemFormColumns = useMemo<ColumnDef<Row>[]>(() => {
        return [
            {
                label: "Inventory Item *",
                render: (row, index) => {
                    const errors = getRowErrors(row);
                    const disabledIds = selectedIds.filter((id) => id !== row.inventory_master_id);
                    return (
                        <ValidationTooltip
                            isValid={!((showErrors || row.touched?.inventory_master_id) && (errors.inventory_master_id || errors.duplicate))}
                            message={errors.duplicate ? "This item is repeated in your list" : "Required field"}
                        >
                            <MenuItemSelect
                                extraClasses={cn(
                                    "h-9 w-full bg-background border border-input rounded-[3px] shadow-none focus-visible:ring-1 focus-visible:ring-primary text-sm",
                                    (showErrors || row.touched?.inventory_master_id) && (errors.inventory_master_id || errors.duplicate) && "border-red-500"
                                )}
                                value={row.inventory_master_id ?? ""}
                                items={activeInventoryItems}
                                disabledIds={disabledIds}
                                onSelect={(inventoryId) => {
                                    const matchedMaster = activeInventoryItems.find((item) => item.id === Number(inventoryId));
                                    const matchedExisting = currentInventory?.find(item => item.inventory_master_id === Number(inventoryId));

                                    updateRow(index, {
                                        inventory_master_id: Number(inventoryId) || null,
                                        unit: row.unit || matchedExisting?.unit || matchedMaster?.unit || "",
                                        touched: { ...row.touched, inventory_master_id: true }
                                    });
                                }}
                                placeholder="Select inventory item"
                                itemName="name"
                                disabled={!propertyId}
                            />
                        </ValidationTooltip>
                    );
                },
            },
            {
                label: "Qty Change (+/-) *",
                headClassName: "text-center",
                cellClassName: "text-center",
                render: (row, index) => {
                    const errors = getRowErrors(row);
                    const isQuantityInvalid = showErrors && errors.quantity;
                    return (
                        <ValidationTooltip
                            isValid={!isQuantityInvalid}
                            message="Required field"
                        >
                            <Input
                                className={cn(
                                    "h-9 w-32 mx-auto text-center font-bold bg-background border border-input rounded-[3px] shadow-none focus-visible:ring-1 focus-visible:ring-primary text-sm",
                                    isQuantityInvalid && "border-red-500"
                                )}
                                value={row.quantity}
                                placeholder="0"
                                onChange={(e) => updateRow(index, { quantity: normalizeSignedNumberInput(e.target.value).toString() })}
                                onBlur={() => updateRow(index, { touched: { ...row.touched, quantity: true } })}
                            />
                        </ValidationTooltip>
                    );
                },
            },
            {
                label: "Unit",
                headClassName: "text-center",
                cellClassName: "text-center",
                render: (row, index) => {
                    const selectedMaster = masterInventory?.find(m => m.id == row.inventory_master_id);
                    return (
                        <NativeSelect
                            className="h-9 w-32 mx-auto bg-background border border-input rounded-[3px] shadow-none focus:ring-1 focus:ring-primary text-sm text-center"
                            value={row.unit || currentInventory?.find(i => i.inventory_master_id == row.inventory_master_id)?.unit || selectedMaster?.unit || ""}
                            onChange={(e) => updateRow(index, { unit: e.target.value })}
                            disabled={!row.inventory_master_id || selectedMaster?.use_type !== "usable"}
                        >
                            <option value="">--</option>
                            {availableUnits.map(u => (
                                <option key={u.id} value={u.id}>{u.label}</option>
                            ))}
                        </NativeSelect>
                    );
                },
            }
        ];
    }, [rows, showErrors, masterInventory, activeInventoryItems, selectedIds, propertyId, availableUnits, currentInventory]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" onOpenAutoFocus={(event) => event.preventDefault()} className="w-full sm:max-w-4xl flex flex-col p-0 bg-background">
                <SheetHeader className="px-6 py-4 border-b bg-background">
                    <SheetTitle>Adjust Kitchen Inventory Items</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto bg-background">
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">

                        <div className="editable-grid-compact border rounded-[5px] overflow-hidden bg-background/50 border-border">
                            <AppDataGrid
                                columns={inventoryItemFormColumns}
                                data={rows}
                                rowKey={(row) => row.id}
                                minWidth="700px"
                                actionClassName={rows.length > 1 ? "text-center w-16" : undefined}
                                prefixActions={false}
                                className="editable-grid-compact mt-0 border-0 rounded-none"
                                tableClassName="bg-background"
                                actions={rows.length > 1 ? ((row, index) => (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors"
                                        onClick={() => removeRow(row.id)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )) : undefined}
                            />

                            <div className="editable-grid-footer p-3 bg-muted/10">
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors disabled:opacity-50 disabled:no-underline"
                                        onClick={addRow}
                                        disabled={!propertyId || availableInventoryCount === 0}
                                    >
                                        <PlusCircle className="w-4 h-4" /> Add New Kitchen Inventory Item(s)
                                    </button>
                                    {!propertyId && (
                                        <p className="text-xs text-muted-foreground">
                                            *Select a property before adding stock.
                                        </p>
                                    )}
                                    {propertyId && availableInventoryCount === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            All active inventory items have already been added.
                                        </p>
                                    )}
                                    {showErrors && rows.some(r => getRowErrors(r).duplicate) && (
                                        <p className="text-xs text-red-600 font-medium">
                                            * Duplicate items detected. Please consolidate adjustments into a single row.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t bg-background flex justify-end gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button variant="hero" className="min-w-[140px]" onClick={handleSubmit}>
                        Adjust Stock
                        </Button>
                    </div>
                </div>
            </div>
            </SheetContent>
        </Sheet>
    );
}
