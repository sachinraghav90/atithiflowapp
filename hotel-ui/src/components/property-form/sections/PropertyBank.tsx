import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

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
        <div className="space-y-3 border border-border rounded-[5px] p-5 bg-card">

            <h3 className="font-semibold text-base">
                Bank Details (Optional)
            </h3>

            <div className="flex items-center gap-3">

                <Switch
                    disabled={viewMode}
                    checked={hasBankDetails}
                    onCheckedChange={setHasBankDetails}
                />

                <Label>Add Bank Details</Label>

                {!viewMode && hasBankDetails && (
                    <Button
                        size="sm"
                        variant="heroOutline"
                        onClick={addBankAccount}
                    >
                        + Add Account
                    </Button>
                )}

            </div>
            {hasBankDetails && (
                <div className="border rounded-[3px] overflow-hidden">

                    {/* ===== TABLE HEADER ===== */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_.2fr] bg-muted text-sm font-medium border-b">

                        <div className="p-2 font-bold text-left">Bank Name *</div>
                        <div className="p-2 font-bold text-left">Account Holder *</div>
                        <div className="p-2 font-bold text-left">Account Number *</div>
                        <div className="p-2 font-bold text-left">IFSC Code *</div>
                        <div className="p-2 font-bold text-right"></div>

                    </div>

                    {/* ===== TABLE BODY ===== */}
                    {bankAccounts.map((bank, index) => (

                        <div
                            key={index}
                            className="grid grid-cols-[1fr_1fr_1fr_1fr_.2fr] border-b last:border-b-0"
                        >

                            <TableInput
                                value={bank.bank_name}
                                error={errors[`bank_${index}_bank_name`]}
                                viewMode={viewMode}
                                onChange={(v) =>
                                    updateBankField(index, "bank_name", v)
                                }
                                maxLength={150}
                            />

                            <TableInput
                                value={bank.account_holder_name}
                                error={errors[`bank_${index}_account_holder_name`]}
                                viewMode={viewMode}
                                onChange={(v) =>
                                    updateBankField(index, "account_holder_name", v)
                                }
                                maxLength={150}
                            />

                            <TableInput
                                value={bank.account_number}
                                error={errors[`bank_${index}_account_number`]}
                                viewMode={viewMode}
                                onChange={(v) =>
                                    updateBankField(index, "account_number", v)
                                }
                                maxLength={50}
                            />

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

                            <div className="flex items-center justify-end pr-2">
                                {!viewMode && bankAccounts.length > 1 && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => removeBankAccount(index)}
                                    >
                                        ✕
                                    </Button>
                                )}
                            </div>

                        </div>
                    ))}

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

        /* OUTER CELL (same as laundry grid) */
        <div className="border-r p-1">

            <input
                disabled={viewMode}
                value={value}
                className={`
                    w-full
                    h-8
                    px-2
                    text-sm
                    rounded
                    border
                    border-input
                    bg-background
                    outline-none
                    focus:ring-1
                    focus:ring-primary
                    ${error ? "border-red-500" : ""}
                `}
                onChange={(e) => {

                    let val = e.target.value;

                    if (transform) val = transform(val);

                    onChange(val);

                }}
                maxLength={maxLength}
            />

        </div>

    );
}
