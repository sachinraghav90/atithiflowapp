import Sidebar from "@/components/layout/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { useGetRoomsQuery, useAddRoomMutation, useGetRoomTypesQuery, useBulkUpdateRoomsMutation, useGetMyPropertiesQuery, useGetPropertyFloorsQuery, useBulkUpsertPropertyFloorsMutation } from "@/redux/services/hmsApi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hook";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/rbac/usePermission";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { ChevronDown, ChevronRight, Plus, PlusCircle } from "lucide-react";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { AnimatePresence, motion } from "framer-motion";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";

/* -------------------- Types -------------------- */
type Room = {
    id: string;
    room_no: string;
    floor_number: number;
    room_type_id: number | null;
    is_active: boolean

    room_category_name?: string;
    bed_type_name?: string;
    ac_type_name?: string;
};


/* -------------------- Props -------------------- */
type Props = {
    rooms: Room[];
};

type AddFlowMode = "room" | "floor";
type AddFloorRoomDraft = {
    category: string;
    bed: string;
    ac: string;
};
type AddFloorEntry = {
    roomCount: string;
    roomDrafts: AddFloorRoomDraft[];
};

const createEmptyRoomDraft = (): AddFloorRoomDraft => ({
    category: "",
    bed: "",
    ac: "",
});
const createEmptyFloorEntry = (): AddFloorEntry => ({
    roomCount: "0",
    roomDrafts: [],
});


