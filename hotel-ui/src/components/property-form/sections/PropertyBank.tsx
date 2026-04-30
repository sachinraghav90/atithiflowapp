import { Button } from "@/components/ui/button";
import { DataGrid, DataGridCell, DataGridHead, DataGridHeader, DataGridRow } from "@/components/ui/data-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { cn } from "@/lib/utils";
import { PlusCircle, Trash2 } from "lucide-react";

type BankAccount = {
    id?: number;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    branch_address?: string;
};

type Props = {
    bankAccounts: BankAccount[];
    setBankAccounts: (fn: (prev: BankAccount[]) => BankAccount[]) => void;

    hasBankDetails: boolean;
    setHasBankDetails: (v: boolean) => void;

    deletedBankIds: number[];
    setDeletedBankIds: (fn: (prev: number[]) => number[]) => void;

    errors: Record<string, any>;
    setErrors: (fn: (prev: any) => any) => void;

    viewMode: boolean;
};

export default function PropertyBank({
    bankAccounts,
    setBankAccounts,
    hasBankDetails,
    setHasBankDetails,
    deletedBankIds,
    setDeletedBankIds,
    errors,
    setErrors,
    viewMode,
}: Props) {

    const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    const updateBankField = (
        index: number,
        field: keyof BankAccount,
        val: string
    ) => {

        setBankAccounts(prev => {

            const copy = [...prev];

            copy[index] = {
                ...copy[index],
                [field]: val,
            };

            return copy;
        });

        // clear error
        setErrors((p: any) => ({
            ...p,
            [`bank_${index}_${field}`]: undefined,
        }));

        // inline validation for IFSC
        if (field === "ifsc_code" && val) {
            if (!IFSC_REGEX.test(val.toUpperCase())) {
                setErrors((p: any) => ({
                    ...p,
                    [`bank_${index}_ifsc_code`]: {
                        type: "invalid",
                        message: "Invalid IFSC code",
                    },
                }));
            }
        }
    };

    const addBankAccount = () => {
        setBankAccounts(prev => [
            ...prev,
            {
                account_holder_name: "",
                account_number: "",
                ifsc_code: "",
                bank_name: "",
                branch_address: "",
            },
        ]);
    };

    const removeBankAccount = (index: number) => {

        setBankAccounts(prev => {

            const removed = prev[index];

            if (removed?.id) {
                setDeletedBankIds(ids => [...ids, removed.id!]);
            }

            return prev.filter((_, i) => i !== index);
        });
    };

    return (
        <div className="space-y-4 rounded-[5px] border border-border/40 bg-background p-4 shadow-sm">

            <h3 className="text-xs font-semibold text-primary/90 uppercase tracking-[0.16em]">
                Bank Details (Optional)
            </h3>

            <div className="flex items-center gap-3">

                <Switch
                    disabled={viewMode}
                    checked={hasBankDetails}
                    onCheckedChange={setHasBankDetails}
                />

                <Label className="text-xs font-medium text-muted-foreground">Add Bank Details</Label>

            </div>
            {hasBankDetails && (
                <div className="editable-grid-compact overflow-hidden rounded-[5px] border border-border bg-background/50">
                    <div className="grid-scroll-x w-full overflow-x-auto border-b border-border bg-background/50">
                        <div className="w-full min-w-[860px]">
                            <DataGrid>
                                <DataGridHeader>
                                    <DataGridHead>Bank Name *</DataGridHead>
                                    <DataGridHead>Account Holder *</DataGridHead>
                                    <DataGridHead>Account Number *</DataGridHead>
                                    <DataGridHead>IFSC Code *</DataGridHead>
                                    {!viewMode && bankAccounts.length > 1 && (
                                        <DataGridHead className="w-16 text-center">Action</DataGridHead>
                                    )}
                                </DataGridHeader>

                                <tbody>
                                    {bankAccounts.map((bank, index) => (
                                        <DataGridRow key={bank.id ?? index}>
                                            <DataGridCell>
                                                <TableInput
                                                    value={bank.bank_name}
                                                    error={errors[`bank_${index}_bank_name`]}
                                                    viewMode={viewMode}
                                                    onChange={(v) =>
                                                        updateBankField(index, "bank_name", v)
                                                    }
                                                    maxLength={150}
                                                />
                                            </DataGridCell>

                                            <DataGridCell>
                                                <TableInput
                                                    value={bank.account_holder_name}
                                                    error={errors[`bank_${index}_account_holder_name`]}
                                                    viewMode={viewMode}
                                                    onChange={(v) =>
                                                        updateBankField(index, "account_holder_name", v)
                                                    }
                                                    maxLength={150}
                                                />
                                            </DataGridCell>

                                            <DataGridCell>
                                                <TableInput
                                                    value={bank.account_number}
                                                    error={errors[`bank_${index}_account_number`]}
                                                    viewMode={viewMode}
                                                    onChange={(v) =>
                                                        updateBankField(index, "account_number", v)
                                                    }
                                                    maxLength={50}
                                                />
                                            </DataGridCell>

                                            <DataGridCell>
                                                <TableInput
                                                    value={bank.ifsc_code}
                                                    error={errors[`bank_${index}_ifsc_code`]}
                                                    viewMode={viewMode}
                                                    transform={(v) => v.toUpperCase()}
                                                    onChange={(v) =>
                                                        updateBankField(index, "ifsc_code", v)
                                                    }
                                                    maxLength={20}
                                                />
                                            </DataGridCell>

                                            {!viewMode && bankAccounts.length > 1 && (
                                                <DataGridCell className="text-center">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="editable-grid-remove-btn h-10 w-10 text-destructive hover:text-destructive/80 transition-colors mx-auto"
                                                        aria-label="Remove bank account row"
                                                        onClick={() => removeBankAccount(index)}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </DataGridCell>
                                            )}
                                        </DataGridRow>
                                    ))}

                                    {!bankAccounts.length && (
                                        <DataGridRow>
                                            <DataGridCell
                                                colSpan={!viewMode && bankAccounts.length > 1 ? 5 : 4}
                                                className="text-center text-muted-foreground"
                                            >
                                                No bank accounts added
                                            </DataGridCell>
                                        </DataGridRow>
                                    )}
                                </tbody>
                            </DataGrid>
                        </div>
                    </div>

                    {!viewMode && (
                        <div className="editable-grid-footer p-3 bg-muted/10">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors"
                                onClick={addBankAccount}
                            >
                                <PlusCircle className="w-4 h-4" /> Add Account
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}


/* ================= SMALL INTERNAL FIELD COMPONENT ================= */
function TableInput({
    value,
    error,
    onChange,
    viewMode,
    transform,
    maxLength
}: any) {

    return (

        <ValidationTooltip
            isValid={!error}
            message={error?.message || "Required field"}
        >
            <Input
                disabled={viewMode}
                value={value}
                className={cn(
                    "h-9 w-full rounded-[3px] border border-input bg-background px-3 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                    error && "border-red-500"
                )}
                onChange={(e) => {

                    let val = e.target.value;

                    if (transform) val = transform(val);

                    onChange(val);

                }}
                maxLength={maxLength}
            />
        </ValidationTooltip>

    );
}
