import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
    useCreatePaymentMutation,
    useGetPaymentsByBookingIdQuery,
    useGetPropertyBanksQuery,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { toast } from "react-toastify";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { formatAppDateTime, toDatetimeLocalValue } from "@/utils/dateFormat";
import { DataGrid, DataGridHeader, DataGridHead, DataGridRow, DataGridCell } from "../ui/data-grid";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Payment = {
    id?: string;
    payment_date: string;
    paid_amount: string | number;
    payment_method: string;
    payment_type: string;
    bank_name?: string;
    transaction_id?: string;
    comments?: string;
    created_by_name?: string;
    created_on?: string;
};

type Props = {
    bookingId: string;
    propertyId: string;
};

const EMPTY_PAYMENT: Payment = {
    payment_date: toDatetimeLocalValue(new Date()),
    paid_amount: "",
    payment_method: "Cash",
    payment_type: "Advance",
    bank_name: "",
    transaction_id: "",
    comments: "",
};

export default function PaymentsEmbedded({
    bookingId,
    propertyId,
}: Props) {
    const [isEditing, setIsEditing] = useState(true);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [originalPayments, setOriginalPayments] = useState<Payment[]>([]);

    const isLoggedIn = useAppSelector((state) => state.isLoggedIn.value);

    const { data, isLoading: paymentsLoading } =
        useGetPaymentsByBookingIdQuery(
            { bookingId },
            {
                skip: !bookingId || !isLoggedIn,
            },
        );

    const { data: banks } = useGetPropertyBanksQuery(propertyId, {
        skip: !isLoggedIn || !propertyId,
    });

    const [createPayment, { isLoading: isSaving }] = useCreatePaymentMutation();

    useEffect(() => {
        if (!data?.data) return;
        const fetched = data.data.map((p: any) => ({
            ...p,
            paid_amount: String(p.paid_amount)
        }));
        
        if (fetched.length === 0) {
            setPayments([{ ...EMPTY_PAYMENT }]);
        } else {
            setPayments(fetched);
        }
        setOriginalPayments(fetched);
    }, [data]);

    const addRow = () => {
        setPayments((prev) => [...prev, { ...EMPTY_PAYMENT }]);
    };

    const removeRow = (index: number) => {
        setPayments((prev) => prev.filter((_, i) => i !== index));
    };

    const updateRow = (index: number, patch: Partial<Payment>) => {
        setPayments((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
        );
    };

    const handleCancel = () => {
        if (originalPayments.length === 0) {
            setPayments([{ ...EMPTY_PAYMENT }]);
        } else {
            setPayments(JSON.parse(JSON.stringify(originalPayments)));
        }
    };

    const handleSave = async () => {
        // Only save rows that have an amount and are new (no ID)
        const newPayments = payments.filter(p => !p.id && Number(p.paid_amount) > 0);
        
        if (newPayments.length === 0) {
            toast.info("No new payments to save");
            return;
        }

        try {
            for (const p of newPayments) {
                const payload = {
                    booking_id: bookingId,
                    property_id: propertyId,
                    payment_date: p.payment_date,
                    paid_amount: Number(p.paid_amount),
                    payment_method: p.payment_method,
                    payment_type: p.payment_type,
                    bank_name: p.bank_name,
                    transaction_id: p.transaction_id,
                    comments: p.comments
                };
                await createPayment({ payload }).unwrap();
            }
            toast.success("Payments saved successfully");
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save some payments");
        }
    };

    if (paymentsLoading) {
        return <p className="text-sm text-muted-foreground p-4">Loading payments...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col">
                <h3 className="text-base font-semibold text-foreground">Payments</h3>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Manage payment entries for this booking
                </p>
            </div>

            <div className="rounded-[5px] border-2 border-primary/50 bg-background overflow-hidden shadow-sm">
                <DataGrid className="editable-grid-compact border-none">
                    <DataGridHeader className="grid-header-inside-table">
                        <DataGridHead className="w-[180px]">Date</DataGridHead>
                        <DataGridHead className="w-[140px]">Amount</DataGridHead>
                        <DataGridHead className="w-[130px]">Method</DataGridHead>
                        <DataGridHead className="w-[130px]">Type</DataGridHead>
                        <DataGridHead className="flex-1 min-w-[200px]">Comments / Details</DataGridHead>
                        {payments.filter(x => !x.id).length > 1 && (
                            <DataGridHead className="w-20 text-center">Action</DataGridHead>
                        )}
                    </DataGridHeader>

                    <tbody>
                        {payments.map((p, index) => {
                            const isExisting = !!p.id;
                            return (
                                <DataGridRow key={p.id || index} className="hover:bg-muted/5 transition-colors">
                                    {/* DATE */}
                                    <DataGridCell>
                                        {isExisting ? (
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {formatAppDateTime(p.payment_date)}
                                            </span>
                                        ) : (
                                            <Input
                                                type="datetime-local"
                                                className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20"
                                                value={p.payment_date}
                                                onChange={(e) => updateRow(index, { payment_date: e.target.value })}
                                            />
                                        )}
                                    </DataGridCell>

                                    {/* AMOUNT */}
                                    <DataGridCell>
                                        {isExisting ? (
                                            <span className="text-sm font-bold text-primary">
                                                ₹ {p.paid_amount}
                                            </span>
                                        ) : (
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20 font-semibold"
                                                    value={p.paid_amount}
                                                    onChange={(e) => updateRow(index, { paid_amount: normalizeTextInput(e.target.value) })}
                                                />
                                            </div>
                                        )}
                                    </DataGridCell>

                                    {/* METHOD */}
                                    <DataGridCell>
                                        {isExisting ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                                                {p.payment_method}
                                            </span>
                                        ) : (
                                            <NativeSelect
                                                className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20"
                                                value={p.payment_method}
                                                onChange={(e) => updateRow(index, { 
                                                    payment_method: e.target.value,
                                                    bank_name: e.target.value === "Bank" ? p.bank_name : "",
                                                    transaction_id: e.target.value === "Cash" ? "" : p.transaction_id
                                                })}
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="UPI">UPI</option>
                                                <option value="Card">Card</option>
                                                <option value="Bank">Bank</option>
                                            </NativeSelect>
                                        )}
                                    </DataGridCell>

                                    {/* TYPE */}
                                    <DataGridCell>
                                        {isExisting ? (
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {p.payment_type}
                                            </span>
                                        ) : (
                                            <NativeSelect
                                                className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20"
                                                value={p.payment_type}
                                                onChange={(e) => updateRow(index, { payment_type: e.target.value })}
                                            >
                                                <option value="Advance">Advance</option>
                                                <option value="Partial">Partial</option>
                                                <option value="Final">Final</option>
                                            </NativeSelect>
                                        )}
                                    </DataGridCell>

                                    {/* DETAILS / COMMENTS */}
                                    <DataGridCell>
                                        {isExisting ? (
                                            <div className="space-y-1">
                                                {p.comments && <p className="text-xs text-foreground/80">{p.comments}</p>}
                                                {p.transaction_id && (
                                                    <p className="text-[10px] text-muted-foreground font-mono bg-muted/20 px-1.5 py-0.5 rounded inline-block">
                                                        TXN: {p.transaction_id}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2 py-1">
                                                <Input
                                                    placeholder="Comments..."
                                                    className="h-8 text-[11px] bg-background border-border/20"
                                                    value={p.comments}
                                                    onChange={(e) => updateRow(index, { comments: e.target.value })}
                                                />
                                                {(p.payment_method !== "Cash") && (
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="TXN ID"
                                                            className="h-7 text-[10px] bg-muted/20 border-dashed"
                                                            value={p.transaction_id}
                                                            onChange={(e) => updateRow(index, { transaction_id: e.target.value })}
                                                        />
                                                        {p.payment_method === "Bank" && (
                                                            <NativeSelect
                                                                className="h-7 text-[10px] bg-muted/20 border-dashed py-0"
                                                                value={p.bank_name}
                                                                onChange={(e) => updateRow(index, { bank_name: e.target.value })}
                                                            >
                                                                <option value="">Select Bank</option>
                                                                {banks?.map((b: any, i: number) => (
                                                                    <option key={i} value={b.bank_name}>{b.bank_name}</option>
                                                                ))}
                                                            </NativeSelect>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </DataGridCell>

                                    {/* ACTION */}
                                    {payments.filter(x => !x.id).length > 1 && (
                                        <DataGridCell className="text-center">
                                            {!isExisting && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50/50"
                                                    onClick={() => removeRow(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </DataGridCell>
                                    )}
                                </DataGridRow>
                            );
                        })}
                    </tbody>
                </DataGrid>

                <div className="bg-muted/5 p-3 border-t border-border/20">
                    <button
                        type="button"
                        onClick={addRow}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 transition-all"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        Add New Payment
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <Button
                    variant="heroOutline"
                    className="min-w-[92px]"
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <Button
                    variant="hero"
                    className="min-w-[132px]"
                    onClick={handleSave}
                    disabled={isSaving || payments.filter(p => !p.id && Number(p.paid_amount) > 0).length === 0}
                >
                    Save Payments
                </Button>
            </div>
        </div>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={className}
        >
            <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
            />
        </svg>
    );
}
