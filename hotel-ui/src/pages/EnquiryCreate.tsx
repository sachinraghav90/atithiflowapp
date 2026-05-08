import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAvailableRoomsQuery, useCreateEnquiryMutation, useGetMeQuery, useGetMyPropertiesQuery, useGetPackagesByPropertyQuery, useGetRoomTypesQuery } from "@/redux/services/hmsApi";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { usePermission } from "@/rbac/usePermission";
import { useLocation, useNavigate } from "react-router-dom";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { DataGrid, DataGridCell, DataGridHead, DataGridHeader, DataGridRow } from "@/components/ui/data-grid";
import { ValidationTooltip } from "@/components/ui/validation-tooltip";
import { Delete, Trash, Trash2, PlusCircle } from "lucide-react";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import PhonePrefixSelect from "@/components/forms/PhonePrefixSelect";
import { motion } from "framer-motion";
import { APP_DATE_INPUT_PLACEHOLDER, parseAppDate, toISODateOnly } from "@/utils/dateFormat";

type AvailableRoom = {
    id: string;
    room_no: string;
    floor_number: number;
    room_category_name: string;
    bed_type_name: string;
    ac_type_name: string;
    base_price: string;
};

function groupRoomsByFloor(rooms: AvailableRoom[]) {
    if (!rooms) return []
    const map: Record<number, AvailableRoom[]> = {};

    rooms.forEach((room) => {
        if (!map[room.floor_number]) {
            map[room.floor_number] = [];
        }
        map[room.floor_number].push(room);
    });

    return Object.entries(map).map(([floor, rooms]) => ({
        floor: Number(floor),
        rooms,
    }));
}


type EnquiryForm = {
    property_id: string;
    guest_name: string;
    country_code: string
    mobile: string;
    email: string;
    agent_type: string;
    room_details: {
        id: string;
        room_type: string;
        no_of_rooms: number;
    }[];
    check_in: string;
    check_out: string;
    follow_up_date: string;
    quote_amount: number;
    comment: string;
    contact_method: string;
    city: string;
    nationality: string;
    plan: string;
    total_members: string;
    senior_citizens: string;
    children: string;
    specially_abled: string;
    offer_amount: string;
    adults: string;
};

/* ---------------- Helpers ---------------- */
const parseDate = (v?: string) => parseAppDate(v);

const formatDate = (date: Date | null) => {
    return toISODateOnly(date);
};


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[0-9()]{10,15}$/;

const isValidEmail = (email: string) =>
    EMAIL_REGEX.test(email.trim());

const isValidPhone = (phone: string) =>
    PHONE_REGEX.test(phone.trim());


