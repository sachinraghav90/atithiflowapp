import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataGrid, DataGridHeader, DataGridRow, DataGridHead, DataGridCell } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import {
    useCreateOrderMutation,
    useGetDeliveryPartnersQuery,
    useGetMenuItemGroupsLightQuery,
    useGetMyPropertiesQuery,
    useGetPrimaryGuestByBookingQuery,
    useGetPropertyMenuLightQuery,
    useGetPropertyRestaurantTablesQuery,
    useGetRestaurantTablesLightQuery,
    useGetRoomsByBookingQuery,
    useTodayInHouseBookingIdsQuery
} from "@/redux/services/hmsApi";
import { NativeSelect } from "@/components/ui/native-select";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { Trash2, PlusCircle } from "lucide-react";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { toast } from "react-toastify";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import { useLocation } from "react-router-dom";

type OrderItemForm = {
    menu_item_id: number;
    quantity: number;
    unit_price: number;
    item_total: number;
    notes?: string;
    item_name: string;
    touched?: {
        group?: boolean;
        item?: boolean;
        quantity?: boolean;
    };
};

export function CreateOrder() {
    /* ============================
       STATE
    ============================ */
    const [order, setOrder] = useState({
        property_id: null as number | null,
        table_no: "",
        guest_name: "",
        guest_mobile: "",
        room_id: "",
        booking_id: null as number | null,
        total_amount: 0,
        order_status: "New",
        payment_status: "Pending",
        waiter_staff_id: 1,
        expected_delivery_time: "",
        order_type: "",
        delivery_partner_id: ""
    });

    const [items, setItems] = useState<OrderItemForm[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [isTotalManual, setIsTotalManual] = useState(false);
    const [expectedDelivery, setExpectedDelivery] = useState<Date | null>(null);
    const [selectedMenuGroups, setSelectedMenuGroups] = useState({})
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [itemErrors, setItemErrors] = useState<Record<number, any>>({});
    const [orderSubmitted, setOrderSubmitted] = useState(false);
    const location = useLocation();
    const prefillApplied = useRef(false);
    const prefilledBookingId = location.state?.bookingId;
    const prefilledPropertyId = location.state?.propertyId;
    const prefilledBookingStatus = location.state?.bookingStatus;

    /* ============================
       AUTH / ROLES
    ============================ */
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    /* ============================
       API
    ============================ */
    const { data: myProperties, isLoading: myPropertiesLoading } =
        useGetMyPropertiesQuery(undefined, { skip: !isLoggedIn });

    const { data: menuItems = [] } = useGetPropertyMenuLightQuery(
        selectedPropertyId,
        { skip: !isLoggedIn || !selectedPropertyId }
    );

    const { data: bookings } = useTodayInHouseBookingIdsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: rooms } = useGetRoomsByBookingQuery(order.booking_id, {
        skip: !isLoggedIn || !order.booking_id
    })

    const { data: numberOfTables } = useGetPropertyRestaurantTablesQuery(selectedPropertyId, {
        skip: !selectedPropertyId || !isLoggedIn
    })

    const { data: menuGroups = [] } = useGetMenuItemGroupsLightQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: partners } = useGetDeliveryPartnersQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: primaryGuest } = useGetPrimaryGuestByBookingQuery(order.booking_id, {
        skip: !order.booking_id || order.order_type !== "Room Service"
    })

    const [createOrder] = useCreateOrderMutation();

    /* ============================
       EFFECTS
    ============================ */
    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    useEffect(() => {
        if (prefillApplied.current) return;
        if (!prefilledBookingId || !prefilledPropertyId) return;

        prefillApplied.current = true;

        if (prefilledBookingStatus !== "CHECKED_IN") {
            toast.info("Only checked-in bookings can create room service orders.");
            return;
        }

        setSelectedPropertyId(Number(prefilledPropertyId));
        setOrder((current) => ({
            ...current,
            property_id: Number(prefilledPropertyId),
            booking_id: Number(prefilledBookingId),
            order_type: "Room Service",
            table_no: "",
            delivery_partner_id: "",
        }));
    }, [prefilledBookingId, prefilledPropertyId, prefilledBookingStatus]);

    useEffect(() => {
        if (!primaryGuest || order.order_type !== "Room Service" || !order.booking_id) {
            setOrder(o => ({ ...o, guest_name: "", guest_mobile: "" }))
            return
        }

        let phone = primaryGuest?.phone?.split(" ")[1]
        if (!phone) {
            phone = primaryGuest?.phone
        }

        setOrder(o => ({ ...o, guest_name: primaryGuest?.first_name, guest_mobile: phone }))
    }, [primaryGuest, order.order_type, order.booking_id])

    useEffect(() => {
        if (selectedPropertyId) {
            setOrder(o => ({ ...o, property_id: selectedPropertyId }));
        }
    }, [selectedPropertyId]);

    useEffect(() => {
        if (expectedDelivery) {
            setOrder(o => ({
                ...o,
                expected_delivery_time: expectedDelivery.toISOString()
            }));
        }
    }, [expectedDelivery]);

    /* ============================
       ITEM HANDLERS
    ============================ */
    const getFilteredMenuItems = (index: number) => {
        const selectedGroupId = selectedMenuGroups[index];
        if (!selectedGroupId) return [];
        return menuItems.filter(
            item => item.menu_item_group_id == selectedGroupId && item.is_active
        );
    };

    const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...patch };
            updated[index].item_total = updated[index].quantity * updated[index].unit_price;
            if (!isTotalManual) {
                const total = updated.reduce((s, i) => s + i.item_total, 0);
                setOrder(o => ({ ...o, total_amount: total }));
            }
            return updated;
        });
    };

    const removeItem = (index: number) => {
        setItems(p => {
            const updated = p.filter((_, i) => i !== index);
            const total = updated.reduce((s, i) => s + i.item_total, 0);
            setOrder(o => ({ ...o, total_amount: total }));
            return updated;
        });
    };

    /* ============================
       CREATE ORDER
    ============================ */
    const handleCreateOrder = async () => {
        setOrderSubmitted(true);
        const errors = validateOrder();
        setFormErrors(errors);
        const rowErrors = validateItems();
        setItemErrors(rowErrors);
        if (Object.keys(rowErrors).length > 0 || Object.keys(errors).length > 0) return;
        const payload = {
            order: { ...order, expected_delivery_time: order.expected_delivery_time || null },
            items
        };
        await toast.promise(createOrder(payload).unwrap(), {
            pending: "Creating order please wait",
            success: "Order created",
            error: "Error creating order",
        });
        setOrder({
            property_id: selectedPropertyId,
            table_no: "",
            guest_name: "",
            guest_mobile: "",
            room_id: "",
            booking_id: null,
            total_amount: 0,
            order_status: "New",
            payment_status: "Pending",
            waiter_staff_id: 1,
            expected_delivery_time: "",
            order_type: "",
            delivery_partner_id: ""
        });
        setItems([{ menu_item_id: null, item_name: "", quantity: 1, unit_price: 0, item_total: 0, notes: "", touched: {} }]);
        setSelectedMenuGroups({});
        setExpectedDelivery(null);
        setIsTotalManual(false);
        setFormErrors({});
        setItemErrors({});
        setOrderSubmitted(false);
    };

    const validateItems = () => {
        const errors: Record<number, any> = {};
        items.forEach((item, index) => {
            const rowError: any = {};
            if (!selectedMenuGroups[index]) rowError.group = true;
            if (!item.menu_item_id) rowError.item = true;
            if (!item.quantity || item.quantity <= 0) rowError.quantity = true;
            if (Object.keys(rowError).length > 0) errors[index] = rowError;
        });
        return errors;
    };

    const validateOrder = () => {
        const errors: Record<string, string> = {};
        const PHONE_REGEX = /^[0-9()]{10,15}$/;
        if (!order.guest_name.trim()) errors.guest_name = "Guest name required";
        if (!order.expected_delivery_time) errors.expected_delivery_time = "Expected delivery time required";
        if (!order.order_type) errors.order_type = "Order type required";
        if (order.order_type === "Restaurant" && !order.table_no) errors.table_no = "Table number required.";
        if (order.order_type === "Delivery") {
            if (!order.guest_mobile) errors.guest_mobile = "Mobile required for delivery";
            if (!order.delivery_partner_id) errors.delivery_partner_id = "Delivery partner required";
        }
        if (order.guest_mobile && !PHONE_REGEX.test(order.guest_mobile)) errors.guest_mobile = "Invalid mobile number";
        if (order.order_type === "Room Service") {
            if (!order.booking_id) errors.booking_id = "Booking required";
            if (!order.room_id) errors.room_id = "Room required";
        }
        if (!items.length) errors.items = "Add at least one item";
        return errors;
    };

    const addRow = () => {
        setOrderSubmitted(false);
        setItems(prev => [
            ...prev,
            { menu_item_id: null, item_name: "", quantity: 1, unit_price: 0, item_total: 0, notes: "", touched: {} }
        ]);
    };

    const removeRow = (index: number) => {
        setItems(prev => {
            const updated = prev.filter((_, i) => i !== index);
            const total = updated.reduce((s, i) => s + i.item_total, 0);
            setOrder(o => ({ ...o, total_amount: total }));
            return updated;
        });
    };

    const onMenuSelect = (index: number, menuId: number) => {
        const alreadyExists = items.some((item, i) => i !== index && item.menu_item_id === menuId);
        if (alreadyExists) {
            toast.warning("This item is already added to the order.");
            return;
        }
        const menu = menuItems.find(m => Number(m.id) === menuId);
        if (!menu) return;
        setItems(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                menu_item_id: menuId,
                item_name: menu.item_name,
                unit_price: Number(menu.price),
                item_total: updated[index].quantity * Number(menu.price),
            };
            if (!isTotalManual) {
                const total = updated.reduce((s, i) => s + i.item_total, 0);
                setOrder(o => ({ ...o, total_amount: total }));
            }
            return updated;
        });
    };

    const selectedMenuIds = items
        .map(i => i.menu_item_id)
        .filter(Boolean);

    const exhaustedGroupIds = useMemo(() => {
        if (!menuGroups?.length || !menuItems?.length) return [];

        // 1. Index active items by their Group ID
        const itemsByGroup = menuItems.reduce((acc, item) => {
            if (!item.is_active) return acc;
            const gid = String(item.menu_item_group_id);
            if (!acc[gid]) acc[gid] = [];
            acc[gid].push(Number(item.id));
            return acc;
        }, {} as Record<string, number[]>);

        // 2. Set of all item IDs already finalized in the grid
        const pickedItemIds = new Set(items.map(i => Number(i.menu_item_id)).filter(id => id > 0));

        return menuGroups
            .filter(group => {
                const gid = String(group.id);
                const groupItemIds = itemsByGroup[gid] || [];
                if (groupItemIds.length === 0) return true; // No items = already exhausted

                // 3. Find items in this group that are NOT yet picked
                const unpickedItemsCount = groupItemIds.filter(id => !pickedItemIds.has(id)).length;

                // 4. Count rows that have "reserved" this group but haven't picked an item yet
                const reservationCount = items.filter((item, idx) => {
                    const isGroupClaimed = String(selectedMenuGroups[idx]) === gid;
                    const hasNoItemYet = !item.menu_item_id;
                    return isGroupClaimed && hasNoItemYet;
                }).length;

                // Group is exhausted if reservations meet or exceed remaining items
                return reservationCount >= unpickedItemsCount;
            })
            .map(group => group.id);
    }, [menuGroups, menuItems, items, selectedMenuGroups]);

    const availableMenuCount = menuItems.filter(
        m => !selectedMenuIds.includes(Number(m.id))
    ).length;

    useEffect(() => {
        if (items.length === 0) addRow();
    }, []);

    const hasEmptyRow = items.some(i => !i.menu_item_id);
    const canAddRow = items.length === 0 || !hasEmptyRow;

    /* ============================
       UI
    ============================ */
    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <section className="flex min-h-0 flex-col flex-1 overflow-y-auto p-6 lg:p-8 gap-6">

                <h1 className="text-2xl font-bold">Create Order</h1>

                {/* Property */}
                {(isSuperAdmin || isOwner) && (
                    <div className="w-full sm:w-64 space-y-1">
                        <Label className="text-xs">Property</Label>
                        <NativeSelect
                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                            value={selectedPropertyId ?? ""}
                            onChange={(e) =>
                                setSelectedPropertyId(Number(e.target.value) || null)
                            }
                            disabled={!(isSuperAdmin || isOwner)}
                        >
                            <option value="" disabled>Select property</option>
                            {!myPropertiesLoading &&
                                myProperties?.properties?.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.brand_name}
                                    </option>
                                ))}
                        </NativeSelect>
                    </div>
                )}

                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    <div className="flex flex-col gap-1">
                        <Label>Guest Name *</Label>
                        <Input
                            className={formErrors.guest_name ? "border-red-500" : ""}
                            placeholder="Enter guest name"
                            value={order.guest_name}
                            onChange={(e) => {
                                setFormErrors(p => {
                                    const copy = { ...p };
                                    delete copy.guest_name;
                                    return copy;
                                });
                                setOrder(o => ({ ...o, guest_name: e.target.value }))
                            }}
                        />
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.guest_name ?? ""}
                        </p>

                    </div>

                    {/* Guest Mobile */}
                    <div className="flex flex-col gap-1">
                        <Label>Guest Mobile {order.order_type === "Delivery" ? "*" : ""}</Label>
                        <Input
                            className={formErrors.guest_mobile ? "border-red-500" : ""}
                            placeholder="Enter mobile number"
                            value={order.guest_mobile}
                            onChange={(e) => {
                                e.target.value.trim().length <= 15 &&
                                    setOrder(o => ({
                                        ...o,
                                        guest_mobile: normalizeNumberInput(e.target.value.trim()).toString()
                                    }))
                                setFormErrors(p => {
                                    const copy = { ...p };
                                    delete copy.guest_mobile;
                                    return copy;
                                })
                            }}
                        />
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.guest_mobile ?? ""}
                        </p>

                    </div>

                    {/* Order Type */}

                    <div className="flex flex-col gap-1">
                        <Label>Order Type*</Label>
                        <NativeSelect
                            className={`
      flex h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground ring-offset-background
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150
      ${formErrors.order_type ? "border-red-500" : "border-input"}
    `}
                            value={order.order_type}
                            onChange={(e) => {
                                setOrder(o => ({
                                    ...o,
                                    order_type: e.target.value,
                                    booking_id: null,
                                    room_id: null,
                                    table_no: null
                                }));
                                setFormErrors(p => {
                                    const copy = { ...p };
                                    delete copy.order_type;
                                    return copy;
                                });
                            }}
                        >
                            <option value="" disabled>-- Please Select --</option>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Room Service">Room Service</option>
                            <option value="Delivery">Delivery</option>
                        </NativeSelect>
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.order_type ?? ""}
                        </p>
                    </div>


                    {/* Delivery Partner */}
                    {/* Delivery Partner */}
                    {order.order_type === "Delivery" && (
                        <div className="flex flex-col gap-1">
                            <Label>Delivery Partner*</Label>
                            <NativeSelect
                                className={`
        flex h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground ring-offset-background
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150
        ${formErrors.delivery_partner_id ? "border-red-500" : "border-input"}
      `}
                                value={order.delivery_partner_id}
                                onChange={(e) => {
                                    setOrder(o => ({ ...o, delivery_partner_id: e.target.value }));
                                    setFormErrors(p => {
                                        const copy = { ...p };
                                        delete copy.delivery_partner_id;
                                        return copy;
                                    });
                                }}
                            >
                                <option value="" disabled>-- Please Select --</option>
                                {partners &&
                                    partners.map((partner, i) => (
                                        <option value={partner.id} key={i}>
                                            {partner.name}
                                        </option>
                                    ))}
                            </NativeSelect>
                            <p className="min-h-[16px] text-xs text-red-500">
                                {formErrors.delivery_partner_id ?? ""}
                            </p>
                        </div>
                    )}
                    {order.order_type === "Restaurant" && <div className="flex flex-col gap-1">
                        <Label>Table No</Label>
                        <NativeSelect
                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                            value={order.table_no}
                            onChange={(e) =>
                                setOrder(o => ({ ...o, table_no: e.target.value }))
                            }
                        >
                            <option value="">-- Please Select --</option>
                            {[1, 2, 3, 4, 5].map(table => (
                                <option key={table} value={table}>
                                    {table}
                                </option>
                            ))}
                        </NativeSelect>
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.table_no ?? ""}
                        </p>

                    </div>}

                    {order.order_type === "Room Service" && <div className="flex flex-col gap-1">
                        <Label>Booking Id*</Label>
                        <NativeSelect
                            className={`w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm ${formErrors.booking_id ? "border-red-500" : "border-border"}`}
                            value={order.booking_id}
                            onChange={(e) => {
                                setOrder(o => ({ ...o, booking_id: +e.target.value }))
                                setFormErrors(p => {
                                    const copy = { ...p };
                                    delete copy.booking_id;
                                    return copy;
                                });
                            }}
                        >
                            <option value="">-- Please Select --</option>
                            {bookings &&
                                bookings?.map((booking) => (
                                    <option key={booking} value={booking}>
                                        #{booking}
                                    </option>
                                ))}
                        </NativeSelect>
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.booking_id ?? ""}
                        </p>


                    </div>}
                    {order.booking_id && <div className="flex flex-col gap-1">
                        <Label>Room Number*</Label>
                        <NativeSelect
                            className={`
                                    w-full h-10 rounded-[3px] border bg-background px-3 text-sm
                                    ${formErrors.room_id ? "border-red-500" : "border-border"}
                                    `}
                            value={order.room_id}
                            onChange={(e) => {
                                setFormErrors(p => {
                                    const copy = { ...p };
                                    delete copy.room_id;
                                    return copy;
                                })
                                setOrder(o => ({ ...o, room_id: e.target.value }))
                            }}
                        >
                            <option value="">-- Please Select --</option>
                            {rooms &&
                                rooms?.map((room) => (
                                    <option key={room.ref_room_id} value={room.ref_room_id}>
                                        {room.room_no}
                                    </option>
                                ))}
                        </NativeSelect>
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.room_id ?? ""}
                        </p>

                    </div>
                    }
                    {/* Expected Delivery */}
                    <div className="flex flex-col gap-1">
                        <Label>Expected Delivery</Label>

                        <ResponsiveDatePicker
                            value={expectedDelivery}
                            onChange={(date: Date | null) => setExpectedDelivery(date)}
                            showTime
                            minDate={new Date()}
                            placeholder="Select date & time"
                            label="Expected Delivery"
                            className={cn(formErrors.expected_delivery_time && "border-red-500")}
                        />
                        <p className="min-h-[16px] text-xs text-red-500">
                            {formErrors.expected_delivery_time ?? ""}
                        </p>
                    </div>



                </div>

                {/* ============================
    ORDER ITEMS TABLE - USING DATAGRID
============================ */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Order Items</Label>

                    <div className="editable-grid-compact grid-header-inside-table border rounded-[5px] overflow-hidden flex flex-col">
                        <div className="grid-scroll-x overflow-y-auto w-full flex-1 min-h-0 bg-background">
                            <div className="w-full min-w-[800px]">
                                <DataGrid>
                                    {/* HEADER */}
                                    <DataGridHeader>
                                        <DataGridHead className="border-r border-slate-200/20">Group</DataGridHead>
                                        <DataGridHead className="border-r border-slate-200/20">Item</DataGridHead>
                                        <DataGridHead className="w-24 border-r border-slate-200/20">Qty</DataGridHead>
                                        <DataGridHead className="w-32 border-r border-slate-200/20">Unit Price</DataGridHead>
                                        <DataGridHead className="w-32 border-r border-slate-200/20">Total</DataGridHead>
                                        {items.length > 1 && (
                                            <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                        )}
                                    </DataGridHeader>

                                    {/* BODY */}
                                    <tbody>
                                        {items.map((item, index) => (
                                            <DataGridRow key={index}>
                                                {/* GROUP */}
                                                <DataGridCell className="border-r border-slate-200/40">
                                                    <ValidationTooltip isValid={!((orderSubmitted || item.touched?.group) && itemErrors[index]?.group)} message="Required field">
                                                        <MenuItemSelect
                                                            extraClasses={cn(
                                                                "w-full rounded-[3px] border bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                                                (orderSubmitted || item.touched?.group) && itemErrors[index]?.group ? "border-red-500" : "border-border"
                                                            )}
                                                            value={selectedMenuGroups[index]}
                                                            items={menuGroups}
                                                            forceNative={true}
                                                            disabledIds={exhaustedGroupIds}
                                                            onSelect={(menuGroupId) => {
                                                                setSelectedMenuGroups(g => ({
                                                                    ...g,
                                                                    [index]: menuGroupId
                                                                }));

                                                                updateItem(index, {
                                                                    menu_item_id: null,
                                                                    item_name: "",
                                                                    unit_price: 0,
                                                                    item_total: 0,
                                                                    touched: { ...item.touched, group: true }
                                                                });

                                                                setItemErrors(prev => {
                                                                    const copy = { ...prev };
                                                                    if (copy[index]) delete copy[index].group;
                                                                    return copy;
                                                                });
                                                            }}
                                                            placeholder="--Please Select--"
                                                            itemName="name"
                                                        />
                                                    </ValidationTooltip>
                                                </DataGridCell>

                                                {/* ITEM */}
                                                <DataGridCell className="border-r border-slate-200/40">
                                                    <ValidationTooltip isValid={!((orderSubmitted || item.touched?.item) && itemErrors[index]?.item)} message="Required field">
                                                        <MenuItemSelect
                                                            extraClasses={cn(
                                                                "w-full rounded-[3px] border bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                                                                (orderSubmitted || item.touched?.item) && itemErrors[index]?.item ? "border-red-500" : "border-border"
                                                            )}
                                                            value={item.menu_item_id}
                                                            items={getFilteredMenuItems(index)}
                                                            forceNative={true}
                                                            disabledIds={selectedMenuIds}
                                                            onSelect={(menuId) => {
                                                                onMenuSelect(index, menuId as number);
                                                                updateItem(index, { touched: { ...item.touched, item: true } });
                                                                setItemErrors(prev => {
                                                                    const copy = { ...prev };
                                                                    if (copy[index]) delete copy[index].item;
                                                                    return copy;
                                                                });
                                                            }}
                                                            placeholder="--Please Select--"
                                                            disabled={!Object.prototype.hasOwnProperty.call(selectedMenuGroups, index)}
                                                            itemName="item_name"
                                                        />
                                                    </ValidationTooltip>
                                                </DataGridCell>

                                                {/* QTY */}
                                                <DataGridCell className="border-r border-slate-200/40">
                                                    <ValidationTooltip isValid={!((orderSubmitted || item.touched?.quantity) && itemErrors[index]?.quantity)} message="Required field">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={999999}
                                                            className={`h-9 w-full rounded-[3px] border bg-background px-3 text-sm text-foreground shadow-none
                                                            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0
                                                            disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150
                                                            ${(orderSubmitted || item.touched?.quantity) && itemErrors[index]?.quantity ? "border-red-500" : "border-border"}`}
                                                            value={item.quantity}
                                                            onChange={e => {
                                                                let value = e.target.value;
                                                                if (value.length > 6) value = value.slice(0, 6);
                                                                if (+value < 0) value = "0";

                                                                updateItem(index, {
                                                                    quantity: +normalizeNumberInput(value),
                                                                });

                                                                setItemErrors(prev => {
                                                                    const copy = { ...prev };
                                                                    if (copy[index]) delete copy[index].quantity;
                                                                    return copy;
                                                                });
                                                            }}
                                                            onBlur={(e) => {
                                                                const normalized = normalizeNumberInput(e.target.value);
                                                                const quantity = normalized === "" ? 0 : Number(normalized);
                                                                e.target.value = String(quantity);
                                                                updateItem(index, {
                                                                    quantity,
                                                                    touched: { ...item.touched, quantity: true }
                                                                });
                                                            }}
                                                        />
                                                    </ValidationTooltip>
                                                </DataGridCell>

                                                {/* UNIT PRICE */}
                                                <DataGridCell className="border-r border-slate-200/40 text-center">
                                                    <div className="font-medium text-slate-600 text-sm">
                                                        ₹ {item.unit_price}
                                                    </div>
                                                </DataGridCell>

                                                {/* TOTAL */}
                                                <DataGridCell className="border-r border-slate-200/40 text-center">
                                                    <div className="font-semibold text-slate-800 text-sm">
                                                        ₹ {item.item_total}
                                                    </div>
                                                </DataGridCell>

                                                {/* REMOVE ICON */}
                                                {items.length > 1 && (
                                                    <DataGridCell className="text-center">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="editable-grid-remove-btn h-8 w-8 text-destructive hover:text-destructive/80 transition-colors mx-auto"
                                                                    aria-label={`Remove ${item.item_name || "empty item"} from order`}
                                                                    onClick={() => removeRow(index)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="shadow-md">
                                                                Remove Item
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </DataGridCell>
                                                )}
                                            </DataGridRow>
                                        ))}
                                    </tbody>
                                </DataGrid>
                            </div>
                        </div>

                        {/* PILOT ADD ROW + TOTAL FOOTER */}
                        <div className="editable-grid-footer p-3 bg-background  border-slate-200 flex items-center justify-between min-w-[800px]">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-primary hover:underline text-sm font-semibold transition-colors disabled:opacity-50 disabled:no-underline px-1"
                                    onClick={addRow}
                                    disabled={availableMenuCount === 0}
                                >
                                    <PlusCircle className="w-4 h-4" /> Add New Order Item(s)
                                </button>

                                {availableMenuCount === 0 && (
                                    <p className="text-[10px] text-muted-foreground italic">
                                        All menu items added
                                    </p>
                                )}

                                {formErrors.items && (
                                    <p className="text-[11px] text-red-500 font-medium">{formErrors.items}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-6">
                                {isTotalManual && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] px-2 border-slate-300 text-slate-600"
                                        onClick={() => {
                                            const total = items.reduce((s, i) => s + i.item_total, 0);
                                            setOrder(o => ({ ...o, total_amount: total }));
                                            setIsTotalManual(false);
                                        }}
                                    >
                                        Recalculate
                                    </Button>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-500">Total Amount : </span>
                                    <span className="text-lg font-bold text-slate-900 pr-2">
                                        ₹ {order.total_amount || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="pt-4 border-t flex justify-end">
                    <Button variant="hero" disabled={!items.length} onClick={handleCreateOrder}>
                        Create Order
                    </Button>
                </div>

            </section>
        </div>
    );
}
