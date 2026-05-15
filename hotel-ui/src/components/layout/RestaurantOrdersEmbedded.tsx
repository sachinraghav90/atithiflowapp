import { cn } from "@/lib/utils";
import { useGetOrderByBookingQuery } from "@/redux/services/hmsApi";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { getStatusColor } from "@/constants/statusColors";
import { toast } from "react-toastify";
import { formatAppDateTime } from "@/utils/dateFormat";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";
import { GridBadge } from "../ui/grid-badge";
import { Label } from "../ui/label";
import { OrderItemsModal } from "../../pages/OrderItemsModal";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

/* ---------------- Types ---------------- */
type RestaurantOrder = {
    id: string;
    property_id: string;
    table_no: string;
    guest_id: string | null;
    room_id: string | null;
    booking_id: string | null;
    order_date: string;
    total_amount: string;
    order_status: string;
    payment_status: string;
    waiter_staff_id: string;
    expected_delivery_time: string | null;
    room_no?: string;
    guest_name?: string;
    guest_mobile?: string;
    notes?: string;
};

type Props = {
    bookingId: string;
    propertyId?: string | number;
    bookingStatus?: string;
};

/* ---------------- Helpers ---------------- */
const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return formatAppDateTime(value);
};

/* ---------------- Component ---------------- */
export default function RestaurantOrdersEmbedded({
    bookingId,
    propertyId,
    bookingStatus,
}: Props) {

    const navigate = useNavigate()
    const canCreateRoomServiceOrder = bookingStatus === "CHECKED_IN";

    const { data: orders } = useGetOrderByBookingQuery(bookingId, {
        skip: !bookingId
    })

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [itemsOpen, setItemsOpen] = useState(false);

    function navigateToRestaurant() {
        if (!canCreateRoomServiceOrder) {
            toast.info("Room service orders are available only for checked-in bookings.");
            return;
        }

        navigate("/create-order", {
            state: {
                bookingId,
                propertyId,
                bookingStatus,
                source: "booking-module",
            }
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Restaurant Orders</h3>
                </div>

                <Button
                    variant="hero"
                    size="sm"
                    onClick={navigateToRestaurant}
                    disabled={!canCreateRoomServiceOrder}
                    title={!canCreateRoomServiceOrder ? "Available only for checked-in bookings" : undefined}
                >
                    + Add Order
                </Button>
            </div>


            {(!orders || orders?.length === 0) && (
                <p className="text-sm text-muted-foreground">No Restaurant Orders</p>
            )}

            <div className="space-y-6">
                {orders && orders.map((order) => (
                    <PropertyViewSection
                        key={order.id}
                        title={
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => {
                                                setSelectedOrderId(order.id);
                                                setItemsOpen(true);
                                            }}
                                            className="font-bold text-primary hover:underline transition-all cursor-pointer text-left"
                                        >
                                            Order #{formatModuleDisplayId("order", order.id)} — {formatDateTime(order.order_date)}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p className="text-xs font-medium">Click to view order summary & items</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        }
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4"
                    >
                        <ViewField label="Room" value={order.room_no} />
                        <ViewField label="Guest" value={order.guest_name} />
                        <ViewField label="Mobile" value={order.guest_mobile} />
                        <ViewField label={order.table_no ? "Table" : "Order Type"} value={order.table_no || "Room Service"} />
                        <ViewField label="Expected Delivery" value={formatDateTime(order.expected_delivery_time)} />
                        <ViewField label="Amount" value={`₹${order.total_amount}`} />
                        {order.notes && <ViewField label="Notes" value={order.notes} className="sm:col-span-2 lg:col-span-3 text-amber-600 font-medium" />}

                        <ViewField
                            label="Order Status"
                            value={
                                <GridBadge status={order.order_status} statusType="order" className="h-6 px-3 text-[10px] font-bold">
                                    {order.order_status}
                                </GridBadge>
                            }
                        />

                        <ViewField
                            label="Payment Status"
                            value={
                                <GridBadge status={order.payment_status} statusType="payment" className="h-6 px-3 text-[10px] font-bold">
                                    {order.payment_status}
                                </GridBadge>
                            }
                        />
                    </PropertyViewSection>
                ))}
            </div>

            <OrderItemsModal
                orderId={selectedOrderId}
                open={itemsOpen}
                onClose={() => {
                    setItemsOpen(false);
                    setSelectedOrderId(null);
                }}
            />
        </div>
    );
}
