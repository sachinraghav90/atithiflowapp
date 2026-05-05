import { cn } from "@/lib/utils";
import { useGetOrderByBookingQuery } from "@/redux/services/hmsApi";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { getStatusColor } from "@/constants/statusColors";
import { toast } from "react-toastify";
import { formatAppDateTime } from "@/utils/dateFormat";

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

            <div className="space-y-3">
                {orders && orders.map((order, index) => (
                    <div
                        key={order.id}
                        className="rounded-[5px] border-2 border-primary/50 bg-background p-5 space-y-3 shadow-sm"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="font-semibold">
                                    Order #{order.id}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDateTime(order.order_date)}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <span
                                    className={cn(
                                        "text-xs font-medium px-2 py-1 rounded",
                                        getStatusColor(order.order_status, "order")
                                    )}
                                >
                                    {order.order_status}
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Room</p>
                                <p className="font-medium">
                                    {order.room_no || "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Guest</p>
                                <p className="font-medium">
                                    {order.guest_name || "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Mobile</p>
                                <p className="font-medium">
                                    {order.guest_mobile || "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Table</p>
                                <p className="font-medium">
                                    {order.table_no || "Room Service"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Expected Delivery</p>
                                <p className="font-medium">
                                    {formatDateTime(order.expected_delivery_time)}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs">Amount</p>
                                <p className="font-semibold text-primary">
                                    ₹{order.total_amount}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
