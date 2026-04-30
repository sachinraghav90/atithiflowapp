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
import { formatAppDateTime } from "@/utils/dateFormat";
import { ShoppingCart, Pencil, User, Phone, MapPin, UtensilsCrossed, Truck, Calendar, CreditCard, ClipboardList, Info as InfoIcon, Hash, Plus, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { GridBadge } from "@/components/ui/grid-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";


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
    const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

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
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <SheetHeader className="border-b border-border/50 pb-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                {editMode ? <Pencil className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                            </div>
                            <div className="space-y-0.5">
                                <SheetTitle className="text-xl font-bold text-foreground">
                                    {editMode ? "Update Order" : "Order Summary"}
                                    {data?.id && <span className="ml-2 text-primary font-semibold">[#{formatOrderDisplayId(data.id)}]</span>}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    {editMode 
                                        ? `Update order status and payment details for #${formatOrderDisplayId(data?.id || "")}.` 
                                        : `View complete order information and items for #${formatOrderDisplayId(data?.id || "")}.`}
                                </p>
                            </div>
                        </div>
                    </SheetHeader>
                {isLoading && (
                    <div className="space-y-4 w-full animate-pulse px-1">
                        <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-accent/50 shadow-sm">
                            <div className="h-14 w-14 rounded-full bg-muted-foreground/10"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-40 bg-muted-foreground/20 rounded"></div>
                                <div className="h-3 w-24 bg-muted-foreground/10 rounded"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-20 bg-accent/50 rounded-xl border border-border"></div>
                            ))}
                        </div>
                        <div className="h-64 bg-accent/30 rounded-xl border border-border border-dashed flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                    </div>
                )}

                {data && (
                    <div className="space-y-4">

                        {/* ================= HIGHLIGHT CARD ================= */}
                        <div className="flex items-center gap-4 p-[14px] rounded-xl border border-primary/10 bg-accent shadow-sm">
                            <div className="h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner shrink-0">
                                <User className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-foreground leading-tight">{data.guest_name || "Guest Order"}</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                    {data.order_type || "Restaurant"} • {formatOrderDisplayId(data.id)}
                                </p>
                            </div>
                            <div className="ml-auto flex flex-col gap-2 items-end">
                                <div className="flex gap-2">
                                    <GridBadge status={data.order_status} statusType="order" className="h-7 px-3 text-[10px] font-bold">
                                        {data.order_status}
                                    </GridBadge>
                                    <GridBadge status={data.payment_status} statusType="payment" className="h-7 px-3 text-[10px] font-bold">
                                        {data.payment_status}
                                    </GridBadge>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest px-1">
                                    {formatAppDateTime(data.order_date)}
                                </p>
                            </div>
                        </div>

                        {/* ================= INFORMATION GRID ================= */}
                        {!editMode ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="grid grid-cols-1 gap-3 col-span-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoItem icon={<Phone className="w-3.5 h-3.5" />} label="Mobile Number" value={data.guest_mobile} />
                                        <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label="Expected Delivery" value={data.expected_delivery_time ? formatAppDateTime(data.expected_delivery_time) : "—"} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <InfoItem icon={<UtensilsCrossed className="w-3.5 h-3.5" />} label="Table" value={data.table_no} />
                                        <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="Room" value={data.room_no} />
                                        <InfoItem icon={<Truck className="w-3.5 h-3.5" />} label="Delivery Partner" value={data.delivery_partner_name} />
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 shadow-sm flex flex-col justify-center items-center text-center space-y-1.5">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Total</Label>
                                    <p className="text-2xl font-black text-primary">₹{Number(data.total_amount).toFixed(2)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <InfoIcon className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Order Information (Read Only)</h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-px bg-primary/10 border border-primary/10 rounded-xl overflow-hidden bg-accent">
                                        <InfoItem icon={<User className="w-3.5 h-3.5" />} label="Guest" value={data.guest_name} />
                                        <InfoItem icon={<Phone className="w-3.5 h-3.5" />} label="Mobile Number" value={data.guest_mobile} />
                                        <InfoItem icon={<ClipboardList className="w-3.5 h-3.5" />} label="Order Type" value={data.order_type} />
                                        <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="Room" value={data.room_no} />
                                        <InfoItem icon={<UtensilsCrossed className="w-3.5 h-3.5" />} label="Table" value={data.table_no} />
                                        <InfoItem icon={<Truck className="w-3.5 h-3.5" />} label="Delivery Partner" value={data.delivery_partner_name} />
                                    </div>
                                    <div className="p-3 flex items-center gap-3 bg-accent border border-primary/10 rounded-xl">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expected Delivery</Label>
                                            <p className="text-sm font-semibold text-foreground">{data.expected_delivery_time ? formatAppDateTime(data.expected_delivery_time) : "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center gap-2 px-1">
                                        <Pencil className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Update Status</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-accent p-4 rounded-xl border border-primary/10 shadow-sm">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Status *</Label>
                                            <NativeSelect
                                                className="w-full h-11 border border-primary/20 bg-background rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-none"
                                                value={draftOrderStatus}
                                                onChange={(e) => setDraftOrderStatus(e.target.value)}
                                            >
                                                {ORDER_STATUSES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </NativeSelect>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Status *</Label>
                                            <NativeSelect
                                                className="w-full h-11 border border-primary/20 bg-background rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-none"
                                                value={draftPaymentStatus}
                                                onChange={(e) => setDraftPaymentStatus(e.target.value)}
                                            >
                                                {PAYMENT_STATUSES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </NativeSelect>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ================= ITEMS SECTION ================= */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <ClipboardList className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Items Ordered</h4>
                            </div>
                            <div className="border border-primary/10 rounded-xl overflow-hidden bg-accent shadow-sm">
                                <AppDataGrid
                                    scrollable={false}
                                    columns={[
                                        {
                                            label: "Item",
                                            headClassName: "bg-primary/5 text-[10px] font-bold uppercase tracking-widest py-3",
                                            cellClassName: "py-3 px-2 font-medium min-w-[360px]",
                                            render: (item: any) => (
                                                <div className="flex items-center gap-4">
                                                    <div 
                                                        className="h-16 w-16 rounded-lg overflow-hidden border border-primary/10 bg-background shrink-0 shadow-sm cursor-zoom-in group relative"
                                                        onClick={() => setPreviewImage({ 
                                                            url: `${import.meta.env.VITE_API_URL}/menu/${item.menu_item_id}/image`,
                                                            name: item.item_name 
                                                        })}
                                                    >
                                                        <img 
                                                            src={`${import.meta.env.VITE_API_URL}/menu/${item.menu_item_id}/image`}
                                                            alt={item.item_name}
                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                            onError={(e) => { e.currentTarget.src = "https://placehold.co/150x150?text=Food"; }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <Plus className="w-4 h-4 text-white drop-shadow-md" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-bold text-foreground">{item.item_name}</p>
                                                        {item.notes && (
                                                            <p className="text-[10px] font-normal text-muted-foreground italic flex items-center gap-1">
                                                                <InfoIcon className="w-3 h-3" />
                                                                Note: {item.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        },
                                        {
                                            label: "Qty",
                                            headClassName: "bg-primary/5 text-[10px] font-bold uppercase tracking-widest py-3 text-center",
                                            cellClassName: "py-3 px-2 text-center min-w-[50px] font-semibold text-primary",
                                            render: (item: any) => item.quantity,
                                        },
                                        {
                                            label: "Price",
                                            headClassName: "bg-primary/5 text-[10px] font-bold uppercase tracking-widest py-3 text-right",
                                            cellClassName: "py-3 px-2 text-right min-w-[80px] text-muted-foreground",
                                            render: (item: any) => `₹${Number(item.unit_price).toFixed(2)}`,
                                        },
                                        {
                                            label: "Total",
                                            headClassName: "bg-primary/5 text-[10px] font-bold uppercase tracking-widest py-3 text-right",
                                            cellClassName: "py-3 px-2 text-right font-bold min-w-[80px] text-foreground",
                                            render: (item: any) => `₹${Number(item.item_total).toFixed(2)}`,
                                        },
                                    ] as ColumnDef[]}
                                    data={data.items ?? []}
                                    rowKey={(item: any, index) => item.id ?? index}
                                    minWidth="560px"
                                    className="mt-0 border-none bg-accent"
                                    headerClassName="bg-transparent border-b border-primary/10"
                                />
                                <div className="p-3 flex items-center justify-between bg-primary/5 border-t border-primary/10">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Grand Total</span>
                                    <span className="text-xl font-bold text-primary">₹{Number(data.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-border">
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
                </motion.div>
            </SheetContent>

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-[90vw] lg:max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <DialogHeader className="hidden">
                        <DialogTitle>Item Image Preview</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20 backdrop-blur-md">
                        <img
                            src={previewImage?.url || ""}
                            alt={previewImage?.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/800x450?text=Preview+Unavailable"; }}
                        />
                        <div className="absolute top-4 left-4">
                            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                <p className="text-white text-xs font-bold uppercase tracking-widest">{previewImage?.name}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}

/* small helper */
function InfoItem({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: any; className?: string }) {
    return (
        <div className={cn("p-3 flex items-start gap-3 bg-accent", className)}>
            <div className="mt-0.5 h-7 w-7 rounded-lg bg-background flex items-center justify-center text-slate-500 border border-primary/5">
                {icon}
            </div>
            <div className="space-y-0.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</Label>
                <p className="text-sm font-semibold text-foreground">
                    {value || "—"}
                </p>
            </div>
        </div>
    );
}