/* ---------------- Component ---------------- */
export default function EnquiryCreate() {
    const [form, setForm] = useState<EnquiryForm>({
        property_id: "",
        guest_name: "",
        country_code: "+91",
        mobile: "",
        email: "",
        agent_type: "",
        room_details: [
            { id: "room_1", room_type: "", no_of_rooms: 1 }
        ],
        check_in: "",
        check_out: "",
        follow_up_date: "",
        quote_amount: 0,
        comment: "",
        contact_method: "",
        city: "",
        nationality: "",
        plan: "",
        total_members: "",
        senior_citizens: "",
        children: "",
        specially_abled: "",
        offer_amount: "",
        adults: ""
    });
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [roomOpenId, setRoomOpenId] = useState<string | null>(null);

    const { data: availableRooms, isLoading: availableRoomsLoading, isUninitialized: isAvailableRoomUninitialized } = useAvailableRoomsQuery({ propertyId: selectedPropertyId, arrivalDate: form.check_in, departureDate: form.check_out }, {
        skip: !isLoggedIn || !selectedPropertyId || !form.check_in || !form.check_out
        // || !!arrivalError || !!departureError
    })

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data } = useGetMeQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: roomTypesData, isLoading: roomTypesLoading, isUninitialized: roomTypesUninitialized } = useGetRoomTypesQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: packages, isLoading: packagesLoading, isUninitialized: packageUninitialized } = useGetPackagesByPropertyQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })
    const [createEnquiry] = useCreateEnquiryMutation()

    const roomsByFloor = groupRoomsByFloor(availableRooms?.rooms);
    const roomTypes = useMemo(() => {
        const data = Array.isArray(roomTypesData?.data) ? roomTypesData.data : [];
        return data.map(type => ({
            ...type,
            full_name: `${type.room_category_name} ${type.ac_type_name} ${type.bed_type_name}`
        }));
    }, [roomTypesData]);

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    const todayISO = () => toISODateOnly(new Date());

    const nextDay = (date: string) => {
        if (!date) return todayISO();
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        return toISODateOnly(d);
    };

    const addRoomType = () => {
        const newId = `room_${Date.now()}`;
        setForm(prev => ({
            ...prev,
            room_details: [
                ...prev.room_details,
                { id: newId, room_type: "", no_of_rooms: 1 }
            ]
        }));
    };

    const removeRoomType = (roomId: string) => {
        setForm(prev => ({
            ...prev,
            room_details: prev.room_details.filter((room) => room.id !== roomId)
        }));
    };

    function validateEnquiryForm(
        form: EnquiryForm,
        propertyId: number | null
    ) {
        const errors: Record<string, string> = {};

        if (!propertyId)
            errors.property_id = "Property is required";

        if (!form.guest_name?.trim())
            errors.guest_name = "Guest name is required";

        if (!form.mobile?.trim())
            errors.mobile = "Mobile number is required";
        else if (!isValidPhone(form.mobile))
            errors.mobile = "Invalid mobile number";

        // if (!form.email?.trim())
        //     errors.email = "Email is required";
        else if (form.email?.trim() && !isValidEmail(form.email))
            errors.email = "Invalid email address";

        if (!form.check_in)
            errors.check_in = "Check-in date is required";

        if (!form.check_out)
            errors.check_out = "Check-out date is required";
        else if (new Date(form.check_out) <= new Date(form.check_in))
            errors.check_out = "Check-out must be after check-in";

        // if (!form.room_type)
        //     errors.room_type = "Room type is required";

        // if (!form.no_of_rooms || form.no_of_rooms < 1)
        //     errors.no_of_rooms = "At least 1 room is required";

        if (!form.room_details.length)
            errors.room_details = "At least one room type required";

        if (form.room_details.some(r => !r.room_type))
            errors.room_details = "Room type missing";

        if (form.room_details.some(r => r.no_of_rooms < 1))
            errors.room_details = "Invalid room count";


        if (form.quote_amount === undefined || form.quote_amount === null || form.quote_amount <= 0)
            errors.quote_amount = "Quote amount must be greater than 0";

        if (form.follow_up_date) {
            const followUp = new Date(form.follow_up_date);
            if (followUp < new Date()) {
                errors.follow_up_date = "Follow-up date cannot be in the past";
            }
        }

        // Convert string values to numbers for guest composition validation
        const totalMembers = parseInt(form.total_members) || 0;
        const seniors = parseInt(form.senior_citizens) || 0;
        const kids = parseInt(form.children) || 0;
        const speciallyAbled = parseInt(form.specially_abled) || 0;
        const adultCount = parseInt(form.adults) || 0;
        const compositionSum = seniors + kids + speciallyAbled + adultCount;

        if (totalMembers > 0 && totalMembers !== compositionSum) {
            errors.adults = "Check composition breakdown";
            errors.children = "Check composition breakdown";
            errors.senior_citizens = "Check composition breakdown";
            errors.total_members = "Total members must equal sum of composition";
            errors.specially_abled = "Check composition breakdown";
        }

        return errors;
    }

    function buildEnquiryPayload(form: EnquiryForm) {

        setSubmitted(true);

        const errors = validateEnquiryForm(form, selectedPropertyId);
        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            toast.error("Please fill all the fields");
            return;
        }

        const payload = {
            property_id: selectedPropertyId,
            booking_id: null,
            guest_name: form.guest_name,
            mobile: form.country_code + " " + form.mobile,
            email: form.email,
            source: "Walk-in",
            enquiry_type: "Room",
            status: "open",
            agent_type: form.agent_type,
            contact_method: form.contact_method,
            room_details: form.room_details.map(({ id, ...rest }) => rest),
            check_in: form.check_in,
            check_out: form.check_out,
            // booked_by: "Front Desk",
            comment: form.comment,
            follow_up_date: form.follow_up_date || undefined,
            quote_amount: form.quote_amount,
            is_reserved: false,
            city: form.city,
            nationality: form.nationality,
            plan: form.plan,
            total_members: form.total_members,
            senior_citizens: form.senior_citizens,
            children: form.children,
            specially_abled: form.specially_abled
        };
        const promise = createEnquiry(payload).unwrap().then(() => {
            navigate("/enquiries");
        });
        toast.promise(promise, {
            error: "Error creating enquiry",
            pending: "Creating enquiry, please wait",
            success: "Enquiry created"
        })
    }

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

    const { pathname } = useLocation()
    const { permission } = usePermission("/enquiries")
    const navigate = useNavigate()

    useEffect(() => {
        if (permission.can_create) return
        navigate("/unauthorized-access", {
            state: { endpoint: pathname }
        })
    }, [permission])

    useEffect(() => {
        setFormErrors({});
        setSubmitted(false);
    }, []);

