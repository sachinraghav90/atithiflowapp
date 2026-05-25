import { Button } from "@/components/ui/button";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    useGetOrderByIdQuery,
    useGetPropertyByIdQuery,
    useUpdateOrderPaymentMutation,
    useUpdateOrderStatusMutation
} from "@/redux/services/hmsApi";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { formatAppDateTime } from "@/utils/dateFormat";
import { pdf } from "@react-pdf/renderer";
import RestaurantOrderSummaryPDF from "@/components/pdf/RestaurantOrderSummaryPDF";
import { ShoppingCart, Pencil, User, Phone, MapPin, UtensilsCrossed, Truck, Calendar, CreditCard, ClipboardList, Info as InfoIcon, Hash, Plus, Camera, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { GridBadge } from "@/components/ui/grid-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";


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
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    useEffect(() => {
        if (open) {
            setEditMode(defaultEditMode);
            setSheetTab("summary");
            return;
        }

        setEditMode(false);
    }, [defaultEditMode, open, orderId]);

    const { data, isLoading } = useGetOrderByIdQuery(orderId, {
        skip: !orderId || !open
    });
    const { data: propertyDetails } = useGetPropertyByIdQuery(Number(data?.property_id), {
        skip: !data?.property_id
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

    const handleDownloadPDF = async () => {
        if (!data) {
            toast.error("Order data is not ready yet.");
            return;
        }

        const previewTab = window.open("", "_blank");
        if (!previewTab) {
            toast.error("Unable to open PDF preview. Please allow pop-ups.");
            return;
        }

        const displayId = formatModuleDisplayId("order", data.id).replace(/#/g, "").trim();
        const fileName = `Restaurant_Order_Summary_${displayId}.pdf`;

        try {
            const propertyName = propertyDetails?.brand_name || propertyDetails?.name || "AtithiFlow Hotel";
            const blob = await pdf(
                <RestaurantOrderSummaryPDF
                    order={data}
                    propertyName={propertyName}
                />
            ).toBlob();

            const blobUrl = URL.createObjectURL(blob);
            const safeTitle = fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            previewTab.document.write(`
                <!doctype html>
                <html>
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>${safeTitle}</title>
                    <style>
                      html, body { margin: 0; padding: 0; height: 100%; background: #111827; }
                      .toolbar {
                        height: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        padding: 0 12px;
                        background: #0b1220;
                        border-bottom: 1px solid #1f2937;
                        box-sizing: border-box;
                      }
                      .download-link {
                        color: #e5e7eb;
                        text-decoration: none;
                        font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                        background: #1d4ed8;
                        border-radius: 6px;
                        padding: 8px 12px;
                      }
                      .download-link:hover { background: #1e40af; }
                      iframe { border: 0; width: 100%; height: calc(100% - 44px); }
                    </style>
                  </head>
                  <body>
                    <div class="toolbar">
                      <a class="download-link" href="${blobUrl}" download="${safeTitle}">Download PDF</a>
                    </div>
                    <iframe src="${blobUrl}" title="${safeTitle}"></iframe>
                  </body>
                </html>
            `);
            previewTab.document.close();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
        } catch (error) {
            previewTab.close();
            toast.error("Failed to generate PDF.");
        }
    };

    return (
        <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <SheetContent side="right" onOpenAutoFocus={(e) => e.preventDefault()} className="w-full lg:max-w-4xl sm:max-w-3xl overflow-y-auto bg-background outline-none focus:outline-none focus-visible:outline-none">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <SheetHeader className="mb-4">
                        <div className="flex items-end justify-between gap-3">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {editMode ? `Update Restaurant Order [${data?.id ? `#${formatOrderDisplayId(data.id)}` : "..."}]` : `Restaurant Order [${data?.id ? `#${formatOrderDisplayId(data.id)}` : "..."}]`}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wider">
                                    {editMode
                                        ? "Update order status and payment details"
                                        : "Complete order details with list of items"}
                                </p>
                            </div>
                            {!editMode && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="heroOutline"
                                                size="sm"
                                                className="h-9 w-9 p-0 shadow-sm rounded-md mr-12"
                                                onClick={handleDownloadPDF}
                                                disabled={!data}
                                                aria-label="Print PDF"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="center" className="text-xs">
                                            Print PDF
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
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
                    <div className="space-y-6">
                        {/* Sheet Tabs */}
                        <div className="border-b border-border flex">
                            <button
                                onClick={() => setSheetTab("summary")}
                                className={cn(
                                    "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
                                    sheetTab === "summary"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Summary
                            </button>
                            <button
                                onClick={() => setSheetTab("history")}
                                className={cn(
                                    "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
                                    sheetTab === "history"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                History
                            </button>
                        </div>

                        {sheetTab === "summary" && (
                            <div className="space-y-5">
                        {/* ================= INFORMATION GRID ================= */}
                        {!editMode ? (
                            <div className="space-y-4">
                                <PropertyViewSection title="Order Details" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
                                    <ViewField label="Order ID" value={`#${formatOrderDisplayId(data.id)}`} />
                                    <ViewField label="Guest Name" value={data.guest_name || "Guest Order"} />
                                    <ViewField label="Mobile Number" value={data.guest_mobile} />
                                    <ViewField label="Order Type" value={data.order_type || "Restaurant"} />
                                    {data.order_type === "Room Service" && (
                                        <>
                                            <ViewField label="Booking ID" value={formatModuleDisplayId("booking", data.booking_id)} />
                                            <ViewField label="Room" value={data.room_no || "—"} />
                                        </>
                                    )}
                                    {(data.order_type || "Restaurant") === "Restaurant" && (
                                        <ViewField label="Table" value={data.table_no || "—"} />
                                    )}
                                    {data.order_type === "Delivery" && (
                                        <ViewField label="Delivery Partner" value={data.delivery_partner_name || "—"} />
                                    )}
                                    <ViewField label="Expected Delivery" value={data.expected_delivery_time ? formatAppDateTime(data.expected_delivery_time) : "—"} />
                                    <ViewField label="Order Date" value={formatAppDateTime(data.order_date)} />
                                    <ViewField label="Order Total" value={`₹${Number(data.total_amount).toFixed(2)}`} />
                                    {data.notes && (
                                        <ViewField label="Order Notes" value={data.notes} className="sm:col-span-2 lg:col-span-3" />
                                    )}
                                    <div>
                                        <Label className="text-[10px] font-bold text-muted-foreground tracking-widest">Order Status</Label>
                                        <div className="mt-0.5">
                                            <GridBadge status={data.order_status} statusType="order" className="h-6 px-3 text-[10px] font-bold">
                                                {data.order_status}
                                            </GridBadge>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold text-muted-foreground tracking-widest">Payment Status</Label>
                                        <div className="mt-0.5">
                                            <GridBadge status={data.payment_status} statusType="payment" className="h-6 px-3 text-[10px] font-bold">
                                                {data.payment_status}
                                            </GridBadge>
                                        </div>
                                    </div>
                                </PropertyViewSection>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <PropertyViewSection title="Order Details" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
                                    <ViewField label="Order ID" value={`#${formatOrderDisplayId(data.id)}`} />
                                    <ViewField label="Guest Name" value={data.guest_name || "Guest Order"} />
                                    <ViewField label="Mobile Number" value={data.guest_mobile} />
                                    <ViewField label="Order Type" value={data.order_type || "Restaurant"} />
                                    {data.order_type === "Room Service" && (
                                        <>
                                            <ViewField label="Booking ID" value={formatModuleDisplayId("booking", data.booking_id)} />
                                            <ViewField label="Room" value={data.room_no || "—"} />
                                        </>
                                    )}
                                    {(data.order_type || "Restaurant") === "Restaurant" && (
                                        <ViewField label="Table" value={data.table_no || "—"} />
                                    )}
                                    {data.order_type === "Delivery" && (
                                        <ViewField label="Delivery Partner" value={data.delivery_partner_name || "—"} />
                                    )}
                                    <ViewField label="Expected Delivery" value={data.expected_delivery_time ? formatAppDateTime(data.expected_delivery_time) : "—"} />
                                </PropertyViewSection>

                                <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-4">
                                    <h3 className="text-sm font-semibold text-primary/90">
                                        Update Status
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Order Status *</Label>
                                            <NativeSelect
                                                className="w-full h-10 border border-border bg-background rounded-[3px] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-none"
                                                value={draftOrderStatus}
                                                onChange={(e) => setDraftOrderStatus(e.target.value)}
                                            >
                                                {ORDER_STATUSES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </NativeSelect>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Payment Status *</Label>
                                            <NativeSelect
                                                className="w-full h-10 border border-border bg-background rounded-[3px] px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-none"
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
                        <PropertyViewSection title="Items Ordered" className="mt-0">
                            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                <AppDataGrid
                                    density="compact"
                                    scrollable={false}
                                    tableClassName="w-full"
                                    columns={[
                                        {
                                            label: "Item",
                                            headClassName: "w-[280px]",
                                            cellClassName: "font-medium min-w-[280px]",
                                            render: (item: any) => (
                                                <div className="space-y-0.5 py-1">
                                                    <p className="text-sm font-bold text-foreground">{item.item_name}</p>
                                                    {item.notes && (
                                                        <p className="text-[10px] font-normal text-muted-foreground italic flex items-center gap-1">
                                                            <InfoIcon className="w-3 h-3" />
                                                            Note: {item.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            ),
                                        },
                                        {
                                            label: "Qty",
                                            headClassName: "text-center w-[60px]",
                                            cellClassName: "text-center min-w-[60px] font-semibold text-primary",
                                            render: (item: any) => item.quantity,
                                        },
                                        {
                                            label: "Price",
                                            headClassName: "text-right w-[100px]",
                                            cellClassName: "text-right min-w-[100px] text-muted-foreground",
                                            render: (item: any) => `₹${Number(item.unit_price).toFixed(2)}`,
                                        },
                                        {
                                            label: "Total",
                                            headClassName: "text-right w-[100px]",
                                            cellClassName: "text-right font-bold min-w-[100px] text-foreground",
                                            render: (item: any) => `₹${Number(item.item_total).toFixed(2)}`,
                                        },
                                    ] as ColumnDef[]}
                                    data={data.items ?? []}
                                    rowKey={(item: any, index) => item.id ?? index}
                                    minWidth="540px"
                                />
                            </div>
                        </PropertyViewSection>
                            </div>
                        )}

                        {sheetTab === "history" && (
                            <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                <p className="text-sm text-muted-foreground text-center">No history logs available yet.</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-3">
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
                                <p className="text-white text-xs font-bold tracking-widest">{previewImage?.name}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}
