import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

type Payment = {
    id: string;
    booking_id: string;
    property_id: string;
    payment_date: string;
    paid_amount: string;
    payment_method: string;
    payment_type: string;
    payment_status: string;
    is_active: boolean;
    created_on: string;
    bank_name?: string;
    transaction_id?: string;
    comments?: string;
    created_by_name?: string;
};

type CreatePaymentPayload = {
    booking_id: string;
    property_id: string;
    payment_date: string;
    paid_amount: number;
    payment_method: string;
    payment_type: string;
    bank_name?: string;
    transaction_id?: string;
    comments?: string;
};

type Props = {
    bookingId: string;
    propertyId: string;
};

function formatDate(date?: string) {
    if (!date) return "—";
    return formatAppDateTime(date);
}

const getNowForDatetimeLocal = () => {
    return toDatetimeLocalValue(new Date());
};

export default function PaymentsEmbedded({
    bookingId,
    propertyId,
}: Props) {
    const [open, setOpen] = useState(false);
    const [paymentDate, setPaymentDate] = useState(getNowForDatetimeLocal());
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("Cash");
    const [type, setType] = useState("Advance");
    const [transactionId, setTransactionId] = useState("");
    const [bankName, setBankName] = useState("");
    const [comments, setComments] = useState("");

    const isLoggedIn = useAppSelector((state) => state.isLoggedIn.value);

    const buildPaymentPayload = (): CreatePaymentPayload => {
        return {
            booking_id: bookingId,
            property_id: propertyId,
            payment_date: paymentDate,
            paid_amount: Number(amount),
            payment_method: method,
            payment_type: type,
            bank_name: bankName,
            comments,
            transaction_id: transactionId,
        };
    };

    const { data: payments, isLoading: paymentsLoading } =
        useGetPaymentsByBookingIdQuery(
            { bookingId },
            {
                skip: !bookingId || !isLoggedIn,
            },
        );

    const { data: banks } = useGetPropertyBanksQuery(propertyId, {
        skip: !isLoggedIn || !propertyId,
    });

    const [createPayment] = useCreatePaymentMutation();

    const handleCreatePayment = async () => {
        const payload = buildPaymentPayload();
        const promise = createPayment({ payload }).unwrap();

        await toast.promise(promise, {
            pending: "Creating payment please wait...",
            success: "Payment successfully saved",
            error: "Error creating payments",
        });

        setOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-[2rem] font-semibold tracking-tight text-foreground">
                        Payments
                    </h3>
                    <p className="text-[1rem] text-slate-500">
                        Payment history for this booking
                    </p>
                </div>

                <Button
                    variant="hero"
                    size="sm"
                    className="h-12 rounded-xl px-6 text-base font-semibold shadow-md"
                    onClick={() => setOpen(true)}
                >
                    + Add Payment
                </Button>
            </div>

            {!paymentsLoading && payments?.data.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                    No payments recorded
                </div>
            )}

            <div className="space-y-5">
                {!paymentsLoading &&
                    payments?.data?.map((payment: Payment) => (
                        <div
                            key={payment.id}
                            className="rounded-2xl border border-sky-200/80 bg-white p-7 shadow-sm"
                        >
                            <div className="mb-7 flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-[2rem] font-semibold leading-none tracking-tight text-foreground">
                                        ₹ {payment.paid_amount}
                                    </p>
                                    <p className="text-[1rem] text-slate-500">
                                        {formatDate(payment.payment_date)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
                                <Info label="Method" value={payment.payment_method} />
                                {payment.transaction_id && (
                                    <Info
                                        label="Transaction Id"
                                        value={`#${payment.transaction_id}`}
                                    />
                                )}
                                <Info
                                    label="Created On"
                                    value={formatDate(payment.created_on)}
                                />
                                <Info
                                    label="Created By"
                                    value={payment.created_by_name}
                                />
                                {payment.bank_name && (
                                    <Info label="Bank" value={payment.bank_name} />
                                )}
                                <Info
                                    label="Comments"
                                    value={payment.comments ?? "--"}
                                    expandable={(payment.comments?.length ?? 0) > 30}
                                />
                            </div>
                        </div>
                    ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                    </DialogHeader>

                    <div className="mt-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Payment Date</Label>
                                <Input
                                    readOnly
                                    className="bg-background"
                                    value={formatAppDateTime(paymentDate)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Amount</Label>
                                <Input
                                    className="bg-background"
                                    type="number"
                                    value={amount}
                                    min={0}
                                    onChange={(e) =>
                                        setAmount(normalizeTextInput(e.target.value))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Method</Label>
                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm bg-background"
                                    value={method}
                                    onChange={(e) => {
                                        setMethod(e.target.value);
                                        if (e.target.value === "Cash") {
                                            setBankName("");
                                            setTransactionId("");
                                        }
                                    }}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank">Bank</option>
                                </NativeSelect>
                            </div>
                            <div className="space-y-1">
                                <Label>Type</Label>
                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] border px-3 text-sm bg-background"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="Advance">Advance</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Final">Final</option>
                                </NativeSelect>
                            </div>

                            {method !== "Cash" && (
                                <div className="space-y-1">
                                    <Label>Transaction Id</Label>
                                    <Input
                                        className="bg-background"
                                        type="text"
                                        value={transactionId}
                                        onChange={(e) =>
                                            setTransactionId(
                                                normalizeTextInput(e.target.value),
                                            )
                                        }
                                    />
                                </div>
                            )}

                            {method === "Bank" && (
                                <div className="space-y-1">
                                    <Label>Bank Account</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border px-3 text-sm bg-background"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                    >
                                        <option value="">-- Please Select --</option>
                                        {banks?.map((bank, index) => (
                                            <option value={bank.bank_name} key={index}>
                                                {bank.bank_name}
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label>Comments</Label>
                            <textarea
                                className="w-full min-h-[50px] rounded-[3px] border px-3 py-2 text-sm bg-background"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 border-t pt-3">
                            <Button variant="heroOutline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={handleCreatePayment}
                                disabled={!amount || Number(amount) === 0}
                            >
                                Add Payment
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Info({
    label,
    value,
    expandable = false,
}: {
    label: string;
    value: any;
    expandable?: boolean;
}) {
    const [open, setOpen] = useState(false);

    if (!value) {
        return (
            <div className="space-y-1">
                <p className="text-[0.95rem] font-medium text-slate-500">{label}</p>
                <p className="text-[1.1rem] font-medium text-slate-700">—</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-1">
                <p className="text-[0.95rem] font-medium text-slate-500">{label}</p>

                <p
                    className={`text-[1.1rem] font-medium leading-8 break-words text-slate-700 ${
                        expandable ? "line-clamp-2 cursor-pointer text-primary" : ""
                    }`}
                    title={!expandable ? value : undefined}
                    onClick={() => expandable && setOpen(true)}
                >
                    {value}
                </p>

                {expandable && (
                    <span
                        className="cursor-pointer text-sm font-medium text-primary"
                        onClick={() => setOpen(true)}
                    >
                        View full
                    </span>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{label}</DialogTitle>
                    </DialogHeader>

                    <div className="whitespace-pre-wrap break-words text-sm">
                        {value}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
