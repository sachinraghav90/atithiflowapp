import { Button } from "@/components/ui/button";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
        <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                <div className="space-y-6">
                    <SheetHeader>
                        <SheetTitle>{editMode ? "Edit order" : "Order summary"}</SheetTitle>
                    </SheetHeader>

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
                    <div className="space-y-6">

                        {/* ================= ORDER SUMMARY ================= */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {editMode && (
                                <div className="space-y-2">
                                    <Label>Order Status</Label>

                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3"
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
                                <div className="space-y-2">
                                    <Label>Payment Status</Label>

                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3"
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
                        <AppDataGrid
                            scrollable={false}
                            density="compact"
                            columns={[
                                {
                                    label: "Item",
                                    cellClassName: "font-medium min-w-[220px]",
                                    render: (item: any) => (
                                        <>
                                            <p>{item.item_name}</p>
                                            {item.notes && (
                                                <p className="text-xs font-normal text-muted-foreground">
                                                    Note: {item.notes}
                                                </p>
                                            )}
                                        </>
                                    ),
                                },
                                {
                                    label: "Qty",
                                    headClassName: "text-center",
                                    cellClassName: "text-center min-w-[80px]",
                                    render: (item: any) => item.quantity,
                                },
                                {
                                    label: "Price",
                                    headClassName: "text-right",
                                    cellClassName: "text-right min-w-[110px]",
                                    render: (item: any) => `₹${item.unit_price}`,
                                },
                                {
                                    label: "Total",
                                    headClassName: "text-right",
                                    cellClassName: "text-right font-medium min-w-[110px]",
                                    render: (item: any) => `₹${item.item_total}`,
                                },
                            ] as ColumnDef[]}
                            data={data.items ?? []}
                            rowKey={(item: any, index) => item.id ?? index}
                            minWidth="560px"
                            className="mt-0"
                        />

                        {/* ================= TOTAL ================= */}
                        <div className="flex justify-end text-lg font-semibold">
                            Total: ₹{data.total_amount}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={onClose}
                            >
                                {editMode ? "Cancel" : "Close"}
                            </Button>

                            {editMode && (
                                <Button
                                    variant="hero"
                                    onClick={handleSave}
                                >
                                    Save Changes
                                </Button>
                            )}
                        </div>

                    </div>
                )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

/* small helper */
function Info({ label, value }: { label: string; value: any }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <p className="h-10 w-full rounded-[3px] bg-background px-3 flex items-center text-sm text-foreground cursor-default select-text">
                {value}
            </p>
        </div>
    );
}