export default function RoomsByFloor() {
    const [editedRooms, setEditedRooms] = useState<Room[]>([]);
    const [open, setOpen] = useState(false);
    const [addFlowMode, setAddFlowMode] = useState<AddFlowMode>("room");
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
    const [roomType, setRoomType] = useState("STANDARD");
    const [addedFloors, setAddedFloors] = useState<number[]>([]);
    const [modalCategory, setModalCategory] = useState("");
    const [modalBed, setModalBed] = useState("");
    const [modalAc, setModalAc] = useState("");
    const [addFloorCount, setAddFloorCount] = useState("1");
    const [addFloorEntries, setAddFloorEntries] = useState<AddFloorEntry[]>([]);
    const [roomDrafts, setRoomDrafts] = useState<
        Record<string, { category?: string; bed?: string; ac?: string }>
    >({});
    const [propertyId, setPropertyId] = useState<string>("");
    const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({});

    const [addRoom, { isLoading: adding }] = useAddRoomMutation();

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const location = useLocation()

    const id = location.state?.propertyId

    const { data: rooms, refetch: refetchRooms } = useGetRoomsQuery(propertyId, {
        skip: !isLoggedIn || !propertyId
    })

    const { data: roomTypesData } = useGetRoomTypesQuery({ propertyId, page: 1, limit: 100 }, {
        skip: !isLoggedIn || !propertyId
    });
    const { data: propertyFloorsData, refetch: refetchPropertyFloors } = useGetPropertyFloorsQuery(propertyId, {
        skip: !isLoggedIn || !propertyId
    });

    const [updateRoomsBulk] = useBulkUpdateRoomsMutation()
    const [bulkUpsertPropertyFloors, { isLoading: savingFloors }] = useBulkUpsertPropertyFloorsMutation()
    const { 
        myProperties, 
        isMultiProperty, 
        isInitializing, 
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(propertyId, setPropertyId);

    useEffect(() => {
        if (id) {
            setPropertyId(id);
        }
    }, [id]);


    useEffect(() => {
        setEditedRooms(rooms?.rooms);
        // Initialize only the first floor to expanded on first load
        if (rooms?.rooms?.length > 0 && Object.keys(expandedFloors).length === 0) {
            const sortedFloors = [...new Set(rooms.rooms.map((r: Room) => r.floor_number))].sort((a, b) => a - b);
            const initial: Record<number, boolean> = {};
            sortedFloors.forEach((f: number, idx: number) => {
                initial[f] = idx === 0; 
            });
            setExpandedFloors(initial);
        }
    }, [rooms]);

    useEffect(() => {
        if (open) {
            setModalCategory("");
            setModalBed("");
            setModalAc("");
        }
    }, [open]);

    const getChangedRooms = () => {
        if (!Array.isArray(editedRooms) || !Array.isArray(rooms?.rooms)) return [];

        const originalMap = new Map(
            rooms.rooms.map(r => [r.id, r.room_type_id])
        );

        return editedRooms
            .filter(edited => {
                const originalTypeId = originalMap.get(edited.id);
                return edited.room_type_id !== originalTypeId;
            })
            .map(r => ({
                id: r.id,
                room_type_id: r.room_type_id
            }))
            .filter(r => r.room_type_id !== null);
    };

    const resolveRoomTypeId = (
        category: string,
        bed: string,
        ac: string
    ) => {
        const roomTypes = roomTypesData?.data ?? [];
        const match = roomTypes.find(
            rt =>
                rt.room_category_name === category &&
                rt.bed_type_name === bed &&
                rt.ac_type_name === ac
        );

        return match?.id ?? null;
    };

    const handleBulkUpdate = async () => {
        const payload = getChangedRooms();

        if (payload.length === 0) return;

        const promise = updateRoomsBulk(payload).unwrap()

        toast.promise(promise, {
            success: "Rooms updated successfully",
            pending: "Updating rooms...",
            error: "Error updating rooms"
        });
    };

    const roomsByFloor = useMemo(() => {
        const floorMap: Record<number, Room[]> = {};

        // existing rooms
        if (Array.isArray(editedRooms)) editedRooms.forEach(room => {
            if (!floorMap[room.floor_number]) {
                floorMap[room.floor_number] = [];
            }
            floorMap[room.floor_number].push(room);
        });

        const savedFloors = propertyFloorsData?.floors ?? [];
        savedFloors.forEach((floor: any) => {
            const floorNumber = Number(floor.floor_number);
            if (!floorMap[floorNumber]) {
                floorMap[floorNumber] = [];
            }
        });

        // empty floors added from UI
        addedFloors.forEach(floor => {
            if (!floorMap[floor]) {
                floorMap[floor] = [];
            }
        });

        return Object.entries(floorMap)
            .map(([floor, rooms]) => ({
                floor: Number(floor),
                rooms
            }))
            .sort((a, b) => a.floor - b.floor);
    }, [editedRooms, propertyFloorsData?.floors, addedFloors]);

    const {
        roomCategories,
        bedTypes,
        acTypes,
    } = useMemo(() => {
        const rc = new Set<string>();
        const bt = new Set<string>();
        const ac = new Set<string>();
        const roomTypes = roomTypesData?.data ?? [];

        roomTypes.forEach(rt => {
            rc.add(rt.room_category_name);
            bt.add(rt.bed_type_name);
            ac.add(rt.ac_type_name);
        });

        return {
            roomCategories: Array.from(rc),
            bedTypes: Array.from(bt),
            acTypes: Array.from(ac),
        };
    }, [roomTypesData]);

    const getRoomSelectValue = (
        room: Room,
        key: "category" | "bed" | "ac"
    ) => {
        const roomTypes = roomTypesData?.data ?? [];
        if (room.room_type_id) {
            const rt = roomTypes.find(rt => rt.id === room.room_type_id);
            if (!rt) return "";
            if (key === "category") return rt.room_category_name;
            if (key === "bed") return rt.bed_type_name;
            return rt.ac_type_name;
        }

        return roomDrafts[room.id]?.[key] ?? "";
    };

    const nextFloorNumber = () => {
        const existingFloors = roomsByFloor.map(f => f.floor);
        return existingFloors.length > 0
            ? Math.max(...existingFloors) + 1
            : 0;
    };

    const resetAddSheetState = () => {
        setOpen(false);
        setAddFlowMode("room");
        setSelectedFloor(null);
        setModalCategory("");
        setModalBed("");
        setModalAc("");
        setAddFloorCount("1");
        setAddFloorEntries([]);
    };

    const handleAddFloorClick = () => {
        const floor = nextFloorNumber();
        setAddFlowMode("floor");
        setSelectedFloor(floor);
        setAddFloorCount("1");
        setAddFloorEntries([createEmptyFloorEntry()]);
        setOpen(true);
    };

    const handleAddFloorCountChange = (value: string) => {
        const normalized = value.replace(/\D/g, "");
        setAddFloorCount(normalized);

        const count = Number(normalized);
        if (!normalized || count < 1) {
            setAddFloorEntries([]);
            return;
        }

        setAddFloorEntries(prev =>
            Array.from({ length: count }, (_, index) => prev[index] ?? createEmptyFloorEntry())
        );
    };

    const handleAddFloorEntryRoomCountChange = (floorIndex: number, value: string) => {
        const normalized = value.replace(/\D/g, "");
        const roomCount = normalized === "" ? 0 : Number(normalized);

        setAddFloorEntries(prev =>
            prev.map((entry, index) => {
                if (index !== floorIndex) return entry;

                return {
                    ...entry,
                    roomCount: normalized,
                    roomDrafts: roomCount > 0
                        ? Array.from({ length: roomCount }, (_, draftIndex) => entry.roomDrafts[draftIndex] ?? createEmptyRoomDraft())
                        : [],
                };
            })
        );
    };

    const updateAddFloorDraft = (
        floorIndex: number,
        roomIndex: number,
        key: keyof AddFloorRoomDraft,
        value: string
    ) => {
        setAddFloorEntries(prev =>
            prev.map((entry, entryIndex) =>
                entryIndex === floorIndex
                    ? {
                        ...entry,
                        roomDrafts: entry.roomDrafts.map((draft, draftIndex) =>
                            draftIndex === roomIndex ? { ...draft, [key]: value } : draft
                        )
                    }
                    : entry
            )
        );
    };

    const addFloorCountValue = addFloorCount === "" ? 0 : Number(addFloorCount);
    const addFloorBaseNumber = addFlowMode === "floor" ? selectedFloor : null;
    const canSaveAddFloor =
        addFlowMode === "floor" &&
        addFloorCountValue > 0 &&
        addFloorBaseNumber !== null &&
        addFloorEntries.length === addFloorCountValue &&
        addFloorEntries.every(entry => {
            const roomCount = entry.roomCount === "" ? null : Number(entry.roomCount);

            if (roomCount === null || Number.isNaN(roomCount) || roomCount < 0) return false;
            if (roomCount === 0) return true;

            return entry.roomDrafts.length === roomCount &&
                entry.roomDrafts.every(draft =>
                    draft.category &&
                    draft.bed &&
                    draft.ac &&
                    resolveRoomTypeId(draft.category, draft.bed, draft.ac)
                );
        }
        );

    const handleAddFloorSave = async () => {
        if (!canSaveAddFloor || addFloorBaseNumber === null) return;

        const floorsToSave = addFloorEntries.map((_, index) => ({
            floor_number: addFloorBaseNumber + index,
            rooms_count: 0,
        }));

        const roomTypeEntries = addFloorEntries.flatMap((entry, floorIndex) =>
            entry.roomDrafts.map(draft => ({
                floorNumber: addFloorBaseNumber + floorIndex,
                roomTypeId: resolveRoomTypeId(draft.category, draft.bed, draft.ac),
            }))
        );

        if (roomTypeEntries.some(entry => !entry.roomTypeId)) {
            toast.error("Invalid room type combination");
            return;
        }

        const promise = (async () => {
            await bulkUpsertPropertyFloors({
                property_id: propertyId,
                floors: floorsToSave,
            }).unwrap();

            const createdRooms = [];

            for (const entry of roomTypeEntries) {
                createdRooms.push(await addRoom({
                    propertyId,
                    floorNumber: entry.floorNumber,
                    roomTypeId: entry.roomTypeId
                }).unwrap());
            }

            return { floors: floorsToSave, rooms: createdRooms };
        })();

        toast.promise(promise, {
            pending: "Saving floor details...",
            success: "Floor details saved successfully",
            error: "Error saving floor details"
        });

        try {
            await promise;
            setExpandedFloors(prev => ({
                ...prev,
                ...Object.fromEntries(floorsToSave.map(floor => [floor.floor_number, true])),
            }));
            await refetchRooms();
            await refetchPropertyFloors();
            resetAddSheetState();
        } catch {
            // Error feedback is handled by toast.promise.
        }
    };


    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    return (
        <div className="flex flex-col">
            <div className="p-6 lg:p-8">

                {/* Header Pattern: Title/Sub + Actions (Property Select + Call to Action) */}
                <div className="flex items-center justify-between w-full mb-6 relative z-20">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight text-foreground">
                            Rooms
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            View rooms grouped by floor
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        {isMultiProperty && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={propertyId ?? ""}
                                    onChange={(e) => setPropertyId(e.target.value)}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {myProperties?.properties?.map((property: any) => (
                                        <option key={property.id} value={property.id}>
                                            {property.brand_name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>
                        )}

                        {permission?.can_create && (
                            <Button
                                variant="hero"
                                className="h-10 px-4 flex items-center gap-2"
                                onClick={handleAddFloorClick}
                            >
                                <Plus className="w-4 h-4" /> Add Floor
                            </Button>
                        )}
                    </div>
                </div>



                {/* Floors */}
                <div className="space-y-6">
                    {roomsByFloor.map(({ floor, rooms }) => {
                        const isExpanded = expandedFloors[floor] !== false;
                        
                        return (
                            <div key={floor} className="border border-primary/10 rounded-xl overflow-hidden bg-primary/[0.02]">
                                {/* Floor title (Collapsible Trigger) */}
                                <div 
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                                    onClick={() => setExpandedFloors(prev => ({ ...prev, [floor]: !isExpanded }))}
                                >
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-foreground">
                                            Floor {floor}
                                        </h2>
                                        <span className="text-sm font-medium text-muted-foreground px-2 py-0.5 bg-background rounded-full border border-border">
                                            {rooms.length} rooms
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {permission?.can_create && isExpanded && (
                                            <button
                                                type="button"
                                                className="flex items-center gap-1.5 text-primary hover:underline text-sm font-medium transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAddFlowMode("room");
                                                    setSelectedFloor(floor);
                                                    setRoomType("STANDARD");
                                                    setOpen(true);
                                                }}
                                            >
                                                <PlusCircle className="w-4 h-4" /> Add New Room(s)
                                            </button>
                                        )}
                                        <div className={cn(
                                            "w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-transform duration-200",
                                            isExpanded ? "rotate-0" : "rotate-180"
                                        )}>
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Rooms grid */}
                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-2">
                                                    {rooms.map((room) => (
                                                        <div
                                                            key={room.id}
                                                            className={cn(
                                                                "group relative flex flex-col rounded-lg border border-primary/20 bg-primary/[0.04] shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200",
                                                                !room.is_active && "opacity-60 grayscale-[0.5]"
                                                            )}
                                                        >
                                                            {/* Card Header (Room No) */}
                                                            <div className="px-3 py-1.5 bg-primary text-white border-b border-primary/20 rounded-t-lg flex justify-between items-center transition-colors">
                                                                <span className="text-[10px] font-bold opacity-80 tracking-wide">Room</span>
                                                                <span className="text-sm font-bold">
                                                                    {room.room_no}
                                                                </span>
                                                            </div>

                                                            <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-center bg-background/40">
                                                                {/* Room Type Stack */}
                                                                <div className="space-y-1 text-center">
                                                                    {/* Category Dropdown */}
                                                                    <NativeSelect
                                                                        className="w-full bg-transparent text-[11px] font-medium text-center hover:bg-muted/50 rounded px-1 h-6 transition-all appearance-none cursor-pointer focus:ring-1 focus:ring-primary/20"
                                                                        value={getRoomSelectValue(room, "category")}
                                                                        onChange={(e) => {
                                                                            const category = e.target.value;
                                                                            const bed = getRoomSelectValue(room, "bed");
                                                                            const ac = getRoomSelectValue(room, "ac");
                                                                            const nextRoomTypeId = resolveRoomTypeId(category, bed, ac);
                                                                            if (nextRoomTypeId) {
                                                                                setEditedRooms(prev => prev.map(r => r.id === room.id ? { ...r, room_type_id: nextRoomTypeId } : r));
                                                                                setRoomDrafts(prev => { const { [room.id]: _, ...rest } = prev; return rest; });
                                                                            } else {
                                                                                setRoomDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], category } }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <option value="" disabled>Category</option>
                                                                        {roomCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                                    </NativeSelect>

                                                                    {/* Bed Dropdown */}
                                                                    <NativeSelect
                                                                        className="w-full bg-transparent text-[10px] text-muted-foreground text-center hover:bg-muted/50 rounded px-1 h-5 transition-all appearance-none cursor-pointer"
                                                                        value={getRoomSelectValue(room, "bed")}
                                                                        onChange={(e) => {
                                                                            const bed = e.target.value;
                                                                            const category = getRoomSelectValue(room, "category");
                                                                            const ac = getRoomSelectValue(room, "ac");
                                                                            const nextRoomTypeId = resolveRoomTypeId(category, bed, ac);
                                                                            if (nextRoomTypeId) {
                                                                                setEditedRooms(prev => prev.map(r => r.id === room.id ? { ...r, room_type_id: nextRoomTypeId } : r));
                                                                                setRoomDrafts(prev => { const { [room.id]: _, ...rest } = prev; return rest; });
                                                                            } else {
                                                                                setRoomDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], bed } }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <option value="" disabled>Bed Type</option>
                                                                        {bedTypes.map(b => <option key={b} value={b}>{b}</option>)}
                                                                    </NativeSelect>

                                                                    {/* AC Dropdown */}
                                                                    <NativeSelect
                                                                        className="w-full bg-transparent text-[10px] text-muted-foreground text-center hover:bg-muted/50 rounded px-1 h-5 transition-all appearance-none cursor-pointer"
                                                                        value={getRoomSelectValue(room, "ac")}
                                                                        onChange={(e) => {
                                                                            const ac = e.target.value;
                                                                            const category = getRoomSelectValue(room, "category");
                                                                            const bed = getRoomSelectValue(room, "bed");
                                                                            const nextRoomTypeId = resolveRoomTypeId(category, bed, ac);
                                                                            if (nextRoomTypeId) {
                                                                                setEditedRooms(prev => prev.map(r => r.id === room.id ? { ...r, room_type_id: nextRoomTypeId } : r));
                                                                                setRoomDrafts(prev => { const { [room.id]: _, ...rest } = prev; return rest; });
                                                                            } else {
                                                                                setRoomDrafts(prev => ({ ...prev, [room.id]: { ...prev[room.id], ac } }));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <option value="" disabled>AC Type</option>
                                                                        {acTypes.map(a => <option key={a} value={a}>{a}</option>)}
                                                                    </NativeSelect>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}

                    {roomsByFloor.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            No rooms found
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Update Action Bar */}
            <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    {getChangedRooms()?.length > 0
                        ? `${getChangedRooms().length} room(s) modified`
                        : "No changes made"}
                </span>

                {permission?.can_create && <Button
                    variant="hero"
                    disabled={getChangedRooms()?.length === 0}
                    onClick={handleBulkUpdate}
                >
                    Update Rooms
                </Button>}
            </div>


            <Sheet
                open={open}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                        setOpen(true);
                        return;
                    }

                    resetAddSheetState();
                }}
            >
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <SheetTitle className="text-xl font-bold">{addFlowMode === "floor" ? "Add Floor" : "Add Room"}</SheetTitle>
                        </SheetHeader>

                        {addFlowMode === "room" ? (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    Do you want to create a new room on{" "}
                                    <span className="font-medium text-foreground">
                                        Floor {selectedFloor}
                                    </span>
                                    ?
                                </p>

                                <div className="space-y-3">
                                    {/* Room Category */}
                                    <div className="space-y-1">
                                        <label htmlFor="room-modal-category" className="text-sm font-medium">Room Category</label>
                                        <NativeSelect
                                            id="room-modal-category"
                                            name="room_modal_category"
                                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={modalCategory}
                                            onChange={(e) => setModalCategory(e.target.value)}
                                        >
                                            <option value="">-- Please Select --</option>
                                            {roomCategories.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </NativeSelect>
                                    </div>

                                    {/* Bed Type */}
                                    <div className="space-y-1">
                                        <label htmlFor="room-modal-bed-type" className="text-sm font-medium">Bed Type</label>
                                        <NativeSelect
                                            id="room-modal-bed-type"
                                            name="room_modal_bed_type"
                                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={modalBed}
                                            onChange={(e) => setModalBed(e.target.value)}
                                        >
                                            <option value="">-- Please Select --</option>
                                            {bedTypes.map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </NativeSelect>
                                    </div>

                                    {/* AC Type */}
                                    <div className="space-y-1">
                                        <label htmlFor="room-modal-ac-type" className="text-sm font-medium">AC Type</label>
                                        <NativeSelect
                                            id="room-modal-ac-type"
                                            name="room_modal_ac_type"
                                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={modalAc}
                                            onChange={(e) => setModalAc(e.target.value)}
                                        >
                                            <option value="">-- Please Select --</option>
                                            {acTypes.map(a => (
                                                <option key={a} value={a}>{a}</option>
                                            ))}
                                        </NativeSelect>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <p className="text-sm text-muted-foreground">
                                    Enter how many floors to add. Set rooms to 0 to save an empty floor.
                                </p>

                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="space-y-1 w-full sm:w-[190px]">
                                        <Label htmlFor="add-floor-count" className="text-sm font-medium">Number of Floors to Add</Label>
                                        <Input
                                            id="add-floor-count"
                                            type="number"
                                            min={1}
                                            value={addFloorCount}
                                            onChange={(e) => handleAddFloorCountChange(e.target.value)}
                                            className="h-10 rounded-[3px] border-border bg-background text-sm"
                                        />
                                    </div>
                                </div>

                                {addFloorEntries.length > 0 && addFloorBaseNumber !== null && (
                                    <div className="space-y-5">
                                        {addFloorEntries.map((entry, floorIndex) => {
                                            const floorNumber = addFloorBaseNumber + floorIndex;

                                            return (
                                                <div
                                                    key={floorIndex}
                                                    className="rounded-lg border border-primary/10 bg-primary/[0.02] p-4 space-y-4"
                                                >
                                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                                        <h3 className="text-base font-bold text-foreground">
                                                            Floor {floorNumber}
                                                        </h3>
                                                        <div className="space-y-1 w-full sm:w-[180px]">
                                                            <Label htmlFor={`add-floor-${floorIndex}-room-count`} className="text-sm font-medium">Number of Rooms</Label>
                                                            <Input
                                                                id={`add-floor-${floorIndex}-room-count`}
                                                                type="number"
                                                                min={0}
                                                                value={entry.roomCount}
                                                                onChange={(e) => handleAddFloorEntryRoomCountChange(floorIndex, e.target.value)}
                                                                className="h-10 rounded-[3px] border-border bg-background text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    {entry.roomDrafts.length > 0 && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                            {entry.roomDrafts.map((draft, roomIndex) => (
                                                                <div
                                                                    key={roomIndex}
                                                                    className="group relative flex flex-col rounded-lg border border-primary/20 bg-primary/[0.04] shadow-sm"
                                                                >
                                                                    <div className="px-3 py-1.5 bg-primary text-white border-b border-primary/20 rounded-t-lg flex justify-between items-center">
                                                                        <span className="text-[10px] font-bold opacity-80 tracking-wide">Room</span>
                                                                        <span className="text-sm font-bold">{roomIndex + 1}</span>
                                                                    </div>

                                                                    <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-center bg-background/40">
                                                                        <NativeSelect
                                                                            className="w-full bg-transparent text-[11px] font-medium text-center hover:bg-muted/50 rounded px-1 h-6 transition-all appearance-none cursor-pointer focus:ring-1 focus:ring-primary/20"
                                                                            value={draft.category}
                                                                            onChange={(e) => updateAddFloorDraft(floorIndex, roomIndex, "category", e.target.value)}
                                                                        >
                                                                            <option value="" disabled>Category</option>
                                                                            {roomCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                                        </NativeSelect>

                                                                        <NativeSelect
                                                                            className="w-full bg-transparent text-[10px] text-muted-foreground text-center hover:bg-muted/50 rounded px-1 h-5 transition-all appearance-none cursor-pointer"
                                                                            value={draft.bed}
                                                                            onChange={(e) => updateAddFloorDraft(floorIndex, roomIndex, "bed", e.target.value)}
                                                                        >
                                                                            <option value="" disabled>Bed Type</option>
                                                                            {bedTypes.map(b => <option key={b} value={b}>{b}</option>)}
                                                                        </NativeSelect>

                                                                        <NativeSelect
                                                                            className="w-full bg-transparent text-[10px] text-muted-foreground text-center hover:bg-muted/50 rounded px-1 h-5 transition-all appearance-none cursor-pointer"
                                                                            value={draft.ac}
                                                                            onChange={(e) => updateAddFloorDraft(floorIndex, roomIndex, "ac", e.target.value)}
                                                                        >
                                                                            <option value="" disabled>AC Type</option>
                                                                            {acTypes.map(a => <option key={a} value={a}>{a}</option>)}
                                                                        </NativeSelect>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6 border-t flex justify-end gap-3 mt-6">
                        <Button
                            variant="heroOutline"
                            onClick={resetAddSheetState}
                            disabled={adding || savingFloors}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            disabled={
                                adding || savingFloors || (
                                    addFlowMode === "floor"
                                        ? !canSaveAddFloor
                                        : (!modalCategory || !modalBed || !modalAc)
                                )
                            }
                            onClick={async () => {
                                if (addFlowMode === "floor") {
                                    await handleAddFloorSave();
                                    return;
                                }

                                if (selectedFloor === null) return;

                                const roomTypeId = resolveRoomTypeId(
                                    modalCategory,
                                    modalBed,
                                    modalAc
                                );

                                if (!roomTypeId) {
                                    toast.error("Invalid room type combination");
                                    return;
                                }

                                try {
                                    const promise = addRoom({
                                        propertyId,
                                        floorNumber: selectedFloor,
                                        roomTypeId
                                    }).unwrap();

                                    toast.promise(promise, {
                                        pending: "Creating room...",
                                        success: "Room created successfully",
                                        error: "Error creating room"
                                    })
                                    resetAddSheetState();
                                } catch {
                                    toast.error("Failed to add room");
                                }
                            }}
                        >
                            {adding || savingFloors
                                ? addFlowMode === "floor" ? "Saving..." : "Adding..."
                                : addFlowMode === "floor" ? "Save" : "Add Room"}
                        </Button>

                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

        </div >
    );
}

