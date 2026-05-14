import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeNumberInput, normalizePriceInput } from "@/utils/normalizeTextInput";
import { Switch } from "./ui/switch";
import { MenuItemSelect } from "./MenuItemSelect";
import { DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell } from "@/components/ui/data-grid";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, PlusCircle } from "lucide-react";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { NativeSelect } from "./ui/native-select";
import { Label } from "./ui/label";
import { generateId } from "@/utils/generateId";

const DUPLICATE_ITEMS_MESSAGE = "Duplicate Items Not Allowed";

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
        price?: boolean;
        menuItemGroupId?: boolean;
    };
};

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    propertyId: number;
    menuGroups: any[];
    existingItems: any[];
    onPropertyChange: (id: number | null) => void;
    onSubmit: (payload: any) => void;
};

export default function MenuMasterBulkSheet({
    open,
    onOpenChange,
    propertyId,
    menuGroups,
    existingItems,
    onPropertyChange,
    onSubmit
}: Props) {

    const emptyRow = (): Row => ({
        id: generateId(),
        itemName: "",
        description: "",
        price: "",
        menuItemGroupId: "",
        isVeg: true,
        isActive: true,
        touched: {},
    });

    const [rows, setRows] = useState<Row[]>([emptyRow()]);
    const [showErrors, setShowErrors] = useState(false);

    const {
        myProperties,
        isLoading: myPropertiesLoading,
        isSuperAdmin,
        isOwner
    } = useAutoPropertySelect(propertyId, onPropertyChange);

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
        if (rows.length === 1) {
            setRows([emptyRow()]);
            setShowErrors(false);
            return;
        }
        setRows(prev => prev.filter(r => r.id !== id));
    };

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
                price: Number(r.price),
                menuItemGroupId: Number(r.menuItemGroupId),
                isVeg: r.isVeg,
                isActive: r.isActive
            }))
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" onOpenAutoFocus={(event) => event.preventDefault()} className="w-full sm:max-w-4xl flex flex-col p-0 bg-background">
                <SheetHeader className="px-6 py-4 border-b bg-background">
                    <SheetTitle>Add Menu Items</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto bg-background">
                    <div className="px-6 pb-6 pt-3 space-y-6">
                        {(isSuperAdmin || isOwner) && (
                            <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-1 -mt-1 -mb-2">
                                <Label>Property</Label>
                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={propertyId ?? ""}
                                    onChange={(e) => onPropertyChange(Number(e.target.value) || null)}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {!myPropertiesLoading &&
                                        myProperties?.properties?.map((property) => (
                                            <option key={property.id} value={property.id}>
                                                {property.brand_name}
                                            </option>
                                        ))}
                                </NativeSelect>
                            </div>
                        )}
                        <div className="space-y-2">


                        <div className="editable-grid-compact border rounded-[5px] overflow-hidden flex flex-col bg-background/50 border-border">
                            <div className="grid-scroll-x w-full bg-background/50">
                                <div className="w-full min-w-[800px]">
                                    <DataGrid>
                                        <DataGridHeader>
                                            <DataGridHead>Item Name *</DataGridHead>
                                            <DataGridHead>Group *</DataGridHead>
                                            <DataGridHead className="w-32 text-center">Price *</DataGridHead>
                                            <DataGridHead className="w-32 text-center">Veg/Non-Veg</DataGridHead>
                                            {rows.length > 1 && (
                                                <DataGridHead className="w-16 text-center">Action</DataGridHead>
                                            )}
                                        </DataGridHeader>

                                        <tbody>
                                             {rows.map((row, index) => {
                                                const errors = getRowErrors(row);
                                                const isItemNameInvalid =
                                                    (showErrors && (errors.itemName || errors.duplicateInForm || errors.duplicateExisting)) ||
                                                    (!!row.touched?.itemName && (errors.duplicateInForm || errors.duplicateExisting));
                                                const isPriceInvalid = showErrors && errors.price;
                                                const isGroupInvalid = (showErrors || row.touched?.menuItemGroupId) && errors.group;

                                                return (
                                                    <DataGridRow key={row.id}>
                                                        {/* NAME */}
                                                         <DataGridCell>
                                                             <ValidationTooltip
                                                                 isValid={!isItemNameInvalid}
                                                                 message={
                                                                     errors.duplicateInForm
                                                                         ? DUPLICATE_ITEMS_MESSAGE
                                                                         : errors.duplicateExisting
                                                                             ? DUPLICATE_ITEMS_MESSAGE
                                                                             : errors.itemName
                                                                                 ? "Required field"
                                                                                 : ""
                                                                 }
                                                             >
                                                                 <Input
                                                                     className={cn(
                                                                         "h-9 w-full rounded-[3px] border border-input bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                         isItemNameInvalid && "border-red-500"
                                                                     )}
                                                                     value={row.itemName}
                                                                     placeholder="Enter item name"
                                                                     onChange={(e) => updateRow(index, { itemName: e.target.value })}
                                                                     onBlur={() => updateRow(index, { touched: { ...row.touched, itemName: true } })}
                                                                 />
                                                             </ValidationTooltip>
                                                         </DataGridCell>

                                                        {/* GROUP */}
                                                         <DataGridCell>
                                                             <ValidationTooltip
                                                                 isValid={!isGroupInvalid}
                                                                 message="Required field"
                                                             >
                                                                <MenuItemSelect
                                                                    value={Number(row.menuItemGroupId) || null}
                                                                    items={menuGroups || []}
                                                                    disabledIds={[]}
                                                                    itemName="name"
                                                                     extraClasses={cn(
                                                                        "h-9 w-full rounded-[3px] border border-input bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                        isGroupInvalid && "border-red-500"
                                                                    )}
                                                                     onSelect={(id) => updateRow(index, {
                                                                        menuItemGroupId: String(id),
                                                                        touched: { ...row.touched, menuItemGroupId: true }
                                                                     })}
                                                                     placeholder="--Please Select--"
                                                                />
                                                            </ValidationTooltip>
                                                        </DataGridCell>

                                                        {/* PRICE */}
                                                         <DataGridCell>
                                                             <ValidationTooltip
                                                                 isValid={!isPriceInvalid}
                                                                 message="Required field"
                                                             >
                                                                <Input
                                                                     className={cn(
                                                                         "h-9 w-full rounded-[3px] border border-input bg-background text-center text-sm font-bold shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                         isPriceInvalid && "border-red-500"
                                                                     )}
                                                                     value={row.price}
                                                                     placeholder="0.00"
                                                                     onChange={(e) =>
                                                                         updateRow(index, {
                                                                             price: normalizePriceInput(e.target.value)
                                                                         })
                                                                     }
                                                                     onBlur={() => updateRow(index, { touched: { ...row.touched, price: true } })}
                                                                 />
                                                            </ValidationTooltip>
                                                        </DataGridCell>

                                                        {/* VEG */}
                                                        <DataGridCell>
                                                            <div className="flex h-9 items-center justify-center gap-2">
                                                                <Switch
                                                                    checked={row.isVeg}
                                                                    onCheckedChange={(val) => updateRow(index, { isVeg: val })}
                                                                />
                                                                <span className={cn(
                                                                    "text-[10px] font-bold tracking-wider",
                                                                    row.isVeg ? "text-green-600" : "text-red-600"
                                                                )}>
                                                                    {row.isVeg ? "Veg" : "Non-Veg"}
                                                                </span>
                                                            </div>
                                                        </DataGridCell>

                                                        {/* ACTION */}
                                                        {rows.length > 1 && (
                                                            <DataGridCell className="text-center">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors"
                                                                    onClick={() => removeRow(row.id)}
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </Button>
                                                            </DataGridCell>
                                                        )}
                                                    </DataGridRow>
                                                );
                                            })}
                                        </tbody>
                                    </DataGrid>
                                </div>
                            </div>
                            <div className="editable-grid-footer p-3 bg-muted/10">
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                        onClick={addRow}
                                    >
                                        <PlusCircle className="w-4 h-4" /> Add New Menu Item(s)
                                    </button>
                                    {showErrors && rows.some(r => getRowErrors(r).duplicateInForm) && (
                                        <p className="text-xs text-red-600 font-medium">
                                            * {DUPLICATE_ITEMS_MESSAGE}
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
                            Create Items
                        </Button>
                    </div>
                </div>
            </div>
            </SheetContent>
        </Sheet>
    );
}
