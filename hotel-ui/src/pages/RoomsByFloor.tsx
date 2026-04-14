import Sidebar from "@/components/layout/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { useGetRoomsQuery, useAddRoomMutation, useGetRoomTypesQuery, useBulkUpdateRoomsMutation, useGetMyPropertiesQuery } from "@/redux/services/hmsApi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hook";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Plus } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/rbac/usePermission";

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


export default function RoomsByFloor() {
    const [editedRooms, setEditedRooms] = useState<Room[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
    const [roomType, setRoomType] = useState("STANDARD");
    const [addedFloors, setAddedFloors] = useState<number[]>([]);
    const [modalCategory, setModalCategory] = useState("");
    const [modalBed, setModalBed] = useState("");
    const [modalAc, setModalAc] = useState("");
    const [roomDrafts, setRoomDrafts] = useState<
        Record<string, { category?: string; bed?: string; ac?: string }>
    >({});
    const [propertyId, setPropertyId] = useState<string>("");

    const [addRoom, { isLoading: adding }] = useAddRoomMutation();

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const location = useLocation()

    const id = location.state?.propertyId

    const { data: rooms } = useGetRoomsQuery(propertyId, {
        skip: !isLoggedIn || !propertyId
    })

    const { data: roomTypesData } = useGetRoomTypesQuery({ propertyId, page: 1, limit: 100 }, {
        skip: !isLoggedIn || !propertyId
    });

    const [updateRoomsBulk] = useBulkUpdateRoomsMutation()
    const { data: properties, isLoading: propertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    useEffect(() => {
        if (id) {
            setPropertyId(id);
            return;
        }

        if (
            !propertyId &&
            !propertiesLoading &&
            properties?.properties?.length > 0
        ) {
            setPropertyId(properties.properties[0].id);
        }
    }, [id, properties, propertiesLoading, propertyId]);


    useEffect(() => {
        setEditedRooms(rooms?.rooms);
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
        if (!editedRooms) return [];

        const floorMap: Record<number, Room[]> = {};

        // existing rooms
        editedRooms.forEach(room => {
            if (!floorMap[room.floor_number]) {
                floorMap[room.floor_number] = [];
            }
            floorMap[room.floor_number].push(room);
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
    }, [editedRooms, addedFloors]);

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


    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">

                {/* Header */}
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
                        <p className="text-sm text-muted-foreground">
                            View rooms grouped by floor
                        </p>
                    </div>

                    {permission?.can_create && <Button
                        variant="outline"
                        onClick={() => {
                            const existingFloors = roomsByFloor.map(f => f.floor);
                            const nextFloor =
                                existingFloors.length > 0
                                    ? Math.max(...existingFloors) + 1
                                    : 0;

                            if (!addedFloors.includes(nextFloor)) {
                                setAddedFloors(prev => [...prev, nextFloor]);
                            }

                            toast.success(`Floor ${nextFloor} added`);
                        }}
                    >
                        + Add Floor
                    </Button>}

                </div>

                {/* Property Filter */}
                {(isSuperAdmin || isOwner) && Array.isArray(properties?.properties) && properties?.properties.length > 1 && <div className="mb-4 max-w-sm space-y-2">
                    <Label>Property</Label>
                    <NativeSelect
                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                        value={propertyId}
                        onChange={(e) => setPropertyId(e.target.value)}
                    >
                        <option value="" disabled>Select Properties</option>

                        {!propertiesLoading &&
                            properties?.properties?.map((property) => (
                                <option key={property.id} value={property.id}>
                                    {property.brand_name}
                                </option>
                            ))}
                    </NativeSelect>

                </div>}

                {/* Floors */}
                <div className="space-y-10">
                    {roomsByFloor.map(({ floor, rooms }) => (
                        <div key={floor} className="space-y-4">
                            {/* Floor title */}
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-foreground">
                                    Floor {floor}
                                </h2>
                                <span className="text-sm text-muted-foreground">
                                    ({rooms.length} rooms)
                                </span>
                            </div>

                            {/* Rooms grid */}
                            <div
                                className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
                            >
                                {rooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={cn(
                                            "aspect-square rounded-[3px] border border-border p-3 flex flex-col justify-between transition",
                                            room.is_active ? "bg-card" : "bg-muted opacity-70"
                                        )}
                                    >
                                        {/* Room Number */}
                                        <input
                                            className="bg-transparent text-sm font-semibold text-center outline-none border-b border-border"
                                            value={room.room_no}
                                            disabled
                                            onChange={(e) =>
                                                setEditedRooms((prev) =>
                                                    prev.map((r) =>
                                                        r.id === room.id ? { ...r, room_no: e.target.value } : r
                                                    )
                                                )
                                            }
                                        />

                                        {/* Room Type */}
                                        <NativeSelect
                                            className="bg-transparent text-sm font-semibold text-center outline-none border-b border-border appearance-none cursor-pointer"
                                            value={getRoomSelectValue(room, "category")}
                                            onChange={(e) => {
                                                const category = e.target.value;

                                                const bed = getRoomSelectValue(room, "bed");
                                                const ac = getRoomSelectValue(room, "ac");

                                                const nextRoomTypeId = resolveRoomTypeId(category, bed, ac);

                                                if (nextRoomTypeId) {
                                                    setEditedRooms(prev =>
                                                        prev.map(r =>
                                                            r.id === room.id
                                                                ? { ...r, room_type_id: nextRoomTypeId }
                                                                : r
                                                        )
                                                    );
                                                    setRoomDrafts(prev => {
                                                        const { [room.id]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                } else {
                                                    setRoomDrafts(prev => ({
                                                        ...prev,
                                                        [room.id]: { ...prev[room.id], category }
                                                    }));
                                                }
                                            }}
                                        >


                                            <option value="" disabled>Category Type</option>
                                            {roomCategories.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </NativeSelect>
                                        <NativeSelect
                                            className="bg-transparent text-sm font-semibold text-center outline-none border-b border-border appearance-none cursor-pointer"
                                            value={getRoomSelectValue(room, "bed")}
                                            onChange={(e) => {
                                                const bed = e.target.value;

                                                const category = getRoomSelectValue(room, "category");
                                                const ac = getRoomSelectValue(room, "ac");

                                                const nextRoomTypeId = resolveRoomTypeId(category, bed, ac);

                                                if (nextRoomTypeId) {
                                                    setEditedRooms(prev =>
                                                        prev.map(r =>
                                                            r.id === room.id
                                                                ? { ...r, room_type_id: nextRoomTypeId }
                                                                : r
                                                        )
                                                    );
                                                    setRoomDrafts(prev => {
                                                        const { [room.id]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                } else {
                                                    setRoomDrafts(prev => ({
                                                        ...prev,
                                                        [room.id]: { ...prev[room.id], bed }
                                                    }));
                                                }
                                            }}
                                        >


                                            <option value="" disabled>Bed Type</option>
                                            {bedTypes.map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </NativeSelect>
                                        <NativeSelect
                                            className="bg-transparent text-sm font-semibold text-center outline-none border-b border-border appearance-none cursor-pointer"
                                            value={getRoomSelectValue(room, "ac")}
                                            onChange={(e) => {
                                                const ac = e.target.value;

                                                const category = getRoomSelectValue(room, "category");
                                                const bed = getRoomSelectValue(room, "bed");

                                                const nextRoomTypeId = resolveRoomTypeId(category, bed, ac);

                                                if (nextRoomTypeId) {
                                                    setEditedRooms(prev =>
                                                        prev.map(r =>
                                                            r.id === room.id
                                                                ? { ...r, room_type_id: nextRoomTypeId }
                                                                : r
                                                        )
                                                    );
                                                    setRoomDrafts(prev => {
                                                        const { [room.id]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                } else {
                                                    setRoomDrafts(prev => ({
                                                        ...prev,
                                                        [room.id]: { ...prev[room.id], ac }
                                                    }));
                                                }
                                            }}
                                        >


                                            <option value="" disabled>AC Type</option>
                                            {acTypes.map(a => (
                                                <option key={a} value={a}>{a}</option>
                                            ))}
                                        </NativeSelect>

                                        {/* Active Toggle */}
                                        {/* <div className="flex items-center justify-center mt-2">
                                                <Switch
                                                    checked={room.is_active}
                                                    onCheckedChange={(checked) =>
                                                        setEditedRooms((prev) =>
                                                            prev.map((r) =>
                                                                r.id === room.id ? { ...r, is_active: checked } : r
                                                            )
                                                        )
                                                    }
                                                />
                                            </div> */}
                                    </div>

                                ))}

                                {/* Add Room Card */}
                                {permission?.can_create && <div
                                    onClick={() => {
                                        setSelectedFloor(floor);
                                        setRoomType("STANDARD");
                                        setOpen(true);
                                    }}
                                    className="aspect-square rounded-[3px] border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted transition">
                                    <Plus className="h-8 w-8 text-muted-foreground" />
                                </div>}

                            </div>
                        </div>
                    ))}

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


            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Room</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
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

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={adding}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="hero"
                            disabled={
                                adding ||
                                !modalCategory ||
                                !modalBed ||
                                !modalAc
                            }
                            onClick={async () => {
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
                                    setOpen(false);
                                } catch {
                                    toast.error("Failed to add room");
                                }
                            }}
                        >
                            {adding ? "Adding..." : "Add Room"}
                        </Button>

                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}

