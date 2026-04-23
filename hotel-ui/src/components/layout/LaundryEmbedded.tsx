import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { useGetBookingLaundryOrdersQuery } from "@/redux/services/hmsApi";
import { useNavigate } from "react-router-dom";

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
};

/* ---------------- Component ---------------- */
export default function LaundryEmbedded({
    bookingId,
    propertyId,
    bookingStatus,
}: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const canCreateLaundryOrder = bookingStatus === "CHECKED_IN";

    const navigate = useNavigate()

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

    return (
        <div className="space-y-6">
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
            <div className="flex gap-2">

            </div>

            {laundry?.length === 0 && (
                <p className="text-sm text-muted-foreground">No laundry items</p>
            )}

            {laundry?.map((order, index) => {

                const itemNames = order.items
                    ?.map(i => `${i.item_name} (${i.item_count})`)
                    .join(", ");

                const totalAmount = order.items
                    ?.reduce((sum, i) => sum + Number(i.amount || 0), 0);

                return (
                    <div
                        key={order.id}
                        className="rounded-[5px] border bg-card p-4"
                    >

                        <div className="grid sm:grid-cols-5 gap-4 text-sm">

                            <ViewField
                                label="Items"
                                value={itemNames || "—"}
                            />

                            <ViewField
                                label="Total Amount"
                                value={`₹${totalAmount ?? 0}`}
                            />

                            <ViewField
                                label="Laundry Status"
                                value={order.laundry_status}
                            />

                            <ViewField
                                label="Vendor Status"
                                value={order.vendor_status}
                            />

                            <ViewField
                                label="Pickup"
                                value={
                                    order.pickup_date
                                        ? new Date(order.pickup_date).toLocaleString()
                                        : "—"
                                }
                            />

                        </div>

                    </div>
                );
            })}

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

function ViewField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value || "—"}</p>
        </div>
    );
}
