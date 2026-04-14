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
import { useState } from "react";

const ORDER_STATUSES = ["New", "Preparing", "Ready", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

type Props = {
    orderId: string | null;
    open: boolean;
    onClose: () => void;
};

export function OrderItemsModal({ orderId, open, onClose }: Props) {
    const [editMode, setEditMode] = useState(false);

    const { data, isLoading } = useGetOrderByIdQuery(orderId, {
        skip: !orderId || !open
    });

    const [updateOrderStatus] = useUpdateOrderStatusMutation();
    const [updateOrderPayment] = useUpdateOrderPaymentMutation();

    const handleOrderStatusUpdate = (status: string) => {
        if (!data) return;

        const promise = updateOrderStatus({
            id: data.id,
            payload: { status }
        }).unwrap();

        toast.promise(promise, {
            pending: "Updating...",
            success: "Order updated",
            error: "Update failed"
        });
    };

    const handlePaymentStatusUpdate = (status: string) => {
        if (!data) return;

        const promise = updateOrderPayment({
            id: data.id,
            payload: { status }
        }).unwrap();

        toast.promise(promise, {
            pending: "Updating...",
            success: "Payment updated",
            error: "Update failed"
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle>Order Details</DialogTitle>

                        {!editMode ? (
                            <Button
                                className="mx-3"
                                size="sm"
                                variant="heroOutline"
                                onClick={() => setEditMode(true)}
                            >
                                Edit
                            </Button>
                        ) : (
                            <Button
                                className="mx-3"
                                size="sm"
                                variant="heroOutline"
                                onClick={() => setEditMode(false)}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {isLoading && (
                    <div className="space-y-4 w-full animate-pulse">
                        {/* Skeleton Order Summary */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-[5px] w-full">
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
                        <div className="border border-border rounded-lg overflow-hidden space-y-2 p-4">
                            <div className="h-8 w-full bg-muted-foreground/20 rounded-[3px]"></div>
                            <div className="h-8 w-full bg-muted-foreground/10 rounded-[3px]"></div>
                            <div className="h-8 w-full bg-muted-foreground/10 rounded-[3px]"></div>
                        </div>
                    </div>
                )}

                {data && (
                    <div className="space-y-4">

                        {/* ================= ORDER SUMMARY ================= */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-lg">

                            <Info label="Order ID" value={`#${data.id}`} />
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
                                        value={data.order_status}
                                        onChange={(e) =>
                                            handleOrderStatusUpdate(e.target.value)
                                        }
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
                                        value={data.payment_status}
                                        onChange={(e) =>
                                            handlePaymentStatusUpdate(e.target.value)
                                        }
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
                                <thead className="bg-muted">
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

