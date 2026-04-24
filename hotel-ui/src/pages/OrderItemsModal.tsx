import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    useGetOrderByIdQuery,
    useUpdateOrderPaymentMutation,
    useUpdateOrderStatusMutation
} from "@/redux/services/hmsApi";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

const ORDER_STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

const formatOrderDisplayId = (orderId: string | number) =>
    formatModuleDisplayId("order", orderId);

type Props = {
    orderId: string | null;
    open: boolean;
    onClose: () => void;
    defaultEditMode?: boolean;
};

export function OrderItemsModal({
    orderId,
    open,
    onClose,
    defaultEditMode = false,
}: Props) {
    const [editMode, setEditMode] = useState(false);
    const [draftOrderStatus, setDraftOrderStatus] = useState("");
    const [draftPaymentStatus, setDraftPaymentStatus] = useState("");

    useEffect(() => {
        if (open) {
            setEditMode(defaultEditMode);
            return;
        }

        setEditMode(false);
    }, [defaultEditMode, open, orderId]);

    const { data, isLoading } = useGetOrderByIdQuery(orderId, {
        skip: !orderId || !open
    });

    const [updateOrderStatus] = useUpdateOrderStatusMutation();
    const [updateOrderPayment] = useUpdateOrderPaymentMutation();

    useEffect(() => {
        if (!data) return;

        setDraftOrderStatus(data.order_status || "");
        setDraftPaymentStatus(data.payment_status || "");
    }, [data]);

    const handleSave = async () => {
        if (!data) return;

        const shouldUpdateOrderStatus =
            draftOrderStatus &&
            draftOrderStatus !== data.order_status;

        const shouldUpdatePaymentStatus =
            draftPaymentStatus &&
            draftPaymentStatus !== data.payment_status;

        if (!shouldUpdateOrderStatus && !shouldUpdatePaymentStatus) {
            setEditMode(false);
            return;
        }

        const updates: Promise<unknown>[] = [];

        if (shouldUpdateOrderStatus) {
            updates.push(
                updateOrderStatus({
                    id: data.id,
                    payload: { status: draftOrderStatus }
                }).unwrap()
            );
        }

        if (shouldUpdatePaymentStatus) {
            updates.push(
                updateOrderPayment({
                    id: data.id,
                    payload: { status: draftPaymentStatus }
                }).unwrap()
            );
        }

        const promise = Promise.all(updates);

        await toast.promise(promise, {
            pending: "Saving changes...",
            success: "Order updated",
            error: "Save failed"
        });

        setEditMode(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle>Order Details</DialogTitle>
                    </div>
                </DialogHeader>

                {isLoading && (
                    <div className="space-y-4 w-full animate-pulse">
                        {/* Skeleton Order Summary */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-background p-3 rounded-lg border border-border w-full">
                            <div className="space-y-1">
                                <div className="h-3 w-16 bg-muted-foreground/20 rounded"></div>
                                <div className="h-4 w-24 bg-muted-foreground/30 rounded"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-3 w-20 bg-muted-foreground/20 rounded"></div>
                                <div className="h-4 w-32 bg-muted-foreground/30 rounded"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-3 w-12 bg-muted-foreground/20 rounded"></div>
                                <div className="h-4 w-28 bg-muted-foreground/30 rounded"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-3 w-14 bg-muted-foreground/20 rounded"></div>
                                <div className="h-4 w-24 bg-muted-foreground/30 rounded"></div>
                            </div>
                        </div>

                        {/* Skeleton Controls */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="h-3 w-24 bg-muted-foreground/20 rounded"></div>
                                <div className="h-10 w-full bg-muted-foreground/10 rounded-[3px] border border-border"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-muted-foreground/20 rounded"></div>
                                <div className="h-10 w-full bg-muted-foreground/10 rounded-[3px] border border-border"></div>
                            </div>
                        </div>

                        {/* Skeleton Table */}
                        <div className="border border-border rounded-lg overflow-hidden space-y-2 p-4 bg-background">
                            <div className="h-8 w-full bg-muted-foreground/20 rounded-[3px]"></div>
                            <div className="h-8 w-full bg-muted-foreground/10 rounded-[3px]"></div>
                            <div className="h-8 w-full bg-muted-foreground/10 rounded-[3px]"></div>
                        </div>
                    </div>
                )}

                {data && (
                    <div className="space-y-4">

                        {/* ================= ORDER SUMMARY ================= */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-background p-3 rounded-lg border border-border">

                            <Info label="Order ID" value={formatOrderDisplayId(data.id)} />
                            <Info label="Order Type" value={data.order_type || "—"} />

                            <Info label="Guest" value={data.guest_name || "—"} />
                            <Info label="Mobile" value={data.guest_mobile || "—"} />

                            <Info label="Room" value={data.room_no || "—"} />
                            <Info label="Table" value={data.table_no || "—"} />

                            <Info
                                label="Delivery Partner"
                                value={data.delivery_partner_name || "—"}
                            />

                            <Info
                                label="Expected Delivery"
                                value={
                                    data.expected_delivery_time
                                        ? new Date(data.expected_delivery_time).toLocaleString()
                                        : "—"
                                }
                            />
                            {!editMode && <>

                                <Info
                                    label="Order Status"
                                    value={data.order_status || "-"}
                                />
                                <Info
                                    label="Payment Status"
                                    value={data.payment_status || "-"}
                                />
                            </>}
                        </div>

                        {/* ================= STATUS CONTROLS ================= */}
                        <div className="grid grid-cols-2 gap-4">

                            {editMode && (
                                <div>
                                    <Label>Order Status</Label>

                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border px-3"
                                        value={draftOrderStatus}
                                        onChange={(e) => setDraftOrderStatus(e.target.value)}
                                    >
                                        {ORDER_STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            )}

                            {editMode && (
                                <div>
                                    <Label>Payment Status</Label>

                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border px-3"
                                        value={draftPaymentStatus}
                                        onChange={(e) => setDraftPaymentStatus(e.target.value)}
                                    >
                                        {PAYMENT_STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            )}

                        </div>

                        {/* ================= ITEMS TABLE ================= */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-background border-b">
                                    <tr>
                                        <th className="p-2 text-left">Item</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Price</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.items.map((item: any) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="p-2">
                                                <p className="font-medium">
                                                    {item.item_name}
                                                </p>
                                                {item.notes && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Note: {item.notes}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="p-2 text-center">
                                                {item.quantity}
                                            </td>

                                            <td className="p-2 text-right">
                                                ₹{item.unit_price}
                                            </td>

                                            <td className="p-2 text-right font-medium">
                                                ₹{item.item_total}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ================= TOTAL ================= */}
                        <div className="flex justify-end text-lg font-semibold">
                            Total: ₹{data.total_amount}
                        </div>

                        {editMode && (
                            <div className="flex justify-end pt-2">
                                <Button
                                    size="sm"
                                    variant="hero"
                                    onClick={handleSave}
                                >
                                    Save
                                </Button>
                            </div>
                        )}

                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* small helper */
function Info({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <Label>{label}</Label>
            <p>{value}</p>
        </div>
    );
}

