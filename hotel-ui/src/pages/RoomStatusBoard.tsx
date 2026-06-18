import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useGetMyPropertiesQuery, useGetSidebarLinksQuery, useRoomsStatusQuery, useUpdateRoomDirtyStatusMutation, useUpdateRoomMaintenanceStatusMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { NativeSelect } from "@/components/ui/native-select";
import { Plus, Brush, Wrench } from "lucide-react";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { Textarea } from "@/components/ui/textarea";
import { parseAppDate, toISODateOnly } from "@/utils/dateFormat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { apiToast } from "@/utils/apiToastPromise";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import EmptyPropertyOnboarding from "@/components/layout/EmptyPropertyOnboarding";

/* ---------------- Types ---------------- */
type Room = {
    ref_room_id: number;
    room_no: string;
    floor_number: number;
    dirty: boolean;
    under_maintenance: boolean;
    booking_status: "CHECKED_IN" | "BOOKED" | "CHECKED_OUT" | null;
    pickup: boolean | null;
    drop: boolean | null;
    status: "CHECKED_IN" | "FREE" | "DIRTY" | "BOOKED";
    room_category_name: string;
    bed_type_name: string;
    ac_type_name: string;
};

type Summary = {
    checked_in: number;
    confirmed: number;
    checked_out: number;
    no_show: number;
    free: number;
    dirty: number;
    maintenance?: number;
};

type ApiResponse = {
    date: string;
    summary: Summary;
    rooms: Room[];
    checking_in: {
        room_no: string;
        pickup: boolean | null;
        drop: boolean | null;
    }[];
    checking_out: {
        room_no: string;
        pickup: boolean | null;
        drop: boolean | null;
    }[];
};

const ROOM_STATUS_LEGEND = [
    { label: "Occupied", color: "bg-pink-300" },
    { label: "Free", color: "bg-green-300" },
    { label: "Dirty", color: "bg-gray-300" },
    { label: "Adv. Booked", color: "bg-blue-300" },
    { label: "Under Maintenance", color: "bg-yellow-300" },
];

/* ---------------- Helpers ---------------- */
function getRoomUiStatus(room: Room): "OCCUPIED" | "FREE" | "DIRTY" | "BOOKED" | "MAINTENANCE" {
    if (room.under_maintenance) {
        return "MAINTENANCE";
    }

    if (room.dirty && (room.status === "FREE" || !room.status)) {
        return "DIRTY";
    }

    switch (room.status) {
        case "CHECKED_IN":
            return "OCCUPIED";
        case "BOOKED":
            return "BOOKED";
        case "DIRTY":
            return "DIRTY";
        case "MAINTENANCE":
            return "MAINTENANCE";
        case "FREE":
        default:
            return "FREE";
    }
}

function roomCardColor(status: "OCCUPIED" | "FREE" | "DIRTY" | "BOOKED" | "MAINTENANCE") {
    switch (status) {
        case "OCCUPIED":
            return "bg-pink-300 border-pink-200";
        case "BOOKED":
            return "bg-blue-300 border-blue-200";
        case "FREE":
            return "bg-green-300 border-green-200";
        case "DIRTY":
            return "bg-gray-300 border-gray-200";
        case "MAINTENANCE":
            return "bg-yellow-300 border-yellow-200";
        default:
            return "bg-card";
    }
}

