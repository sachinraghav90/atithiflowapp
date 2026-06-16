import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronUp, ChevronDown, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAvailableRoomsQuery, useChangeRoomMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { formatAppDate } from "@/utils/dateFormat";

type AvailableRoom = {
    id: string;
    room_no: string;
    ac_type_name: string;
    bed_type_name: string;
    room_category_name: string;
    floor_number: number;
};

type SelectedRoom = {
    ref_room_id: number;
    room_no?: string;
    floor_number?: number;
    bed_type_name?: string;
    room_category_name?: string;
    ac_type_name?: string;
};

type BookingRoom = {
    id?: number;
    room_id?: number;
    room_no: string;
};

type BookingData = {
    id: number;
    estimated_arrival?: string;
    estimated_departure?: string;
    rooms?: BookingRoom[];
};

export default function ChangeRoomModal({
    open,
    onClose,
    booking,
    propertyId
}: {
    open: boolean;
    onClose: () => void;
    booking: BookingData;
    propertyId: number;
}) {
    const [changeRoom, { isLoading: isChangingRoom }] = useChangeRoomMutation();
        const [reason, setReason] = useState("");
    const [roomFilters, setRoomFilters] = useState({
        roomCategory: "",
        bedType: "",
        acType: "",
        floor: ""
    });
    
    // Existing rooms mapped to pending selection format
    const [tempSelectedRooms, setTempSelectedRooms] = useState<SelectedRoom[]>([]);
    
        const [removedRooms, setRemovedRooms] = useState<SelectedRoom[]>([]);
    
    useEffect(() => {
        if (open) {
            setReason("");
            setRemovedRooms([]);
            setTempSelectedRooms([]);
        }
    }, [open]);

    const assignedRooms = booking?.rooms?.map((r: BookingRoom) => ({
        ref_room_id: Number(r.room_id || r.id),
        room_no: r.room_no
    })) || [];

    // Fetch available rooms
    const arrivalDate = booking?.estimated_arrival ? booking.estimated_arrival.split('T')[0] : "";
    const departureDate = booking?.estimated_departure ? booking.estimated_departure.split('T')[0] : "";
    
    const { data: availableRooms, isLoading: availableRoomsLoading } = useAvailableRoomsQuery({
        propertyId,
        arrivalDate,
        departureDate,
        estimatedArrivalTime: ""
    }, {
        skip: !open || !arrivalDate || !departureDate || !propertyId
    });

    const [availableRoomCategory, setAvailableRoomCategory] = useState<string[]>([]);
    const [availableBedType, setAvailableBedType] = useState<string[]>([]);
    const [availableAcType, setAvailableAcType] = useState<string[]>([]);
    const [floors, setFloors] = useState<number[]>([]);
    const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!availableRooms || !availableRooms.filters) return;
        const { categories, bedTypes, acTypes, floors: f } = availableRooms.filters;
        setAvailableRoomCategory(categories || []);
        setAvailableBedType(bedTypes || []);
        setAvailableAcType(acTypes || []);
        
        const uniqueFloors = Array.from(new Set((availableRooms.rooms || []).map((r: AvailableRoom) => r.floor_number))).sort((a, b) => Number(a) - Number(b)) as number[];
        setFloors(uniqueFloors);

        if (uniqueFloors.length > 0) {
            const initialCollapsed = new Set<number>();
            uniqueFloors.forEach((fl: number) => {
                if (fl !== 1) initialCollapsed.add(fl);
            });
            setCollapsedFloors(initialCollapsed);
        }
    }, [availableRooms]);

    const roomsByFloor = useMemo(() => {
        if (availableRoomsLoading || !availableRooms?.rooms) return [];
        const map: Record<number, AvailableRoom[]> = {};
        availableRooms.rooms.forEach((room: AvailableRoom) => {
            if (!map[room.floor_number]) map[room.floor_number] = [];
            map[room.floor_number].push(room);
        });
        return Object.entries(map).map(([floor, rooms]) => ({
            floor: Number(floor),
            rooms,
        }));
    }, [availableRooms, availableRoomsLoading]);

    const toggleFloor = (floor: number) => {
        setCollapsedFloors((prev) => {
            const next = new Set(prev);
            if (next.has(floor)) next.delete(floor);
            else next.add(floor);
            return next;
        });
    };

    const handleSave = async () => {
        if (removedRooms.length === 0) {
            toast.error("Please remove at least one assigned room.");
            return;
        }
        if (tempSelectedRooms.length !== removedRooms.length) {
            toast.error(`Please select exactly ${removedRooms.length} replacement room(s) for the removed assigned room(s).`);
            return;
        }

        const unchangedRooms = assignedRooms.filter(ar => !removedRooms.some(rr => rr.ref_room_id === ar.ref_room_id));
        
        const finalNewRooms = [
            ...unchangedRooms.map(r => ({ ref_room_id: r.ref_room_id, room_no: r.room_no })),
            ...tempSelectedRooms.map(r => ({ ref_room_id: r.ref_room_id, room_no: r.room_no }))
        ];

        const payload = {
            booking_id: booking?.id,
            reason,
            new_rooms: finalNewRooms
        };
        
        try {
            await changeRoom(payload).unwrap();
            toast.success("Room changed successfully");
            onClose();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || "Failed to change room");
        }
    };

    if (!open) return null;

    return (
        <Sheet open={open} onOpenChange={(val) => {
            if (!val) onClose();
        }}>
            <SheetContent 
                side="right" 
                className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background p-0"
                overlayClassName="bg-transparent"
            >
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col"
                >
                    <SheetHeader className="px-6 py-4 border-b">
                        <SheetTitle className="font-bold gap-4">
                            Change Room
                            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {formatAppDate(arrivalDate)} - {formatAppDate(departureDate)}
                            </span>
                        </SheetTitle>
                        <p className="text-xs text-muted-foreground font-medium tracking-wide">
                            Select new rooms for this booking
                        </p>
                    </SheetHeader>

                    <div className="p-6 lg:p-3 bg-muted/10">
                        <Label className="text-base font-bold text-foreground block mb-3">Reason for room change <span className="text-destructive">*</span></Label>
                        <Input 
                            value={reason} 
                            onChange={(e) => setReason(e.target.value)} 
                            placeholder="Enter reason..." 
                            className="bg-background"
                        />
                    </div>

                    <section className="p-6 lg:p-3 bg-muted/20">
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-base font-bold text-foreground mb-3">Assigned Rooms</h3>
                                {assignedRooms.length === 0 ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm  text-muted-foreground">Select an assigned room to remove</p>
                                        <div className="flex items-center h-10 w-full rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                            No rooms assigned.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-muted-foreground">Select an assigned room to remove</p>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between min-h-10 h-auto font-normal px-3 py-2 bg-background border-input hover:bg-background hover:text-foreground",
                                                        removedRooms.length === 0 && "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        {removedRooms.length === 0 ? (
                                                            <span>--Please Select--</span>
                                                        ) : (
                                                            removedRooms.map((sr, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 text-destructive px-2 py-0.5 rounded text-xs font-medium"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <span>{sr.room_no || sr.ref_room_id}</span>
                                                                    <button 
                                                                        type="button"
                                                                        className="hover:bg-destructive/20 rounded-full transition-colors p-0.5 -mr-1"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setRemovedRooms(prev => prev.filter(r => r.ref_room_id !== sr.ref_room_id));
                                                                        }}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent 
                                                className={cn(
                                                    "w-[--radix-popover-trigger-width] p-0 min-w-0 shadow-2xl border-border bg-background",
                                                    assignedRooms.length === removedRooms.length && "hidden"
                                                )} 
                                                align="start"
                                                side="bottom"
                                                sideOffset={4}
                                            >
                                                <Command className="border-none shadow-none bg-background">
                                                    <CommandInput placeholder="Search here..." className="h-9" />
                                                    <CommandList 
                                                        className="max-h-[250px] overflow-y-auto bg-background app-scrollbar"
                                                        onWheel={(e) => e.stopPropagation()}
                                                    >
                                                        <CommandEmpty className="py-4 text-xs italic text-muted-foreground text-center">No results found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {assignedRooms
                                                                .filter(sr => !removedRooms.some(r => r.ref_room_id === sr.ref_room_id))
                                                                .map(sr => (
                                                                    <CommandItem
                                                                        key={sr.ref_room_id}
                                                                        value={sr.room_no || String(sr.ref_room_id)}
                                                                        onSelect={() => {
                                                                            setRemovedRooms(prev => [...prev, sr]);
                                                                        }}
                                                                        className="flex items-center cursor-pointer py-1.5 px-2 text-sm rounded-sm transition-all hover:bg-primary/5 hover:text-primary"
                                                                    >
                                                                        <span className="truncate">{sr.room_no || sr.ref_room_id}</span>
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {assignedRooms.length === removedRooms.length && (
                                            <div className="text-sm text-muted-foreground">All assigned rooms selected for removal.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground mb-3">Replaced Rooms</h3>
                                {tempSelectedRooms.length === 0 ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm  text-muted-foreground">Rooms selected as replacement</p>
                                        <div className="flex items-center h-10 w-full rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                            No replacement rooms selected.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-muted-foreground">Rooms selected as replacement</p>
                                        <div className="w-full min-h-10 h-auto px-3 py-2 bg-background border border-input rounded-md flex flex-wrap gap-1.5 items-center">
                                            {tempSelectedRooms.map((sr, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium"
                                                >
                                                    <span>{sr.room_no || sr.ref_room_id}</span>
                                                    <button 
                                                        type="button"
                                                        className="hover:bg-primary/20 rounded-full transition-colors p-0.5 -mr-1"
                                                        onClick={() => setTempSelectedRooms(prev => prev.filter(r => r.ref_room_id !== sr.ref_room_id))}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-2">
                            <h3 className="text-base font-bold text-foreground mb-3">Please Select Room(s)</h3>
                            
                            {/* Filters */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center rounded-xl border border-primary/10 bg-background/70 p-3 mb-4 shadow-sm">
                                <div className="flex items-center h-10 border border-primary/20 bg-background rounded-[3px] text-sm overflow-hidden w-full hover:border-primary/40 focus-within:ring-1 focus-within:ring-primary">
                                    <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-primary/20 h-full min-w-[80px] justify-center">Bed Type</span>
                                    <div className="flex-1 min-w-0 h-full">
                                        <NativeSelect className="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2" value={roomFilters.bedType} onChange={(e) => setRoomFilters({ ...roomFilters, bedType: e.target.value })}>
                                            <option value="">--Please Select--</option>
                                            {availableBedType.map((type, i) => <option value={type} key={i}>{type}</option>)}
                                        </NativeSelect>
                                    </div>
                                </div>
                                <div className="flex items-center h-10 border border-primary/20 bg-background rounded-[3px] text-sm overflow-hidden w-full hover:border-primary/40 focus-within:ring-1 focus-within:ring-primary">
                                    <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-primary/20 h-full min-w-[80px] justify-center">Category</span>
                                    <div className="flex-1 min-w-0 h-full">
                                        <NativeSelect className="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2" value={roomFilters.roomCategory} onChange={(e) => setRoomFilters({ ...roomFilters, roomCategory: e.target.value })}>
                                            <option value="">--Please Select--</option>
                                            {availableRoomCategory.map((category, i) => <option value={category} key={i}>{category}</option>)}
                                        </NativeSelect>
                                    </div>
                                </div>
                                <div className="flex items-center h-10 border border-primary/20 bg-background rounded-[3px] text-sm overflow-hidden w-full hover:border-primary/40 focus-within:ring-1 focus-within:ring-primary">
                                    <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-primary/20 h-full min-w-[80px] justify-center">AC Type</span>
                                    <div className="flex-1 min-w-0 h-full">
                                        <NativeSelect className="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2" value={roomFilters.acType} onChange={(e) => setRoomFilters({ ...roomFilters, acType: e.target.value })}>
                                            <option value="">--Please Select--</option>
                                            {availableAcType.map((type, i) => <option value={type} key={i}>{type}</option>)}
                                        </NativeSelect>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <Button variant="heroOutline" className="h-10 w-10 p-0 flex items-center justify-center shrink-0" onClick={() => setRoomFilters({ bedType: "", roomCategory: "", floor: "", acType: "" })} title="Reset Filters">
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        variant="hero" 
                                        className="h-10 px-3 text-xs font-bold flex-1"
                                        onClick={handleSave} 
                                        disabled={!reason.trim() || removedRooms.length === 0 || tempSelectedRooms.length !== removedRooms.length || isChangingRoom}
                                    >
                                        {isChangingRoom ? "Changing..." : "Save Changes"}
                                    </Button>
                                </div>
                                <div className="flex items-center h-10 border border-primary/20 bg-background rounded-[3px] text-sm overflow-hidden w-full hover:border-primary/40 focus-within:ring-1 focus-within:ring-primary">
                                    <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-primary/20 h-full min-w-[80px] justify-center">Floor</span>
                                    <div className="flex-1 min-w-0 h-full">
                                        <NativeSelect className="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2" value={roomFilters.floor} onChange={(e) => setRoomFilters({ ...roomFilters, floor: e.target.value })}>
                                            <option value="">--Please Select--</option>
                                            {floors.map((floor, i) => <option value={floor} key={i}>{floor}</option>)}
                                        </NativeSelect>
                                    </div>
                                </div>
                                <div className="hidden sm:block col-span-1"></div>
                                <div className="hidden sm:block col-span-1"></div>
                                <div className="hidden sm:block col-span-1"></div>
                            </div>
                        </div>

                            {/* Rooms List */}
                            {roomsByFloor.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {availableRoomsLoading ? "Loading available rooms..." : "No available rooms for the selected criteria."}
                                </p>
                            )}

                            <div className="space-y-3">
                                {roomsByFloor.map(({ floor, rooms }) => (
                                    (roomFilters.floor === "" || roomFilters.floor === floor.toString()) && (
                                        <div key={floor} className="mb-6">
                                            <div 
                                                className="flex items-center justify-between p-3 bg-primary/[0.05] rounded-lg border border-primary/10 mb-4 cursor-pointer hover:bg-primary/[0.08] transition-colors"
                                                onClick={() => toggleFloor(floor)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-sm font-bold text-primary">Floor {floor}</h3>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{rooms.length} {rooms.length === 1 ? "room" : "rooms"}</span>
                                                </div>
                                                <div className={cn("h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-200", collapsedFloors.has(floor) ? "rotate-180" : "rotate-0")}>
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            
                                            {!collapsedFloors.has(floor) && (
                                                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                                    {rooms.map((room) => {
                                                        const isSelected = tempSelectedRooms.some((r) => r.ref_room_id === Number(room.id));
                                                        const matchesFilter = 
                                                            (!roomFilters.bedType || room.bed_type_name === roomFilters.bedType) &&
                                                            (!roomFilters.roomCategory || room.room_category_name === roomFilters.roomCategory) &&
                                                            (!roomFilters.acType || room.ac_type_name === roomFilters.acType);
                                                        
                                                        if (!isSelected && !matchesFilter) return null;

                                                        return (
                                                            <button
                                                                key={room.id}
                                                                onClick={() => {
                                                                    const roomId = Number(room.id);
                                                                    const maxReplacements = removedRooms.length;
                                                                    
                                                                    setTempSelectedRooms((prev) => {
                                                                        if (prev.some((r) => r.ref_room_id === roomId)) {
                                                                            return prev.filter((r) => r.ref_room_id !== roomId);
                                                                        } else {
                                                                            if (prev.length >= maxReplacements) {
                                                                                if (maxReplacements === 0) {
                                                                                    toast.error("Remove an assigned room first.");
                                                                                } else {
                                                                                    toast.error(`You can select only ${maxReplacements} replacement room(s). Remove assigned room(s) first.`);
                                                                                }
                                                                                return prev;
                                                                            }
                                                                            return [...prev, { 
                                                                                ref_room_id: roomId, 
                                                                                room_no: room.room_no,
                                                                                floor_number: room.floor_number,
                                                                                bed_type_name: room.bed_type_name,
                                                                                room_category_name: room.room_category_name,
                                                                                ac_type_name: room.ac_type_name
                                                                            }];
                                                                        }
                                                                    });
                                                                }}
                                                                className={cn(
                                                                    "group h-[120px] overflow-hidden rounded-lg border text-left transition-all duration-200",
                                                                    isSelected ? "border-primary bg-primary/[0.12] ring-2 ring-primary shadow-lg scale-[1.02] z-10" : "border-primary/20 bg-primary/[0.04] hover:border-primary/40 hover:shadow-md hover:scale-[1.01]"
                                                                )}
                                                            >
                                                                <div className="flex h-full flex-col">
                                                                    <div className={cn("flex items-center justify-between border-b px-3 py-2 text-primary-foreground transition-colors", isSelected ? "bg-primary border-primary" : "bg-primary border-primary/20")}>
                                                                        <span className="text-xs font-bold opacity-90">Room | {room.ac_type_name}</span>
                                                                        {isSelected && (
                                                                            <div className="bg-secondary rounded-full p-1 shadow-sm ring-1 ring-white/20">
                                                                                <Check className="w-3 h-3 text-secondary-foreground stroke-[4px]" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className={cn("relative flex flex-1 flex-col items-center justify-center p-3 transition-colors", isSelected ? "bg-primary/[0.08]" : "bg-background")}>
                                                                        <span className="absolute top-2 left-3 text-xs font-bold text-muted-foreground/60">Floor {room.floor_number}</span>
                                                                        <span className={cn("text-3xl font-black tracking-tight mb-0.5", isSelected ? "text-primary" : "text-primary/90")}>{room.room_no}</span>
                                                                        <span className="truncate text-[10px] font-semibold text-muted-foreground/60">{room.bed_type_name} • {room.room_category_name}</span>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                ))}
                            </div>
                    </section>
                </motion.div>
            </SheetContent>
        </Sheet>
    );
}
