import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { useGetBookingLaundryOrdersQuery } from "@/redux/services/hmsApi";
import { useNavigate } from "react-router-dom";
import { formatAppDateTime } from "@/utils/dateFormat";
import PropertyViewSection from "../PropertyViewSection";
import { GridBadge } from "../ui/grid-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { motion } from "framer-motion";
import SharedViewField from "@/components/ViewField";
import { ShoppingCart, Info as InfoIcon } from "lucide-react";
import { AppDataGrid, type ColumnDef } from "../ui/data-grid";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

/* ---------------- Types ---------------- */
type LaundryForm = {
    id?: string;
    item_name?: string;
    laundry_type?: string;
    item_count?: number;
    item_rate?: string;
    amount?: string;
    laundry_status?: string;
    pickup_date?: string;
    delivery_date?: string | null;
    status?: string;
};

type Props = {
    bookingId: string;
    propertyId?: string | number;
    bookingStatus?: string;
    guestName?: string;
    guestMobile?: string;
};

/* ---------------- Component ---------------- */
export default function LaundryEmbedded({
    bookingId,
    propertyId,
    bookingStatus,
    guestName,
    guestMobile,
}: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const canCreateLaundryOrder = bookingStatus === "CHECKED_IN";

    const navigate = useNavigate()

    const buildLaundrySummaryHref = (orderId: string | number) => {
        const params = new URLSearchParams({
            summaryOrderId: String(orderId),
            bookingId: String(bookingId),
        });

        if (propertyId) {
            params.set("propertyId", String(propertyId));
        }

        return `/laundry-orders?${params.toString()}`;
    };

    const { data: laundry } = useGetBookingLaundryOrdersQuery(bookingId,
        { skip: !bookingId }
    );

    const handleSave = async () => {
        try {
            // await upsertLaundry({ bookingId, laundry }).unwrap();
            toast.success("Laundry updated successfully");
        } catch {
            toast.error("Failed to update laundry");
        }
    };

    function navigateToLaundry() {
        if (!canCreateLaundryOrder) {
            toast.info("Laundry orders are available only for checked-in bookings.");
            return;
        }

        navigate("/laundry-orders", {
            state: {
                bookingId,
                propertyId,
                bookingStatus,
                source: "booking-module",
            }
        })
    }

    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Laundry</h3>
                </div>

                <Button
                    variant="hero"
                    size="sm"
                    onClick={navigateToLaundry}
                    disabled={!canCreateLaundryOrder}
                    title={!canCreateLaundryOrder ? "Available only for checked-in bookings" : undefined}
                >
                    + Add Order
                </Button>
            </div>

            {laundry?.length === 0 && (
                <p className="text-sm text-muted-foreground">No laundry items</p>
            )}

            {laundry?.map((order, index) => {

                const totalAmount = order.items
                    ?.reduce((sum, i) => sum + Number(i.amount || 0), 0);

                return (
                    <PropertyViewSection
                        key={order.id}
                        title={
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <a
                                            href={buildLaundrySummaryHref(order.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-bold text-primary hover:underline transition-all cursor-pointer text-left"
                                        >
                                            Order #{formatModuleDisplayId("laundry_order", order.id)} - {formatAppDateTime(order.pickup_date)}
                                        </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p className="text-xs font-medium">Click to view order summary & items</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        }
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4"
                    >
                        <ViewField
                            label="Room"
                            value={order.items?.[0]?.room_no || "—"}
                        />

                        <ViewField
                            label="Guest"
                            value={guestName || "—"}
                        />

                        <ViewField
                            label="Mobile"
                            value={guestMobile || "—"}
                        />

                        <ViewField
                            label="Expected Delivery"
                            value={
                                order.delivery_date
                                    ? formatAppDateTime(order.delivery_date)
                                    : "—"
                            }
                        />

                        <ViewField
                            label="Total Amount"
                            value={`₹${totalAmount ?? 0}`}
                        />

                        <ViewField
                            label="Laundry Status"
                            value={
                                <GridBadge status={order.laundry_status} statusType="laundry" className="h-6 px-3 text-[10px] font-bold">
                                    {order.laundry_status}
                                </GridBadge>
                            }
                        />

                        <ViewField
                            label="Vendor Status"
                            value={
                                <GridBadge status={order.vendor_status} statusType="vendor" className="h-6 px-3 text-[10px] font-bold">
                                    {order.vendor_status}
                                </GridBadge>
                            }
                        />
                    </PropertyViewSection>
                );
            })}

            <Sheet open={summaryOpen} onOpenChange={(open) => !open && setSummaryOpen(false)}>
                <SheetContent side="right" className="w-full lg:max-w-4xl sm:max-w-3xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="mb-4">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    Laundry Order [{selectedOrder?.id ? `#${formatModuleDisplayId("laundry_order", selectedOrder.id)}` : "..."}]
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wider">
                                    Complete laundry order summary and itemized list
                                </p>
                            </div>
                        </SheetHeader>

                        {selectedOrder && (
                            <div className="space-y-6">
                                <PropertyViewSection title="Order Details" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                                    <ViewField label="Order ID" value={`#${formatModuleDisplayId("laundry_order", selectedOrder.id)}`} />
                                    <ViewField label="Booking ID" value={formatModuleDisplayId("booking", selectedOrder.booking_id)} />
                                    <ViewField label="Room" value={selectedOrder.items?.[0]?.room_no || "—"} />
                                    <ViewField label="Guest" value={guestName || "—"} />
                                    <ViewField label="Mobile" value={guestMobile || "—"} />
                                    <ViewField label="Pickup Date" value={formatAppDateTime(selectedOrder.pickup_date)} />
                                    <ViewField label="Delivery Date" value={selectedOrder.delivery_date ? formatAppDateTime(selectedOrder.delivery_date) : "—"} />
                                    <ViewField 
                                        label="Total Amount" 
                                        value={`₹${selectedOrder.items?.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0).toFixed(2)}`} 
                                    />
                                    
                                    <ViewField
                                        label="Laundry Status"
                                        value={
                                            <GridBadge status={selectedOrder.laundry_status} statusType="laundry" className="h-6 px-3 text-[10px] font-bold">
                                                {selectedOrder.laundry_status}
                                            </GridBadge>
                                        }
                                    />

                                    <ViewField
                                        label="Vendor Status"
                                        value={
                                            <GridBadge status={selectedOrder.vendor_status} statusType="vendor" className="h-6 px-3 text-[10px] font-bold">
                                                {selectedOrder.vendor_status}
                                            </GridBadge>
                                        }
                                    />
                                </PropertyViewSection>

                                <PropertyViewSection title="Items Ordered" className="mt-0">
                                    <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                        <AppDataGrid
                                            density="compact"
                                            scrollable={false}
                                            tableClassName="w-full"
                                            columns={[
                                                {
                                                    label: "Item",
                                                    className: "w-[50%]",
                                                    cellClassName: "font-medium text-foreground",
                                                    render: (item: any) => item.item_name || "--",
                                                },
                                                {
                                                    label: "Qty",
                                                    className: "w-[20%]",
                                                    headClassName: "text-center",
                                                    cellClassName: "text-center font-medium",
                                                    render: (item: any) => item.item_count ?? "--",
                                                },
                                                {
                                                    label: "Amount",
                                                    className: "w-[30%]",
                                                    headClassName: "text-right",
                                                    cellClassName: "text-right font-medium",
                                                    render: (item: any) => `₹${Number(item.amount || 0).toFixed(2)}`,
                                                },
                                            ] as ColumnDef[]}
                                            data={selectedOrder.items ?? []}
                                            rowKey={(_, index) => index}
                                            emptyText="No laundry items found"
                                            minWidth="500px"
                                            showActions={false}
                                            className="mt-0 border-0"
                                        />
                                    </div>
                                </PropertyViewSection>

                                <div className="flex justify-end pt-4 border-t border-border mt-3">
                                    <Button variant="heroOutline" onClick={() => setSummaryOpen(false)}>
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </SheetContent>
            </Sheet>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Save</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to save laundry details?
                    </p>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            // disabled={isLoading}
                            onClick={async () => {
                                setConfirmOpen(false);
                                await handleSave();
                                setIsEditing(false);
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ViewField({ label, value, className }: { label: string; value?: string | null; className?: string }) {
    return <SharedViewField label={label} value={value} className={cn("space-y-0.5", className)} labelClassName="text-muted-foreground" />;
}