return (
        <Sheet open onOpenChange={(nextOpen) => !nextOpen && navigate("/enquiries")}>
            <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <SheetHeader>
                        <SheetTitle>New Enquiry</SheetTitle>
                    </SheetHeader>


                    <div className="space-y-3 mt-4">

                        <FormSection
                            title="Guest Details"
                            description="Basic information about the guest"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Name*</Label>
                                    <Input
                                        className={cn(
                                            "bg-background",
                                            submitted && formErrors.guest_name && "border-red-500"
                                        )}
                                        value={form.guest_name}
                                        onChange={(e) => {
                                            setForm({ ...form, guest_name: e.target.value });
                                            setFormErrors(p => ({ ...p, guest_name: "" }));
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Agent Type</Label>
                                    <NativeSelect
                                        className="h-10 w-full rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={form.agent_type}
                                        onChange={(e) =>
                                            setForm({ ...form, agent_type: e.target.value })
                                        }
                                    >
                                        <option value="" disabled>-- Please Select --</option>
                                        <option value="TRAVEL">Travel</option>
                                        <option value="COMMISSION">Commission</option>
                                        <option value="OTA">OTA</option>
                                    </NativeSelect>
                                </div>

                                <div>
                                    <Label>Contact Method</Label>
                                    <NativeSelect
                                        className="h-10 w-full rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={form.contact_method}
                                        onChange={(e) =>
                                            setForm({ ...form, contact_method: e.target.value })
                                        }
                                    >
                                        <option value="" disabled>-- Please Select --</option>
                                        <option value="WALK_IN">Walk In</option>
                                        <option value="PHONE_CALL">Phone CALL</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="WHATSAPP">Whats App</option>
                                    </NativeSelect>
                                </div>

                                <div>
                                    <Label>Mobile*</Label>
                                    {/* <Input
                                        className={submitted && formErrors.mobile ? "border-red-500 bg-white" : "bg-white"}
                                        value={form.mobile}
                                        onChange={(e) => {
                                            setForm({ ...form, mobile: e.target.value.slice(0, 10) });
                                            setFormErrors(p => ({ ...p, mobile: "" }));
                                        }}
                                    /> */}
                                    <div className={cn(
                                        "flex h-10 w-full items-center rounded-[3px] border border-border bg-background transition-all focus-within:ring-1 focus-within:ring-primary overflow-hidden",
                                        submitted && formErrors.mobile && "border-red-500"
                                    )}>
                                        <PhonePrefixSelect
                                            value={form.country_code}
                                            triggerClassName="border-0 bg-transparent h-full w-[60px] rounded-none focus:ring-0 shadow-none px-2"
                                            onValueChange={(countryCode) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    country_code: countryCode,
                                                }))
                                            }
                                        />
                                        <div className="h-full w-[1px] bg-border" />
                                        <Input
                                            value={form.mobile}
                                            className="border-0 bg-transparent h-full flex-1 focus-visible:ring-0 shadow-none px-3"
                                            onChange={(e) => {
                                                if (/^\d*$/.test(e.target.value) && e.target.value.length <= 10) {
                                                    setForm(p => ({ ...p, mobile: e.target.value }));
                                                    setFormErrors(p => ({ ...p, mobile: "" }));
                                                }
                                            }}
                                            placeholder="Mobile number"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        className={submitted && formErrors.email ? "border-red-500 bg-background" : "bg-background"}
                                        value={form.email}
                                        onChange={(e) => {
                                            setForm({ ...form, email: e.target.value });
                                            setFormErrors(p => ({ ...p, email: "" }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label>City</Label>
                                    <Input
                                        className={submitted && formErrors.city ? "border-red-500 bg-background" : "bg-background"}
                                        value={form.city}
                                        onChange={(e) => {
                                            setForm({ ...form, city: e.target.value });
                                            setFormErrors(p => ({ ...p, city: "" }));
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Nationality</Label>
                                    <NativeSelect
                                        className="h-10 w-full rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={form.nationality}
                                        onChange={(e) =>
                                            setForm({ ...form, nationality: e.target.value })
                                        }
                                    >
                                        <option value="" disabled>-- Please Select --</option>
                                        <option value="indian">Indian</option>
                                        <option value="nri">NRI</option>
                                        <option value="foreigner">Foreigner</option>
                                    </NativeSelect>
                                </div>
                                <div>
                                    <Label>Plan</Label>
                                    <NativeSelect
                                        className="h-10 w-full rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={form.plan}
                                        onChange={(e) =>
                                            setForm({ ...form, plan: e.target.value })
                                        }
                                    >
                                        <option value="" disabled>-- Please Select --</option>
                                        {
                                            packages && packages?.packages.map((plan, i) => {
                                                return <option value={plan.package_name} key={i}>{plan.package_name}</option>
                                            })
                                        }
                                    </NativeSelect>
                                </div>

                                {(isSuperAdmin || isOwner) && (
                                    <div>
                                        <Label>Property</Label>
                                        <NativeSelect
                                            className="h-10 w-full rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={selectedPropertyId ?? ""}
                                            onChange={(e) =>
                                                setSelectedPropertyId(Number(e.target.value) || null)
                                            }
                                        >
                                            <option value="">All properties</option>
                                            {!myPropertiesLoading &&
                                                myProperties?.properties?.map((property) => (
                                                    <option key={property.id} value={property.id}>
                                                        {property.brand_name}
                                                    </option>
                                                ))}
                                        </NativeSelect>
                                    </div>
                                )}
                            </div>
                        </FormSection>

                        <FormSection
                            title="Stay Details"
                            description="Expected check-in and check-out dates"
                        >
                            <div className="space-y-4">
                                {/* Row 1: Senior Citizens & Children */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Senior Citizens</Label>
                                        <Input
                                            className={submitted && formErrors.senior_citizens ? "border-red-500 bg-background" : "bg-background"}
                                            value={form.senior_citizens}
                                            onChange={(e) => {
                                                setForm({ ...form, senior_citizens: normalizeNumberInput(e.target.value).toString() });
                                                setFormErrors(p => ({ ...p, senior_citizens: "" }));
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label>Children</Label>
                                        <Input
                                            className={submitted && formErrors.children ? "border-red-500 bg-background" : "bg-background"}
                                            value={form.children}
                                            onChange={(e) => {
                                                setForm({ ...form, children: normalizeNumberInput(e.target.value).toString() });
                                                setFormErrors(p => ({ ...p, children: "" }));
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Adult & Specially Abled */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Adult</Label>
                                        <Input
                                            type="text"
                                            className={submitted && formErrors.adults ? "border-red-500 bg-background" : "bg-background"}
                                            value={form.adults}
                                            onChange={(e) => {
                                                setForm({ ...form, adults: normalizeNumberInput(e.target.value).toString() });
                                                setFormErrors(p => ({ ...p, adults: "" }));
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label>Specially Abled</Label>
                                        <Input
                                            className={submitted && formErrors.specially_abled ? "border-red-500 bg-background" : "bg-background"}
                                            value={form.specially_abled}
                                            onChange={(e) => {
                                                setForm({ ...form, specially_abled: normalizeNumberInput(e.target.value).toString() });
                                                setFormErrors(p => ({ ...p, specially_abled: "" }));
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Total Members, Check-in, Check-out */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="sm:col-span-2">
                                        <Label>Total Members</Label>
                                        <Input
                                            readOnly
                                            className="bg-background cursor-not-allowed"
                                            value={(Number(form.senior_citizens || 0) + Number(form.children || 0) + Number(form.adults || 0) + Number(form.specially_abled || 0)).toString()}
                                        />
                                    </div>
                                    <div>
                                        <Label>Check-in*</Label>
                                        <ResponsiveDatePicker
                                            value={parseDate(form.check_in)}
                                            onChange={(d) => {
                                                const newCheckIn = formatDate(d);
                                                let newCheckOut = form.check_out;
                                                if (d && form.check_out) {
                                                    const currentOut = parseDate(form.check_out);
                                                    if (currentOut && d > currentOut) {
                                                        newCheckOut = ""; 
                                                    }
                                                }
                                                setForm({ ...form, check_in: newCheckIn, check_out: newCheckOut });
                                                setFormErrors(p => ({ ...p, check_in: "", check_out: "" }));
                                            }}
                                            placeholder={APP_DATE_INPUT_PLACEHOLDER}
                                            className={cn(submitted && formErrors.check_in && "border-red-500")}
                                        />
                                    </div>
                                    <div>
                                        <Label>Check-out*</Label>
                                        <ResponsiveDatePicker
                                            value={parseDate(form.check_out)}
                                            onChange={(d) => {
                                                setForm({ ...form, check_out: formatDate(d) });
                                                setFormErrors(p => ({ ...p, check_out: "" }));
                                            }}
                                            minDate={parseDate(form.check_in) || undefined}
                                            placeholder={APP_DATE_INPUT_PLACEHOLDER}
                                            className={cn(submitted && formErrors.check_out && "border-red-500")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            title="Room & Pricing"
                            description="Room preferences and quoted amount"
                        >
                            <div className="editable-grid-compact overflow-hidden rounded-[5px] border bg-background">
                                <div className="grid-scroll-x w-full border-b border-border bg-background">
                                    <div className="w-full min-w-[640px]">
                                        <DataGrid>
                                            <DataGridHeader>
                                                <DataGridHead>Room Type*</DataGridHead>
                                                <DataGridHead className="w-44">Rooms</DataGridHead>
                                                {form.room_details.length > 1 && (
                                                    <DataGridHead className="w-20 text-center">Action</DataGridHead>
                                                )}
                                            </DataGridHeader>

                                            <tbody>
                                                {form.room_details.map((room) => {
                                                    const isRoomTypeInvalid = submitted && !room.room_type;
                                                    const isRoomCountInvalid = submitted && room.no_of_rooms < 1;

                                                    return (
                                                        <DataGridRow key={room.id} className="odd:bg-background even:bg-background">
                                                            <DataGridCell>
                                                                <ValidationTooltip
                                                                    isValid={!isRoomTypeInvalid}
                                                                    message="Room type missing"
                                                                >
                                                                    <MenuItemSelect
                                                                        value={room.room_type}
                                                                        items={roomTypes}
                                                                        itemName="full_name"
                                                                        placeholder="--Please Select--"
                                                                        extraClasses={cn(
                                                                            "h-9 w-full rounded-[3px] border border-border bg-background px-2 py-1 text-sm font-normal shadow-none hover:bg-background text-left transition-colors duration-150",
                                                                            !room.room_type && "text-muted-foreground",
                                                                            isRoomTypeInvalid && "border-red-500"
                                                                        )}
                                                                        onSelect={(val) => {
                                                                            const existingRoom = form.room_details.find(r => r.room_type === val && r.id !== room.id);

                                                                            if (existingRoom) {
                                                                                setForm(prev => ({
                                                                                    ...prev,
                                                                                    room_details: prev.room_details
                                                                                        .map(r =>
                                                                                            r.id === existingRoom.id
                                                                                                ? { ...r, no_of_rooms: r.no_of_rooms + 1 }
                                                                                                : r.id === room.id
                                                                                                ? null
                                                                                                : r
                                                                                        )
                                                                                        .filter(Boolean) as typeof form.room_details
                                                                                }));
                                                                            } else {
                                                                                setForm(prev => ({
                                                                                    ...prev,
                                                                                    room_details: prev.room_details.map(r =>
                                                                                        r.id === room.id ? { ...r, room_type: String(val) } : r
                                                                                    )
                                                                                }));
                                                                            }
                                                                        }}
                                                                    />
                                                                </ValidationTooltip>
                                                            </DataGridCell>

                                                            <DataGridCell className="w-44">
                                                                <ValidationTooltip
                                                                    isValid={!isRoomCountInvalid}
                                                                    message="Invalid room count"
                                                                >
                                                                    <Input
                                                                        type="text"
                                                                        className={cn(
                                                                            "h-9 rounded-[3px] border border-border bg-background px-3 shadow-none focus-visible:ring-1 focus-visible:ring-primary",
                                                                            isRoomCountInvalid && "border-red-500"
                                                                        )}
                                                                        value={room.no_of_rooms}
                                                                        onChange={(e) => {
                                                                            const val = normalizeNumberInput(e.target.value);
                                                                            setForm(prev => ({
                                                                                ...prev,
                                                                                room_details: prev.room_details.map(r =>
                                                                                    r.id === room.id ? { ...r, no_of_rooms: val === "" ? 0 : Number(val) } : r
                                                                                )
                                                                            }));
                                                                        }}
                                                                    />
                                                                </ValidationTooltip>
                                                            </DataGridCell>

                                                            {form.room_details.length > 1 && (
                                                                <DataGridCell className="text-center">
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="mx-auto h-10 w-10 text-destructive transition-colors hover:text-destructive/80"
                                                                        onClick={() => removeRoomType(room.id)}
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </Button>
                                                                </DataGridCell>
                                                            )}
                                                        </DataGridRow>
                                                    );
                                                })}
                                            </tbody>
                                        </DataGrid>
                                    </div>
                                </div>

                                <div className="bg-muted/10 p-3">
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:underline"
                                        onClick={addRoomType}
                                    >
                                        <PlusCircle className="w-4 h-4" /> Add New Room Type(s)
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">

                                <div>
                                    <Label>Offer Amount</Label>
                                    <Input
                                        className={submitted && formErrors.offer_amount ? "border-red-500 bg-background" : "bg-background"}
                                        value={form.offer_amount}
                                        onChange={(e) => {
                                            setForm({ ...form, offer_amount: normalizeNumberInput(e.target.value).toString() });
                                            setFormErrors(p => ({ ...p, offer_amount: "" }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label>Quote Amount*</Label>
                                    <Input
                                        className={submitted && formErrors.quote_amount ? "border-red-500 bg-background" : "bg-background"}
                                        value={form.quote_amount}
                                        onChange={(e) => {
                                            setForm({ ...form, quote_amount: +normalizeNumberInput(e.target.value) });
                                            setFormErrors(p => ({ ...p, quote_amount: "" }));
                                        }}
                                    />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            title="Follow-up & Notes"
                            description="Optional follow-up and comments"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Follow-up Date</Label>
                                    <ResponsiveDatePicker
                                        value={parseDate(form.follow_up_date)}
                                        onChange={(d) => {
                                            setForm({ ...form, follow_up_date: formatDate(d) });
                                            setFormErrors(p => ({ ...p, follow_up_date: "" }));
                                        }}
                                        placeholder={APP_DATE_INPUT_PLACEHOLDER}
                                        className={cn(submitted && formErrors.follow_up_date && "border-red-500")}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Comments</Label>
                                <textarea
                                    className="w-full min-h-[90px] rounded-[3px] border border-border bg-background px-3 py-2 text-sm"
                                    value={form.comment}
                                    onChange={(e) =>
                                        setForm({ ...form, comment: e.target.value })
                                    }
                                />
                            </div>
                        </FormSection>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="heroOutline"
                                onClick={() => navigate("/enquiries")}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="hero"
                                onClick={() => {
                                    buildEnquiryPayload(form)
                                }}
                            >
                                Create Enquiry
                            </Button>

                        </div>
                    </div>
                </motion.div>
            </SheetContent>
        </Sheet>
    );
}

function FormSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background border border-border rounded-[5px] p-5 space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-primary/90">{title}</h3>
                {description && (
                    <p className="text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            {children}
        </div>
    );
}

