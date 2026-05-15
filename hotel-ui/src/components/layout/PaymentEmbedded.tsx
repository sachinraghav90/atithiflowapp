import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
    useCreatePaymentMutation,
    useGetPaymentsByBookingIdQuery,
    useGetPropertyBanksQuery,
    useUpdatePaymentMutation,
} from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { toast } from "react-toastify";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { formatAppDateTime, toDatetimeLocalValue } from "@/utils/dateFormat";
import { DataGrid, DataGridHeader, DataGridHead, DataGridRow, DataGridCell } from "../ui/data-grid";
import { Trash2, PlusCircle, Pencil, Check } from "lucide-react";

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

function createEmptyPayment(): Payment {
    return {
        ...EMPTY_PAYMENT,
        payment_date: toDatetimeLocalValue(new Date()),
    };
}

function clonePayments(payments: Payment[]) {
    return JSON.parse(JSON.stringify(payments)) as Payment[];
}

function withDefaultDraftPayment(payments: Payment[]) {
    return [...clonePayments(payments), createEmptyPayment()];
}

function toPaymentDateInput(value: string | undefined) {
    if (!value) return toDatetimeLocalValue(new Date());

    const parsed = new Date(value);
    return toDatetimeLocalValue(parsed) || value;
}

export default function PaymentsEmbedded({
    bookingId,
    propertyId,
}: Props) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [originalPayments, setOriginalPayments] = useState<Payment[]>([]);
    const [editingRowIds, setEditingRowIds] = useState<string[]>([]);

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
    const [updatePayment, { isLoading: isUpdating }] = useUpdatePaymentMutation();

    useEffect(() => {
        if (!data?.data) return;
        const fetched = data.data.map((p: any) => ({
            ...p,
            payment_date: toPaymentDateInput(p.payment_date),
            paid_amount: String(p.paid_amount)
        }));

        setPayments(withDefaultDraftPayment(fetched));
        setOriginalPayments(fetched);
        setEditingRowIds([]);
    }, [data]);

    const addRow = () => {
        setPayments((prev) => [...prev, createEmptyPayment()]);
    };

    const removeRow = (index: number) => {
        setPayments((prev) => {
            const draftCount = prev.filter((payment) => !payment.id).length;
            if (prev[index]?.id || draftCount <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const updateRow = (index: number, patch: Partial<Payment>) => {
        setPayments((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
        );
    };

    const toggleEditRow = (id: string) => {
        setEditingRowIds((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    const isRowEditable = (payment: Payment) => {
        return !payment.id || editingRowIds.includes(payment.id);
    };

    const handleCancel = () => {
        setPayments(withDefaultDraftPayment(originalPayments));
        setEditingRowIds([]);
    };

    const buildPaymentPayload = (payment: Payment) => ({
        payment_date: payment.payment_date,
        paid_amount: Number(payment.paid_amount),
        payment_method: payment.payment_method,
        payment_type: payment.payment_type,
        bank_name: payment.bank_name ?? "",
        transaction_id: payment.transaction_id ?? "",
        comments: payment.comments ?? ""
    });

    const isExistingPaymentChanged = (payment: Payment) => {
        if (!payment.id) return false;

        const original = originalPayments.find((item) => item.id === payment.id);
        if (!original) return true;

        const currentPayload = buildPaymentPayload(payment);
        const originalPayload = buildPaymentPayload(original);

        return Object.keys(currentPayload).some((key) => {
            const field = key as keyof typeof currentPayload;
            return String(currentPayload[field] ?? "") !== String(originalPayload[field] ?? "");
        });
    };

    const draftPaymentCount = payments.filter((payment) => !payment.id).length;
    const hasExistingPayments = payments.some((payment) => !!payment.id);
    const showPaymentActions = hasExistingPayments || draftPaymentCount > 1;
    const newPaymentsToSave = payments.filter(p => !p.id && Number(p.paid_amount) > 0);
    const existingPaymentsToSave = payments.filter(isExistingPaymentChanged);
    const hasSavablePaymentChanges = newPaymentsToSave.length > 0 || existingPaymentsToSave.length > 0;

    const handleSave = async () => {
        if (!hasSavablePaymentChanges) {
            toast.info("No payment changes to save");
            return;
        }

        try {
            for (const p of existingPaymentsToSave) {
                await updatePayment({
                    paymentId: p.id!,
                    payload: buildPaymentPayload(p),
                }).unwrap();
            }

            for (const p of newPaymentsToSave) {
                const payload = {
                    booking_id: bookingId,
                    property_id: propertyId,
                    ...buildPaymentPayload(p),
                };
                await createPayment({ payload }).unwrap();
            }
            toast.success("Payments saved successfully");
            setEditingRowIds([]);
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
                <p className="mb-3 text-[12px] font-bold text-primary">Payments</p>
                <p className="text-[11px] text-muted-foreground/80">
                    Manage payment entries for this booking
                </p>
            </div>

            <div className="editable-grid-compact grid-header-inside-table border-2 border-primary/50 rounded-[5px] overflow-hidden flex flex-col shadow-sm">
                <div className="grid-scroll-x w-full bg-background">
                    <div className="w-full min-w-[900px]">
                        <DataGrid>
                            <DataGridHeader>
                                <DataGridHead className="w-[180px] border-r border-slate-200/20">Date</DataGridHead>
                                <DataGridHead className="w-[140px] border-r border-slate-200/20">Amount</DataGridHead>
                                <DataGridHead className="w-[130px] border-r border-slate-200/20">Method</DataGridHead>
                                <DataGridHead className="w-[130px] border-r border-slate-200/20">Type</DataGridHead>
                                <DataGridHead className="flex-1 min-w-[200px] border-r border-slate-200/20">Comments / Details</DataGridHead>
                                {showPaymentActions && (
                                    <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                )}
                            </DataGridHeader>

                            <tbody>
                                {payments.map((p, index) => {
                                    const isExisting = !!p.id;
                                    const isEditable = isRowEditable(p);
                                    return (
                                        <DataGridRow key={p.id || `payment-${index}`}>
                                    {/* DATE */}
                                            <DataGridCell className="border-r border-slate-200/40">
                                                {isEditable ? (
                                                    <Input
                                                        type="datetime-local"
                                                        className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20"
                                                        value={p.payment_date}
                                                        onChange={(e) => updateRow(index, { payment_date: e.target.value })}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {formatAppDateTime(p.payment_date)}
                                                    </span>
                                                )}
                                            </DataGridCell>

                                    {/* AMOUNT */}
                                            <DataGridCell className="border-r border-slate-200/40">
                                                {isEditable ? (
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20 font-semibold"
                                                            value={p.paid_amount ?? ""}
                                                            onChange={(e) => updateRow(index, { paid_amount: normalizeTextInput(e.target.value) })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-bold text-primary">
                                                        ₹ {p.paid_amount}
                                                    </span>
                                                )}
                                            </DataGridCell>

                                    {/* METHOD */}
                                            <DataGridCell className="border-r border-slate-200/40">
                                                {isEditable ? (
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
                                                ) : (
                                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                                                        {p.payment_method}
                                                    </span>
                                                )}
                                            </DataGridCell>

                                    {/* TYPE */}
                                            <DataGridCell className="border-r border-slate-200/40">
                                                {isEditable ? (
                                                    <NativeSelect
                                                        className="h-9 text-sm bg-background border-border/40 focus-visible:ring-primary/20"
                                                        value={p.payment_type}
                                                        onChange={(e) => updateRow(index, { payment_type: e.target.value })}
                                                    >
                                                        <option value="Advance">Advance</option>
                                                        <option value="Partial">Partial</option>
                                                        <option value="Final">Final</option>
                                                    </NativeSelect>
                                                ) : (
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {p.payment_type}
                                                    </span>
                                                )}
                                            </DataGridCell>

                                    {/* DETAILS / COMMENTS */}
                                            <DataGridCell className="border-r border-slate-200/40">
                                                {isEditable ? (
                                                    <div className="space-y-2 py-1">
                                                        <Input
                                                            placeholder="Comments..."
                                                            className="h-8 text-[11px] bg-background border-border/20"
                                                            value={p.comments ?? ""}
                                                            onChange={(e) => updateRow(index, { comments: e.target.value })}
                                                        />
                                                        {(p.payment_method !== "Cash") && (
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    placeholder="TXN ID"
                                                                    className="h-7 text-[10px] bg-muted/20 border-dashed"
                                                                    value={p.transaction_id ?? ""}
                                                                    onChange={(e) => updateRow(index, { transaction_id: e.target.value })}
                                                                />
                                                                {p.payment_method === "Bank" && (
                                                                    <NativeSelect
                                                                        className="h-7 text-[10px] bg-muted/20 border-dashed py-0"
                                                                        value={p.bank_name ?? ""}
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
                                                ) : (
                                                    <div className="space-y-1">
                                                        {p.comments && <p className="text-xs text-foreground/80">{p.comments}</p>}
                                                        {p.transaction_id && (
                                                            <p className="text-[10px] text-muted-foreground font-mono bg-muted/20 px-1.5 py-0.5 rounded inline-block">
                                                                TXN: {p.transaction_id}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </DataGridCell>

                                    {/* ACTION */}
                                            {showPaymentActions && (
                                                <DataGridCell className="text-center">
                                                    {isExisting ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-primary hover:text-primary/80 transition-colors"
                                                            onClick={() => toggleEditRow(p.id!)}
                                                            aria-label={isEditable ? "Stop editing payment row" : "Edit payment row"}
                                                        >
                                                            {isEditable ? (
                                                                <Check className="h-4 w-4" />
                                                            ) : (
                                                                <Pencil className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    ) : draftPaymentCount > 1 ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors"
                                                            onClick={() => removeRow(index)}
                                                            aria-label="Remove payment row"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        null
                                                    )}
                                                </DataGridCell>
                                            )}
                                </DataGridRow>
                            );
                        })}
                    </tbody>
                </DataGrid>

                        {/* ADD BUTTON FOOTER */}
                        <div className="editable-grid-footer p-3 bg-background border-t border-border flex items-center">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors px-1"
                                onClick={addRow}
                            >
                                <PlusCircle className="h-4 w-4" />
                                Add New Payment
                            </button>
                        </div>
                    </div>
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
                    disabled={isSaving || isUpdating || !hasSavablePaymentChanges}
                >
                    Save Payments
                </Button>
            </div>
        </div>
    );
}