/* ---------------- Component ---------------- */
export default function RoomStatusBoard() {
    const [selectedDate, setSelectedDate] = useState(
        toISODateOnly(new Date())
    );

    const [propertyId, setPropertyId] = useState("")

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const propertySelectWidthCh = useMemo(() => {
        const maxPropertyNameLength = Math.max(
            "Select property".length,
            ...(myProperties?.properties?.map((property) => String(property.brand_name ?? "").length) ?? [])
        );

        return Math.min(Math.max(maxPropertyNameLength + 4, 18), 56);
    }, [myProperties?.properties]);

    const { data, refetch } = useRoomsStatusQuery({ propertyId, date: selectedDate }, {
        skip: !isLoggedIn || !propertyId
    })

    const navigate = useNavigate()
    const [updateRoomDirtyStatus, { isLoading: isUpdatingDirty }] = useUpdateRoomDirtyStatusMutation();
    const [updateRoomMaintenanceStatus, { isLoading: isUpdatingMaintenance }] = useUpdateRoomMaintenanceStatusMutation();

    const [isDirtySheetOpen, setIsDirtySheetOpen] = useState(false);
    const [dirtyStatuses, setDirtyStatuses] = useState<Record<string, boolean>>({});

    const [maintenanceSheetRoom, setMaintenanceSheetRoom] = useState<Room | null>(null);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [maintenanceReason, setMaintenanceReason] = useState("");
    const [isMaintenanceSheetOpen, setIsMaintenanceSheetOpen] = useState(false);

    const openMaintenanceSheet = (room: Room) => {
        setMaintenanceSheetRoom(room);
        setIsMaintenance(room.under_maintenance);
        setMaintenanceReason("");
        setIsMaintenanceSheetOpen(true);
    };

    const handleSaveMaintenance = async () => {
        if (!maintenanceSheetRoom) return;
        
        try {
            await apiToast(
                updateRoomMaintenanceStatus({ 
                    roomId: maintenanceSheetRoom.ref_room_id, 
                    under_maintenance: isMaintenance, 
                    reason: maintenanceReason 
                }).unwrap(),
                isMaintenance ? "Room placed under maintenance" : "Room is now available"
            );
            setIsMaintenanceSheetOpen(false);
            refetch();
        } catch (error) {
            console.error("Failed to update maintenance status", error);
        }
    };

    useEffect(() => {
        if (data?.rooms) {
            const initial: Record<string, boolean> = {};
            data.rooms.forEach(r => {
                initial[r.ref_room_id.toString()] = r.dirty;
            });
            setDirtyStatuses(initial);
        }
    }, [data?.rooms, isDirtySheetOpen]);

    const handleSaveDirtyStatus = async () => {
        if (!propertyId) return;
        
        const updates = Object.entries(dirtyStatuses).map(([id, dirty]) => ({
            id: Number(id),
            dirty
        }));

        try {
            await apiToast(
                updateRoomDirtyStatus({ propertyId, updates }).unwrap(),
                "Rooms have been cleaned and are available for reservation."
            );
            setIsDirtySheetOpen(false);
            refetch();
        } catch (error) {
            console.error("Failed to update room dirty status", error);
        }
    };

    const handleCleanAll = () => {
        setDirtyStatuses(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => next[k] = false);
            return next;
        });
    };
    const filteredCheckIns = data?.checking_in || [];
    const filteredCheckOuts = data?.checking_out || [];

    function getFloorName(floor: number): string {
        if (floor === 0) return "G|F";

        const romanMap: { value: number; symbol: string }[] = [
            { value: 1000, symbol: "M" },
            { value: 900, symbol: "CM" },
            { value: 500, symbol: "D" },
            { value: 400, symbol: "CD" },
            { value: 100, symbol: "C" },
            { value: 90, symbol: "XC" },
            { value: 50, symbol: "L" },
            { value: 40, symbol: "XL" },
            { value: 10, symbol: "X" },
            { value: 9, symbol: "IX" },
            { value: 5, symbol: "V" },
            { value: 4, symbol: "IV" },
            { value: 1, symbol: "I" },
        ];

        let num = floor;
        let roman = "";

        for (const { value, symbol } of romanMap) {
            while (num >= value) {
                roman += symbol;
                num -= value;
            }
        }

        return `${roman}|F`;
    }

    useEffect(() => {
        if (!propertyId && myProperties?.properties?.length > 0) {
            setPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);


    const pathname = useLocation().pathname
    usePermission(pathname)
    const { permission: bookingPermission } = usePermission("/bookings", { autoRedirect: false })

    const currentlyDirtyRooms = data?.rooms.filter(r => dirtyStatuses[r.ref_room_id.toString()]) || [];
    const initialDirtyRooms = data?.rooms.filter(r => r.dirty) || [];

    const hasZeroProperties = (isSuperAdmin || isOwner) && myProperties?.properties && myProperties.properties.length === 0;

    if (hasZeroProperties) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
                <EmptyPropertyOnboarding />
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <section className="p-4 lg:p-6 space-y-4">
                {/* ---------- Header ---------- */}
                <div className="space-y-3">

                    {/* Title + Controls */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        {/* LEFT — Title */}
                        <div>
                            <h1 className="text-2xl font-bold">Room Status</h1>
                            <p className="text-sm text-muted-foreground">
                                Daily occupancy & movements
                            </p>
                        </div>

                        {/* RIGHT — Controls */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            {(isSuperAdmin || isOwner) && (
                                <div
                                    className="w-full sm:w-[var(--property-select-width)] sm:min-w-48 sm:max-w-[min(36rem,calc(100vw-14rem))]"
                                    style={{ "--property-select-width": `${propertySelectWidthCh}ch` } as CSSProperties}
                                >
                                    <Label>Property</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border bg-background px-3 text-sm"
                                        value={propertyId}
                                        onChange={(e) => setPropertyId(e.target.value)}
                                        showFullText
                                    >
                                        <option value="" disabled>Select property</option>
                                        {myProperties?.properties?.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.brand_name}
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            )}

                            <div className="w-full sm:w-40">
                                <Label>Date</Label>
                                <ResponsiveDatePicker
                                    className="bg-background h-10"
                                    value={parseAppDate(selectedDate)}
                                    onChange={(date) => setSelectedDate(toISODateOnly(date))}
                                    minDate={new Date()}
                                />
                            </div>

                            {bookingPermission?.can_create && (
                                <Button
                                    variant="hero"
                                    onClick={() => navigate("/reservation")}
                                    className="h-10 px-4 flex items-center gap-2 sm:mt-[22px]"
                                >
                                    <Plus className="w-4 h-4" /> New Booking
                                </Button>
                            )}
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <SummaryCard label="Available" value={data?.summary.free ?? 0} colorClass="text-green-300" />
                    <SummaryCard label="Adv. Booked" value={data?.summary.confirmed ?? 0} colorClass="text-blue-300" />
                    <SummaryCard label="Occupied" value={data?.summary.checked_in ?? 0} colorClass="text-pink-300" />
                    <SummaryCard label="Dirty" value={data?.summary.dirty ?? 0} colorClass="text-gray-300" />
                    <SummaryCard label="Under Maintenance" value={data?.summary.maintenance ?? 0} colorClass="text-yellow-300" />
                </div>


                {/* ---------- Main Layout ---------- */}
                <div className="relative border border-border rounded-md p-4 bg-background mt-6">
                    <div className="absolute -top-3 left-4 bg-background px-2">
                        <span className="text-sm font-semibold text-muted-foreground">Rooms</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
                        {/* ---------- Rooms (4 columns) ---------- */}
                        <div className="lg:col-span-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                            {data?.rooms.map((room) => {
                                const uiStatus = getRoomUiStatus(room);

                                return (
                                    <div
                                        key={room.ref_room_id}
                                        className={cn(
                                            "rounded-md border p-3 space-y-2 transition relative overflow-hidden",
                                            roomCardColor(uiStatus)
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs text-muted-foreground">
                                                {getFloorName(room.floor_number)}
                                            </p>
                                            {room.status !== "CHECKED_IN" && room.status !== "BOOKED" && (
                                                <TooltipProvider delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => openMaintenanceSheet(room)}
                                                                className="absolute right-2 top-2 rounded-md border-2 border-primary bg-background text-primary hover:bg-primary hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none h-6 w-6 flex items-center justify-center shadow-sm"
                                                            >
                                                                <Wrench className="h-3.5 w-3.5 stroke-[2.5]" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs font-medium">
                                                            Room Maintenance
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                        <div className="flex justify-center items-center">
                                            <p className="text-2xl font-semibold">
                                                {room.room_no}
                                            </p>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            {room?.bed_type_name?.split(" ")?.[0]}|{room?.room_category_name}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ---------- Right Panel (1 column = same as summary card) ---------- */}
                    <div className="space-y-1.5">

                        <div className="bg-background border border-border rounded-md px-3 py-2">
                            <p className="font-semibold mb-1.5 text-sm">Checking In</p>
                            {filteredCheckIns.map((c, i) => (
                                <MovementRow key={i} {...c} checkIn />
                            ))}
                        </div>

                        <div className="bg-background border border-border rounded-md px-3 py-2">
                            <p className="font-semibold mb-1.5 text-sm">Checking Out</p>
                            {filteredCheckOuts.map((c, i) => (
                                <MovementRow key={i} {...c} />
                            ))}
                        </div>

                        <div className="bg-background border border-border rounded-md px-3 py-2 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-1.5">
                                <p className="font-semibold text-sm mt-0.5">
                                    Dirty Rooms <span className="text-muted-foreground ml-1">({currentlyDirtyRooms.length || 0})</span>
                                </p>
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button 
                                                type="button"
                                                className="absolute right-2 top-2 rounded-md border-2 border-primary bg-background text-primary hover:bg-primary hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-6 w-6 flex items-center justify-center shadow-sm"
                                                onClick={() => setIsDirtySheetOpen(true)}
                                            >
                                                <Brush className="h-3.5 w-3.5 stroke-[2.5]" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs font-medium">
                                            Clean Room
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {currentlyDirtyRooms.length === 0 ? (
                                <p className="text-xs text-muted-foreground">All rooms are clean</p>
                            ) : (
                                currentlyDirtyRooms.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 mb-2">
                                        <span className="font-medium text-sm">{r.room_no}</span>
                                        <div className="flex gap-2 text-xs">
                                            <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                                                Dirty
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            </div>

            </section>

            {/* Dirty Rooms Sheet */}
            <Sheet open={isDirtySheetOpen} onOpenChange={setIsDirtySheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background overflow-y-auto">
                    <div className="flex flex-col min-h-full">
                        <SheetHeader className="px-6 py-4 border-b shrink-0">
                            <SheetTitle className="text-[#444444]">Manage Dirty Rooms</SheetTitle>
                            <p className="text-xs text-muted-foreground font-medium tracking-wide mt-1">
                                Toggle room cleanliness status manually
                            </p>
                        </SheetHeader>
                        
                        <section className="flex flex-1 flex-col gap-6 px-6 pb-6 pt-6">
                            <div className="flex justify-end gap-3 shrink-0">
                                <Button size="sm" variant="heroOutline" onClick={handleCleanAll}>
                                    Clean All
                                </Button>
                            </div>

                            <div className="space-y-3 flex-1 min-h-[200px]">
                                {initialDirtyRooms.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                                        <Brush className="h-8 w-8 mb-2 opacity-50" />
                                        <p>No rooms are dirty</p>
                                    </div>
                                ) : (
                                    initialDirtyRooms.map(r => (
                                        <div key={r.ref_room_id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                            <div>
                                                <p className="font-medium">{r.room_no}</p>
                                                <p className="text-xs text-muted-foreground">{getFloorName(r.floor_number)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn("text-xs font-bold uppercase tracking-wider", dirtyStatuses[r.ref_room_id.toString()] ? "text-gray-500" : "text-green-600")}>
                                                    {dirtyStatuses[r.ref_room_id.toString()] ? "Dirty" : "Clean"}
                                                </span>
                                                <Switch 
                                                    checked={!(dirtyStatuses[r.ref_room_id.toString()] ?? false)} 
                                                    onCheckedChange={(checked) => setDirtyStatuses(prev => ({...prev, [r.ref_room_id.toString()]: !checked}))} 
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                        </section>
                        
                        <div className="px-6 py-4 border-t bg-background shrink-0 flex justify-end gap-3 mt-auto">
                            <Button variant="heroOutline" onClick={() => setIsDirtySheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="hero" onClick={handleSaveDirtyStatus} disabled={isUpdatingDirty}>
                                {isUpdatingDirty ? "Updating..." : "Update"}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Maintenance Sheet */}
            <Sheet open={isMaintenanceSheetOpen} onOpenChange={setIsMaintenanceSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background overflow-y-auto">
                    <div className="flex flex-col min-h-full">
                        <SheetHeader className="px-6 py-4 border-b shrink-0">
                            <SheetTitle className="text-[#444444]">Room Maintenance</SheetTitle>
                            <p className="text-xs text-muted-foreground font-medium tracking-wide mt-1">
                                {maintenanceSheetRoom?.room_no} • {maintenanceSheetRoom ? getFloorName(maintenanceSheetRoom.floor_number) : ''}
                            </p>
                        </SheetHeader>
                        
                        <section className="flex flex-1 flex-col gap-6 px-6 pb-6 pt-6">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <div>
                                        <p className="font-medium">Maintenance Mode</p>
                                        <p className="text-xs text-muted-foreground">Block room for repairs</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-xs font-bold uppercase tracking-wider", isMaintenance ? "text-yellow-600" : "text-green-600")}>
                                            {isMaintenance ? "Active" : "Available"}
                                        </span>
                                        <Switch 
                                            checked={isMaintenance} 
                                            onCheckedChange={setIsMaintenance} 
                                        />
                                    </div>
                                </div>

                                {isMaintenance && (
                                    <div className="space-y-2">
                                        <Label htmlFor="maintenance-reason">Reason</Label>
                                        <Textarea
                                            id="maintenance-reason"
                                            placeholder="e.g. AC Repair, Plumbing Issue"
                                            value={maintenanceReason}
                                            onChange={(e) => setMaintenanceReason(e.target.value)}
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                )}
                            </div>
                        </section>
                        
                        <div className="px-6 py-4 border-t bg-background shrink-0 flex justify-end gap-3 mt-auto">
                            <Button variant="heroOutline" onClick={() => setIsMaintenanceSheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                variant="hero" 
                                onClick={handleSaveMaintenance} 
                                disabled={isUpdatingMaintenance || (isMaintenance && !maintenanceReason.trim())}
                            >
                                {isUpdatingMaintenance ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}

function SummaryCard({
    label,
    value,
    colorClass = "text-foreground"
}: {
    label: string;
    value: number;
    colorClass?: string;
}) {
    const dotColorClass = colorClass.replace("text-", "bg-");
    return (
        <div className={cn("rounded-md border border-border px-3 py-1.5 shadow-sm flex items-center justify-between", dotColorClass)}>
            <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                <p className="text-[11px] font-bold text-muted-foreground tracking-wider truncate">{label}</p>
            </div>
            <h3 className="text-base font-bold text-foreground">{value}</h3>
        </div>
    );
}

function MovementRow({
    room_no,
    pickup,
    drop,
    checkIn
}: {
    room_no: string;
    pickup: boolean | null;
    drop: boolean | null;
    checkIn: boolean | null
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2 mb-2">
            <span className="font-medium">{room_no}</span>

            <div className="flex gap-2 text-xs">
                {checkIn && pickup && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Pickup
                    </span>
                )}
                {!checkIn && drop && (
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        Drop
                    </span>
                )}
            </div>
        </div>
    );
}

