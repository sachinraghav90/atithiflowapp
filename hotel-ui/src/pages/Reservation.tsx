import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useAddGuestsByBookingMutation, useAvailableRoomsQuery, useCreateBookingMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useGetPropertyTaxQuery, useGetRoomTypesQuery, useUpdateEnquiryMutation } from "@/redux/services/hmsApi";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import countries from '../utils/countries.json'
import { usePermission } from "@/rbac/usePermission";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { NativeSelect } from "@/components/ui/native-select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { BookType, Check, ChevronDown } from "lucide-react";
import COUNTRY_CODES from '../utils/countryCode.json'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormDatePicker from "@/components/forms/FormDatePicker";
import FormDateRangePicker from "@/components/forms/FormDateRangePicker";
import FormSelect from "@/components/forms/FormSelect";
import { parseAppDate, toISODateOnly } from "@/utils/dateFormat";

/* -------------------- Types -------------------- */
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
};

type PropertyOption = {
    id: string;
    brand_name: string;
};

type PackageOption = {
    id: string;
    package_name: string;
};

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX =
    /^[0-9()]{10,15}$/;

const isValidEmail = (email: string) =>
    EMAIL_REGEX.test(email.trim());

const isValidPhone = (phone: string) =>
    PHONE_REGEX.test(phone.trim());

type FieldError = {
    type: "required" | "invalid";
    message: string;
};

/* -------------------- Component -------------------- */
export default function ReservationManagement() {

    const todayISO = () => toISODateOnly(new Date());
    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return toISODateOnly(d);
    };

    /* -------- Booking Form State -------- */
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [packageId, setPackageId] = useState<number | null>(null);
    const [bookingType, setBookingType] = useState("WALK_IN")

    const [arrivalDate, setArrivalDate] = useState(todayISO());
    const [departureDate, setDepartureDate] = useState(tomorrowISO());

    const [arrivalError, setArrivalError] = useState("");
    const [departureError, setDepartureError] = useState("");
    const isRoomCountManualChange = useRef(false);

    const [bookingNumbers, setBookingNumbers] = useState<{ adult: number | ""; child: number | "" }>({
        adult: 1,
        child: "",
    });
    const adult = bookingNumbers.adult;
    const child = bookingNumbers.child;
    const [guest, setGuest] = useState({
        id: "",
        temp_key: "",

        first_name: "",
        middle_name: "",
        last_name: "",

        phone: "",
        country_code: "+91",
        email: "",

        gender: "",
        salutation: "Mr",
        age: "",

        nationality: "",
        country: "",

        coming_from: "",
        going_to: "",

        address: "",

        guest_type: "ADULT",

        id_type: "Aadhaar Card",
        id_number: "",

        // for "Other" ID
        other_id_type: "",

        // visa (foreigner only)
        visa_number: "",
        visa_issue_date: "",
        visa_expiry_date: "",

        emergency_contact: "",
        emergency_contact_name: "",
    })
    const [comments, setComments] = useState("")
    const [advancePayment, setAdvancePayment] = useState<number | "">("")
    const [extraPerNight, setExtraPerNight] = useState<number | "">("")
    const [roomCount, setRoomCount] = useState<number | "">("");
    const [editableBasePrice, setEditableBasePrice] = useState<number | "">("");

    const [billingDetails, setBillingDetails] = useState({
        priceBeforeTax: 0,
        gstAmount: 0,
        roomTaxAmount: 0,
        discountAmount: 0,
        priceAfterTax: 0
    })

    const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
    const [discount, setDiscount] = useState<number | "">("");
    const [pickup, setPickup] = useState(false)
    const [drop, setDrop] = useState(false)

    const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([]);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)
    const [idProofFiles, setIdProofFiles] = useState<Record<string, File>>({});
    const [availableRoomCategory, setAvailableRoomCategory] = useState([])
    const [availableBedType, setAvailableBedType] = useState([])
    const [roomFilters, setRoomFilters] = useState({
        roomCategory: "",
        bedType: "",
        acType: "AC",
        floor: ""
    })
    const [floors, setFloors] = useState([])
    const [reservationErrors, setReservationErrors] = useState<Record<string, FieldError>>({});
    const [roomsModalOpen, setRoomsModalOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [openCountry, setOpenCountry] = useState(false);

    const enquiryPrefilled = useRef(false);

    const navigate = useNavigate()
    const location = useLocation();

    const enquiry = location.state?.enquiry;
    const fromEnquiry = location.state?.fromEnquiry;
    const enquiryId = location.state?.enquiryId;

    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const { data: packages, isLoading: packagesLoading, isUninitialized: packageUninitialized } = useGetPackagesByPropertyQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: availableRooms, isLoading: availableRoomsLoading, isUninitialized: isAvailableRoomUninitialized } = useAvailableRoomsQuery({ propertyId: selectedPropertyId, arrivalDate, departureDate }, {
        skip: !isLoggedIn || !selectedPropertyId || !arrivalDate || !departureDate || !!arrivalError || !!departureError
    })

    const { data: packageData } = useGetPackageByIdQuery({ packageId }, {
        skip: !packageId
    })

    const { data: propertyTax } = useGetPropertyTaxQuery(selectedPropertyId, {
        skip: !selectedPropertyId
    })

    const { data: roomTypesData, isLoading: roomTypesLoading, isUninitialized: roomTypesUninitialized } = useGetRoomTypesQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const roomTypes = useMemo(() => {
        return Array.isArray(roomTypesData?.data) ? roomTypesData.data : [];
    }, [roomTypesData]);

    const [createBooking, { isLoading: isBooking, data: bookingData, isSuccess: bookingSuccess, isUninitialized: bookingUninitialized, reset }] = useCreateBookingMutation()
    const [createGuest] = useAddGuestsByBookingMutation()
    const [updateEnquiry] = useUpdateEnquiryMutation()

    const validateReservation = () => {

        const errors: Record<string, {
            type: "required" | "invalid",
            message: string
        }> = {};

        /* -------- Property & Package -------- */

        if (!selectedPropertyId)
            errors.property_id = {
                type: "required",
                message: "Property is required"
            };

        if (!packageId)
            errors.package_id = {
                type: "required",
                message: "Package is required"
            };

        /* -------- Dates -------- */

        if (!arrivalDate)
            errors.arrivalDate = {
                type: "required",
                message: "Arrival date is required"
            };

        if (!departureDate)
            errors.departureDate = {
                type: "required",
                message: "Departure date is required"
            };

        if (arrivalError)
            errors.arrivalDate = {
                type: "invalid",
                message: arrivalError
            };

        if (departureError)
            errors.departureDate = {
                type: "invalid",
                message: departureError
            };

        /* -------- Rooms & Guests -------- */

        if (!adult || +adult < 1)
            errors.adult = {
                type: "invalid",
                message: "At least one adult is required"
            };

        if (selectedRooms.length === 0)
            errors.rooms = {
                type: "required",
                message: "Select at least one room"
            };

        /* -------- Guest Fields -------- */

        if (!guest.first_name?.trim())
            errors.first_name = {
                type: "required",
                message: "First name is required"
            };

        if (!guest.gender)
            errors.gender = {
                type: "required",
                message: "Gender is required"
            };

        if (!guest.age)
            errors.age = {
                type: "required",
                message: "Age is required"
            };

        if (!guest.phone)
            errors.phone = {
                type: "required",
                message: "Phone is required"
            };
        else if (!isValidPhone(guest.phone))
            errors.phone = {
                type: "invalid",
                message: "Invalid phone number"
            };

        if (guest.email && !isValidEmail(guest.email))
            errors.email = {
                type: "invalid",
                message: "Invalid email"
            };

        if (!guest.nationality)
            errors.nationality = {
                type: "required",
                message: "Nationality is required"
            };

        if (!guest.address)
            errors.address = {
                type: "required",
                message: "Address is required"
            };

        if (!guest.id_type && !guest.other_id_type)
            errors.other_id_type = {
                type: "required",
                message: "ID type is required"
            };

        if (!guest.id_number)
            errors.id_number = {
                type: "required",
                message: "ID number is required"
            };

        if (guest.emergency_contact && !isValidPhone(guest.emergency_contact))
            errors.emergency_contact = {
                type: "invalid",
                message: "Invalid emergency contact number"
            };

        /* -------- ID Proof -------- */

        if (!idProofFiles["0"])
            errors.id_proof = {
                type: "required",
                message: "ID proof is required"
            };

        /* -------- Foreigner -------- */

        if (guest.nationality === "foreigner") {

            if (!guest.country)
                errors.country = {
                    type: "required",
                    message: "Country is required"
                };

            if (!guest.visa_number)
                errors.visa_number = {
                    type: "required",
                    message: "Visa number is required"
                };

            if (!guest.visa_issue_date)
                errors.visa_issue_date = {
                    type: "required",
                    message: "Visa issue date is required"
                };

            if (!guest.visa_expiry_date)
                errors.visa_expiry_date = {
                    type: "required",
                    message: "Visa expiry date is required"
                };

            if (
                guest.visa_issue_date &&
                guest.visa_expiry_date &&
                new Date(guest.visa_expiry_date) <= new Date(guest.visa_issue_date)
            ) {
                errors.visa_expiry_date = {
                    type: "invalid",
                    message: "Visa expiry must be after issue date"
                };
            }
        }

        /* -------- Comments Rule -------- */

        if (discount && comments.length < 20) {
            errors.comments = {
                type: "invalid",
                message: "20 letters in comments are mandatory"
            };
        }

        return errors;
    };


    async function submitReservation() {
        const errors = validateReservation();
        setReservationErrors(errors);

        if (Object.keys(errors).length > 0) {
            toast.error("Please fill all the fields correctly"); // first error only
            return;
        }

        if (arrivalDate < todayISO()) {
            toast.error("arrival day is greater than today")
            return
        }

        const acText = `User chose ${roomFilters.acType} room`;
        let acTypeComment = ""
        if (!comments || comments.trim() === "") {
            acTypeComment = acText;
        } else {
            acTypeComment = `${comments}\n${acText}`;
        }


        const payload = {
            property_id: selectedPropertyId,
            package_id: packageId,
            booking_type: bookingType,
            booking_status: "CONFIRMED",
            booking_date: toISODateOnly(new Date()),
            estimated_arrival: arrivalDate,
            estimated_departure: departureDate,
            adult,
            child: child || 0,
            discount_type: discountType,
            discount,
            rooms: selectedRooms,
            price_before_tax: billingDetails.priceBeforeTax,
            discount_amount: billingDetails.discountAmount,
            price_after_discount: billingDetails.priceBeforeTax - billingDetails.discountAmount,
            gst_amount: billingDetails.gstAmount,
            room_tax_amount: billingDetails.roomTaxAmount,
            comments: acTypeComment,
            drop,
            pickup
        };

        const promise = createBooking(payload).unwrap()

        await toast.promise(promise, {
            pending: "Confirming your booking...",
            success: "Booking confirm",
            error: "Error creating booking"
        })

        const { booking } = await promise
        const { id } = booking

        fromEnquiry && updateEnquiry({
            id: enquiryId,
            payload: { status: "booked", is_reserved: true, booking_id: id }
        });

        resetForm()
    }

    /* -------------------- Derived -------------------- */
    const roomsByFloor = useMemo(() => {
        if (availableRoomsLoading || isAvailableRoomUninitialized) return []
        const map: Record<number, AvailableRoom[]> = {};
        availableRooms?.rooms?.forEach((room) => {
            if (!map[room.floor_number]) map[room.floor_number] = [];
            map[room.floor_number].push(room);
        });
        return Object.entries(map).map(([floor, rooms]) => ({
            floor: Number(floor),
            rooms,
        }));
    }, [availableRooms, availableRoomsLoading, isAvailableRoomUninitialized]);

    const allAvailableRoomIds = useMemo(() => {
        if (!availableRooms?.rooms) return [];
        return availableRooms.rooms.map((r: any) => Number(r.id));
    }, [availableRooms]);

    useEffect(() => {
        if (!availableRooms || !availableRooms.rooms) {
            setAvailableBedType([])
            setAvailableRoomCategory([])
            return
        }

        const availableRoomCategory = availableRooms.rooms.map((room) => room.room_category_name)
        const availableBedType = availableRooms.rooms.map((room) => room.bed_type_name)
        const availableFloors = availableRooms.rooms.map((room) => room.floor_number)
        setAvailableBedType(() => Array.from(new Set(availableBedType)))
        setAvailableRoomCategory(() => Array.from(new Set(availableRoomCategory)))
        setFloors(() => Array.from(new Set(availableFloors)))
    }, [availableRooms])

    useEffect(() => {
        if (!isRoomCountManualChange.current) return;
        if (roomCount === "") return;
        if (allAvailableRoomIds.length === 0) return;

        const shuffled = [...allAvailableRoomIds].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, roomCount);

        setSelectedRooms(selected.map((id) => ({ ref_room_id: id })));

        // reset flag
        isRoomCountManualChange.current = false;
    }, [roomCount, allAvailableRoomIds]);

    useEffect(() => {
        const interval = setInterval(() => {
            const today = todayISO();
            const tomorrow = tomorrowISO();

            if (arrivalDate < today) setArrivalDate(today);
            if (departureDate < tomorrow) setDepartureDate(tomorrow);
        }, 60000);

        return () => clearInterval(interval);
    }, [arrivalDate, departureDate]);

    const toggleRoom = (roomId: number) => {
        setSelectedRooms((prev) => {
            let updated: SelectedRoom[];

            if (prev.some((r) => r.ref_room_id === roomId)) {
                updated = prev.filter((r) => r.ref_room_id !== roomId);
            } else {
                updated = [...prev, { ref_room_id: roomId }];
            }

            setRoomCount(updated.length || "");

            return updated;
        });
    };

    const isAfter = (a: string, b: string) => {
        if (!a || !b) return true;
        return new Date(a) > new Date(b);
    };

    const handleBookingRangeChange = ([start, end]: [Date | null, Date | null]) => {
        const nextArrival = start ? formatDate(start) : "";
        const nextDeparture = end ? formatDate(end) : "";

        setArrivalDate(nextArrival);
        setDepartureDate(nextDeparture);

        if (nextArrival && nextArrival < todayISO()) {
            setArrivalError("Arrival date cannot be in the past");
        } else {
            setArrivalError("");
        }

        if (!nextDeparture) {
            setDepartureError("");
            return;
        }

        if (!nextArrival) {
            setDepartureError("Select arrival date first");
        } else if (!isAfter(nextDeparture, nextArrival)) {
            setDepartureError("Departure must be after arrival date");
        } else {
            setDepartureError("");
        }
    };

    const nextDay = (date: string) => {
        if (!date) return todayISO();
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        return toISODateOnly(d);
    };

    const getNights = (arrival: string, departure: string) => {
        if (!arrival || !departure) return 0;
        const start = new Date(arrival);
        const end = new Date(departure);
        const diffTime = end.getTime() - start.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const parseDate = (value?: string) =>
        parseAppDate(value);

    const formatDate = (date: Date | null) => {
        return toISODateOnly(date);
    };

    const selectedRoomNumbers = useMemo(() => {
        if (!availableRooms?.rooms) return "";
        return selectedRooms
            .map(sr => {
                const room = availableRooms.rooms.find(r => Number(r.id) === sr.ref_room_id);
                return room?.room_no;
            })
            .filter(Boolean)
            .join(", ");
    }, [selectedRooms, availableRooms]);

    useEffect(() => {
        if (!selectedPropertyId) {
            setPackageId(null);
            return;
        }
        setSelectedRooms([]);
        setRoomCount("")
    }, [selectedPropertyId]);

    useEffect(() => {
        if (!selectedPropertyId && myProperties?.properties?.length > 0) {
            setSelectedPropertyId(myProperties.properties[0].id);
        }
    }, [myProperties]);

    const roomBasePriceMap = useMemo(() => {
        const map = new Map<number, number>();

        availableRooms?.rooms?.forEach((room: any) => {
            map.set(Number(room.id), Number(room.base_price) || 0);
        });

        return map;
    }, [availableRooms]);

    useEffect(() => {
        if (!packageData || !propertyTax || !arrivalDate || !departureDate) return;

        const basePrice = Number(editableBasePrice) || 0;
        const extras = Number(extraPerNight) || 0;
        const { gst, room_tax_rate } = propertyTax;

        const nights = getNights(arrivalDate, departureDate);

        const selectedRoomTypes = selectedRooms.map((room) => availableRooms?.rooms.find(x => x.id == room.ref_room_id))
        const roomBaseTotal = selectedRoomTypes.reduce((sum, selRoom) => {
            const matchedType = roomTypes.find(rt =>
                rt.room_category_name === selRoom.room_category_name &&
                rt.bed_type_name === selRoom.bed_type_name &&
                rt.ac_type_name === roomFilters.acType
            );

            if (!matchedType) return sum;

            return sum + Number(matchedType.base_price || 0);
        }, 0);

        const priceBeforeTax = roomBaseTotal * nights + (basePrice + extras) * nights * +adult

        let discountedPrice = priceBeforeTax;

        if (discountType === "FLAT") {
            discountedPrice = priceBeforeTax - (Number(discount) || 0);
        } else {
            discountedPrice =
                (priceBeforeTax * (100 - (Number(discount) || 0))) / 100;
        }

        const discountAmount = priceBeforeTax - discountedPrice;
        const gstAmount = (discountedPrice * gst) / 100;
        const roomTaxAmount = (discountedPrice * room_tax_rate) / 100;

        setBillingDetails(prev => {
            const next = {
                priceBeforeTax,
                discountAmount,
                gstAmount,
                roomTaxAmount,
                priceAfterTax: discountedPrice + gstAmount + roomTaxAmount,
            };

            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
    }, [
        packageData,
        propertyTax,
        arrivalDate,
        departureDate,
        selectedRooms,
        extraPerNight,
        discount,
        discountType,
        editableBasePrice,
        adult,
        roomFilters.acType
    ]);

    useEffect(() => {
        if (packageData?.data?.base_price != null) {
            setEditableBasePrice(Number(packageData.data.base_price));
        }
    }, [packageData]);

    const resetForm = () => {
        setArrivalDate("");
        setDepartureDate("");
        setArrivalError("");
        setDepartureError("");

        setBookingNumbers({ adult: 1, child: "" });

        setDiscount("");
        setDiscountType("PERCENT");

        setSelectedRooms([]);

        setBillingDetails({
            priceBeforeTax: 0,
            gstAmount: 0,
            roomTaxAmount: 0,
            discountAmount: 0,
            priceAfterTax: 0
        });
    };

    useEffect(() => {
        (async () => {
            if (!bookingData || !bookingSuccess) return
            const bookingId = bookingData?.booking?.id
            if (!bookingId) return

            const formData = new FormData();

            const normalizedGuest = {
                ...guest,
                phone: guest.country_code + " " + guest.phone,
                // dob: guest.dob
                //     ? formatDate(guest.dob)
                //     : null,
                id_type:
                    guest.id_type === ""
                        ? guest.other_id_type
                        : guest.id_type,

                // auto-null visa if not foreigner
                visa_number: guest.nationality === "foreigner" ? guest.visa_number : null,
                visa_issue_date: guest.nationality === "foreigner" ? guest.visa_issue_date : null,
                visa_expiry_date: guest.nationality === "foreigner" ? guest.visa_expiry_date : null,
            };


            formData.append("guests", JSON.stringify([{ ...normalizedGuest, guest_type: "ADULT", temp_key: "0" }]));

            const idProofMap: Record<string, number> = {};
            let index = 0;

            Object.entries(idProofFiles).forEach(([key, file]) => {
                formData.append("id_proofs", file);
                idProofMap[key] = index++;
            });

            formData.append("id_proof_map", JSON.stringify(idProofMap));

            await createGuest({ formData, bookingId }).unwrap()
            navigate("/bookings")
            reset()
        })()

    }, [isBooking, bookingData, bookingSuccess])

    useEffect(() => {
        if (!fromEnquiry || !enquiry || enquiryPrefilled.current) return;

        enquiryPrefilled.current = true;

        // 🔹 Property
        if (enquiry.property_id) {
            setSelectedPropertyId(Number(enquiry.property_id));
        }

        // 🔹 Dates
        if (enquiry.check_in) {
            setArrivalDate(enquiry.check_in);
        }

        if (enquiry.check_out) {
            setDepartureDate(enquiry.check_out);
        }

        // 🔹 Guest info
        setGuest((prev) => ({
            ...prev,
            first_name: enquiry.guest_name?.split(" ")[0] || "",
            last_name: enquiry.guest_name?.split(" ").slice(1).join(" ") || "",
            phone: enquiry.mobile || "",
            email: enquiry.email || "",
        }));

        // 🔹 Rooms count (not selecting rooms)
        if (enquiry.no_of_rooms) {
            setRoomCount(Number(enquiry.no_of_rooms));
        }

        // 🔹 Comments
        if (enquiry.comment) {
            setComments(enquiry.comment);
        }

        // 🔹 Quote → advance payment (optional logic)
        if (enquiry.quote_amount) {
            setAdvancePayment(Number(enquiry.quote_amount));
        }

        // 🔹 Mark enquiry-origin booking
        setComments((prev) =>
            prev
                ? `${prev}\n(Generated from enquiry #${enquiry.id})`
                : `Generated from enquiry #${enquiry.id}`
        );

    }, [fromEnquiry, enquiry]);

    const handleFile = (key: string, file?: File) => {
        if (!file) return;
        setIdProofFiles((p) => ({ ...p, [key]: file }));
    };

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
    const { permission } = usePermission("/bookings")

    useEffect(() => {
        if (permission.can_create) return
        navigate("/login", {
            state: { endpoint: pathname }
        })
    }, [permission])

    const phoneError = reservationErrors.phone;

    const hoverError =
        phoneError?.type === "required"
            ? phoneError.message
            : "";


    /* -------------------- UI -------------------- */
    return (
        <Sheet open onOpenChange={(nextOpen) => !nextOpen && navigate("/bookings")}>
            <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <SheetHeader>
                        <SheetTitle>New Booking</SheetTitle>
                    </SheetHeader>

                    {/* =================== BOOKING FORM =================== */}
                    {fromEnquiry && (
                        <div className="mb-4 rounded-[3px] bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                            Creating booking from enquiry
                        </div>
                    )}

                    <div className="space-y-1">


                        <CardSection title="Basic Booking Details" subtitle="Package, stay duration and guests">
                            <Grid>

                                {/* PROPERTY */}

                                {(isSuperAdmin || isOwner) && (
                                    <FormSelect
                                        label="Property"
                                        field="property_id"
                                        value={{ property_id: selectedPropertyId }}
                                        setValue={(fn: any) => {
                                            const updated = fn({ property_id: selectedPropertyId });
                                            setSelectedPropertyId(Number(updated.property_id) || null);
                                        }}
                                        errors={reservationErrors}
                                        setErrors={setReservationErrors}
                                        required
                                    >
                                        <option value="" disabled>-- Please Select --</option>

                                        {!myPropertiesLoading &&
                                            myProperties?.properties?.map((property) => (
                                                <option key={property.id} value={property.id}>
                                                    {property.brand_name}
                                                </option>
                                            ))}
                                    </FormSelect>
                                )}


                                {/* PLAN */}

                                <FormSelect
                                    label="Plan"
                                    field="package_id"
                                    value={{ package_id: packageId }}
                                    setValue={(fn: any) => {
                                        const updated = fn({ package_id: packageId });
                                        setPackageId(Number(updated.package_id) || null);
                                    }}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    viewMode={!selectedPropertyId}
                                >
                                    <option value="">-- Please Select --</option>

                                    {!packageUninitialized && !packagesLoading &&
                                        packages?.packages
                                            .filter(pkg => pkg.is_active)
                                            .map(pkg => (
                                                <option key={pkg.id} value={pkg.id}>
                                                    {pkg.package_name}
                                                </option>
                                            ))}
                                </FormSelect>


                                {/* AC TYPE */}

                                <FormSelect
                                    label="AC Type"
                                    field="acType"
                                    value={roomFilters}
                                    setValue={setRoomFilters}
                                    errors={{}}
                                >
                                    <option value="AC">AC</option>
                                    <option value="Non-AC">Non-AC</option>
                                </FormSelect>


                                {/* ADULTS */}

                                <FormInput
                                    label="Adults"
                                    field="adult"
                                    value={bookingNumbers}
                                    setValue={setBookingNumbers}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    transform={normalizeNumberInput}
                                />


                                {/* CHILDREN */}

                                <FormInput
                                    label="Children"
                                    field="child"
                                    value={bookingNumbers}
                                    setValue={setBookingNumbers}
                                    errors={{}}
                                    setErrors={() => { }}
                                    type="number"
                                />


                                {/* ARRIVAL DATE */}
                                <FormDatePicker
                                    label="Arrival Date"
                                    field="arrivalDate"
                                    selected={parseDate(arrivalDate)}
                                    onChange={(date: Date | null) => {
                                        if (!date) return;
                                        const val = toISODateOnly(date);
                                        setArrivalDate(val);
                                        
                                        // Auto-bump departure if needed
                                        const d = new Date(val);
                                        d.setDate(d.getDate() + 1);
                                        const nextDay = toISODateOnly(d);
                                        if (new Date(departureDate) <= new Date(val)) {
                                            setDepartureDate(nextDay);
                                        }
                                    }}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    minDate={new Date()}
                                />

                                {/* DEPARTURE DATE */}
                                <FormDatePicker
                                    label="Departure Date"
                                    field="departureDate"
                                    selected={parseDate(departureDate)}
                                    onChange={(date: Date | null) => {
                                        if (!date) return;
                                        const val = toISODateOnly(date);
                                        setDepartureDate(val);
                                    }}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    minDate={(() => {
                                        const d = new Date(arrivalDate);
                                        d.setDate(d.getDate() + 1);
                                        return d;
                                    })()}
                                />

                                {/* BOOKING TYPE */}

                                <FormSelect
                                    label="Booking Type"
                                    field="booking_type"
                                    value={{ booking_type: bookingType }}
                                    setValue={(fn: any) => {
                                        const updated = fn({ booking_type: bookingType });
                                        setBookingType(updated.booking_type);
                                    }}
                                    errors={{}}
                                    setErrors={() => { }}
                                >
                                    <option value="WALK_IN">Walk In</option>
                                    <option value="OTA">OTA</option>
                                    <option value="AGENT">Agent</option>
                                    <option value="ONLINE">Online</option>
                                </FormSelect>


                                {/* ROOMS SELECTOR */}

                                <div className="space-y-2">

                                    <Label
                                        title={
                                            reservationErrors.rooms?.type === "required"
                                                ? reservationErrors.rooms.message
                                                : ""
                                        }
                                    >
                                        Rooms*
                                    </Label>

                                    <div className="flex gap-2 items-center">

                                        {/* Selected rooms text */}
                                        <div className={`flex-1 text-sm text-muted-foreground ${selectedRoomNumbers.length > 0 ? "cursor-pointer" : ""}`}
                                            onClick={() => {
                                                if (selectedRoomNumbers.length > 0) {
                                                    setRoomsModalOpen(true);
                                                }
                                            }}
                                        >
                                            {selectedRoomNumbers || "No rooms selected"}
                                        </div>

                                        {/* Open popup */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                reservationErrors.rooms && "border-red-500"
                                            )}
                                            onClick={() => {
                                                setRoomsModalOpen(true);

                                                setReservationErrors(e => {
                                                    const next = { ...e };
                                                    delete next.rooms;
                                                    return next;
                                                });
                                            }}
                                            disabled={!arrivalDate || !departureDate || !selectedPropertyId}
                                        >
                                            Select Rooms
                                        </Button>

                                    </div>

                                </div>


                            </Grid>

                        </CardSection>


                        <CardSection title="Guest Personal Information" subtitle="Primary guest identity">
                            <Grid>

                                {/* SALUTATION */}
                                <div className="flex gap-2">

                                    {/* SALUTATION — minimal width */}
                                    <div className="w-16 shrink-0">

                                        <FormSelect
                                            label={"\u00A0"}
                                            field="salutation"
                                            value={guest}
                                            setValue={setGuest}
                                            errors={reservationErrors}
                                            setErrors={setReservationErrors}
                                        >
                                            <option value="Mr">Mr</option>
                                            <option value="Mrs">Mrs</option>
                                            <option value="Ms">Ms</option>
                                        </FormSelect>

                                    </div>

                                    {/* FIRST NAME — remaining width */}
                                    <div className="flex-1">

                                        <FormInput
                                            label="First Name"
                                            field="first_name"
                                            value={guest}
                                            setValue={setGuest}
                                            errors={reservationErrors}
                                            setErrors={setReservationErrors}
                                            required
                                            maxLength={100}
                                        />

                                    </div>

                                </div>


                                {/* MIDDLE NAME */}

                                <FormInput
                                    label="Middle Name"
                                    field="middle_name"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    maxLength={100}
                                />


                                {/* LAST NAME */}

                                <FormInput
                                    label="Last Name"
                                    field="last_name"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    transform={normalizeTextInput}
                                    maxLength={100}
                                />


                                {/* GENDER */}

                                <FormSelect
                                    label="Gender"
                                    field="gender"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                >
                                    <option value="" disabled>Select gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </FormSelect>


                                {/* AGE */}

                                <FormInput
                                    label="Age"
                                    field="age"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    transform={(v) => normalizeNumberInput(v).toString()}
                                    maxLength={3}
                                />


                                {/* NATIONALITY */}

                                <FormSelect
                                    label="Nationality"
                                    field="nationality"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                >
                                    <option value="">-- Please Select --</option>
                                    <option value="indian">Indian</option>
                                    <option value="nri">NRI</option>
                                    <option value="foreigner">Foreigner</option>
                                </FormSelect>


                                {/* COUNTRY (popover stays custom) */}

                                {guest.nationality === "foreigner" && (
                                    <div className="space-y-2">
                                        <Label title={reservationErrors.country?.type === "required"
                                            ? reservationErrors.country.message : ""}>
                                            Country*
                                        </Label>

                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full h-10 justify-between bg-background",
                                                        reservationErrors.country && "border-red-500"
                                                    )}
                                                >
                                                    {guest.country || "Select country"}
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>

                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search country..." />
                                                    <CommandGroup className="max-h-60 overflow-y-auto">
                                                        {countries.map((country) => (
                                                            <CommandItem
                                                                key={country}
                                                                value={country}
                                                                onSelect={() => {
                                                                    setGuest(prev => ({ ...prev, country }));
                                                                    setReservationErrors(prev => {
                                                                        const next = { ...prev };
                                                                        delete next.country;
                                                                        return next;
                                                                    })
                                                                    setOpen(false);
                                                                }}
                                                            >
                                                                {country}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}


                                {/* PHONE (custom because prefix + input combo) */}

                                <div className="space-y-2">

                                    {/* SINGLE LABEL */}
                                    <Label>Phone</Label>

                                    <div className="flex gap-[2px]">

                                        {/* COUNTRY CODE */}
                                        <div className="shrink-0">

                                            <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "h-10 bg-background justify-between rounded-r-none",
                                                            reservationErrors.country_code && "border-red-500"
                                                        )}
                                                    >
                                                        {guest.country_code || "Code"}
                                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>

                                                <PopoverContent className="w-[220px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search country..." />
                                                        <CommandEmpty>No country found</CommandEmpty>

                                                        <CommandGroup
                                                            className="max-h-60 overflow-y-auto"
                                                            onWheel={(e) => e.stopPropagation()}
                                                        >
                                                            {COUNTRY_CODES.map((c) => (
                                                                <CommandItem
                                                                    key={c.country_code}
                                                                    value={`${c.country_name_code} ${c.country_code}`}
                                                                    onSelect={() => {

                                                                        setGuest(prev => ({
                                                                            ...prev,
                                                                            country_code: c.country_code
                                                                        }))
                                                                        setOpenCountry(false);
                                                                    }}
                                                                >
                                                                    <Check className="mr-2 h-4 w-4 opacity-0" />
                                                                    {c.country_name_code} ({c.country_code})
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                        </div>

                                        {/* PHONE INPUT */}
                                        <div className="flex-1 ms-[2px]">

                                            <Input
                                                value={guest.phone || ""}
                                                title={hoverError}
                                                className={cn(
                                                    "h-10 bg-background rounded-l-none",
                                                    reservationErrors.phone && "border-red-500"
                                                )}
                                                onChange={(e) => {

                                                    const v = e.target.value;

                                                    if (v.length <= 15) {
                                                        setGuest(prev => ({
                                                            ...prev,
                                                            phone: normalizeTextInput(v)
                                                        }));

                                                        setReservationErrors(prev => {
                                                            const next = { ...prev };
                                                            delete next.phone;
                                                            return next;
                                                        });
                                                    }
                                                }}
                                            />

                                        </div>

                                    </div>

                                </div>


                                {/* EMAIL */}

                                <FormInput
                                    label="Email"
                                    field="email"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                />


                                {/* COMING FROM */}

                                <FormInput
                                    label="Coming from"
                                    field="coming_from"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                />


                                {/* GOING TO */}

                                <FormInput
                                    label="Going to"
                                    field="going_to"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                />


                                {/* FOREGINER FIELDS */}

                                {guest.nationality === "foreigner" && (

                                    <>

                                        <FormInput
                                            label="Visa Number"
                                            field="visa_number"
                                            value={guest}
                                            setValue={setGuest}
                                            errors={reservationErrors}
                                            setErrors={setReservationErrors}
                                            required
                                        />

                                        <FormDatePicker
                                            label="Visa Issue Date"
                                            field="visa_issue_date"
                                            selected={parseDate(guest.visa_issue_date)}
                                            onChange={(d: any) => {
                                                setGuest(prev => ({ ...prev, visa_issue_date: formatDate(d) }))
                                            }}
                                            errors={reservationErrors}
                                            setErrors={setReservationErrors}
                                            required
                                        />

                                        <FormDatePicker
                                            label="Visa Expiry Date"
                                            field="visa_expiry_date"
                                            selected={parseDate(guest.visa_expiry_date)}
                                            onChange={(d: any) => {
                                                setGuest(prev => ({ ...prev, visa_expiry_date: formatDate(d) }))
                                            }}
                                            errors={reservationErrors}
                                            setErrors={setReservationErrors}
                                            required
                                        />

                                    </>

                                )}

                            </Grid>

                        </CardSection>

                        <CardSection title="Address & Identification" subtitle="Verification details">
                            <Grid>

                                {/* ADDRESS */}

                                <FormInput
                                    label="Address"
                                    field="address"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    maxLength={255}
                                />


                                {/* ID TYPE */}

                                <FormSelect
                                    label="ID Type"
                                    field="id_type"
                                    value={{
                                        id_type: guest.id_type || (guest.other_id_type ? "Other" : "")
                                    }}
                                    setValue={(fn: any) => {

                                        const updated = fn({
                                            id_type: guest.id_type || (guest.other_id_type ? "Other" : "")
                                        });

                                        const val = updated.id_type;

                                        if (val === "Other") {
                                            setGuest(prev => ({
                                                ...prev,
                                                id_type: "",
                                            }));
                                        } else {
                                            setGuest(prev => ({
                                                ...prev,
                                                id_type: val,
                                                other_id_type: "",
                                            }));
                                        }
                                    }}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                >
                                    <option value="Aadhaar Card">Aadhaar Card</option>
                                    <option value="APAAR Id">APAAR Id</option>
                                    <option value="Driving License">Driving License</option>
                                    <option value="PAN Card">PAN Card</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Voter ID">Voter ID</option>
                                    <option value="Other">Other</option>
                                </FormSelect>


                                {/* OTHER ID TYPE */}

                                {guest.id_type === "" && (

                                    <FormInput
                                        label="Other Id type"
                                        field="other_id_type"
                                        value={guest}
                                        setValue={setGuest}
                                        errors={reservationErrors}
                                        setErrors={setReservationErrors}
                                        required
                                        maxLength={50}
                                    />

                                )}


                                {/* ID NUMBER */}

                                <FormInput
                                    label="ID Number"
                                    field="id_number"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    required
                                    maxLength={100}
                                />


                                {/* FILE INPUT (keep custom) */}

                                <div className="space-y-2">

                                    <Label
                                        title={reservationErrors.id_proof?.type === "required"
                                            ? reservationErrors.id_proof.message
                                            : ""}
                                    >
                                        ID Proof*
                                    </Label>

                                    <Input
                                        className={cn(
                                            "bg-background",
                                            reservationErrors.id_proof && "border-red-500"
                                        )}
                                        disabled={isBooking}
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {

                                            handleFile("0", e.target.files?.[0]);

                                            setReservationErrors(prev => {
                                                const next = { ...prev };
                                                delete next.id_proof;
                                                return next;
                                            });
                                        }}
                                    />

                                    {reservationErrors.id_proof?.type === "invalid" && (
                                        <p className="text-xs text-red-500">
                                            {reservationErrors.id_proof.message}
                                        </p>
                                    )}

                                </div>

                            </Grid>

                        </CardSection>

                        <CardSection title="Emergency Contact" subtitle="For safety and compliance">
                            <Grid cols={2}>

                                {/* EMERGENCY CONTACT NAME */}

                                <FormInput
                                    label="Emergency Contact Name"
                                    field="emergency_contact_name"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    maxLength={150}
                                />


                                {/* EMERGENCY CONTACT NUMBER */}

                                <FormInput
                                    label="Emergency Contact Number"
                                    field="emergency_contact"
                                    value={guest}
                                    setValue={setGuest}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    transform={(v: string) => {

                                        // allow only numbers + max length 10
                                        // if (!/^\d*$/.test(v)) return guest.emergency_contact;
                                        if (v.length > 15) return guest.emergency_contact;

                                        return v;
                                    }}
                                />

                            </Grid>

                        </CardSection>

                        <CardSection title="Booking Add-ons" subtitle="Extra services">
                            <Grid cols={2}>

                                {/* EXTRAS PER NIGHT */}

                                <FormInput
                                    label="Extras Per Night"
                                    field="extraPerNight"
                                    value={{ extraPerNight }}
                                    setValue={(fn: any) => {

                                        const updated = fn({ extraPerNight });

                                        setExtraPerNight(
                                            Math.abs(+normalizeNumberInput(updated.extraPerNight))
                                        );
                                    }}
                                    errors={{}}
                                    setErrors={() => { }}
                                    type="number"
                                    viewMode={isBooking}
                                />


                                {/* ADVANCE PAYMENT */}

                                <FormInput
                                    label="Advance Payment"
                                    field="advancePayment"
                                    value={{ advancePayment }}
                                    setValue={(fn: any) => {

                                        const updated = fn({ advancePayment });

                                        setAdvancePayment(
                                            Math.abs(+normalizeNumberInput(updated.advancePayment))
                                        );
                                    }}
                                    errors={{}}
                                    setErrors={() => { }}
                                    type="number"
                                    viewMode={isBooking}
                                />


                                {/* PICKUP TOGGLE */}

                                <Toggle
                                    label="Pickup"
                                    checked={pickup}
                                    onChange={setPickup}
                                />


                                {/* DROP TOGGLE */}

                                <Toggle
                                    label="Drop"
                                    checked={drop}
                                    onChange={setDrop}
                                />

                            </Grid>

                        </CardSection>

                        <CardSection title="Discount & Special Request" subtitle="Offers and notes">
                            <Grid cols={2}>

                                {/* DISCOUNT TYPE */}

                                <FormSelect
                                    label="Discount Type"
                                    field="discountType"
                                    value={{ discountType }}
                                    setValue={(fn: any) => {

                                        const updated = fn({ discountType });

                                        setDiscountType(updated.discountType);
                                    }}
                                    errors={{}}
                                    setErrors={() => { }}
                                >
                                    <option value="PERCENT">Percent (%)</option>
                                    <option value="FLAT">Flat</option>
                                </FormSelect>


                                {/* DISCOUNT */}

                                <FormInput
                                    label="Discount"
                                    field="discount"
                                    value={{ discount }}
                                    setValue={(fn: any) => {

                                        const updated = fn({ discount });

                                        setDiscount(
                                            Math.abs(+normalizeNumberInput(updated.discount))
                                        );

                                        // clear comments validation
                                        setReservationErrors(prev => {
                                            const next = { ...prev };
                                            delete next.comments;
                                            return next;
                                        });
                                    }}
                                    errors={reservationErrors}
                                    setErrors={setReservationErrors}
                                    type="number"
                                    viewMode={isBooking}
                                />

                            </Grid>

                            <Field label="Comments">
                                <textarea
                                    className={cn("w-full min-h-[96px] rounded-[3px] border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                        reservationErrors.comments && "border-red-500"
                                    )}
                                    value={comments}
                                    onChange={(e) => setComments(normalizeTextInput(e.target.value))}
                                />
                            </Field>
                        </CardSection>

                        <CardSection title="Billing Summary" subtitle={""}>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Package Price</span>
                                    <span>₹{packageData?.data?.base_price || 0}</span>
                                </div>


                                <div className="flex justify-between text-muted-foreground">
                                    <span>Extra per night</span>
                                    <span>₹{extraPerNight || 0}</span>
                                </div>

                                <div className="flex justify-between text-muted-foreground">
                                    <span>Total Base Price</span>
                                    <span>₹{billingDetails.priceBeforeTax.toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between text-muted-foreground">
                                    <span>Discount</span>
                                    <span>- ₹{billingDetails.discountAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between text-muted-foreground">
                                    <span>GST</span>
                                    <span>{propertyTax?.gst}% (₹{billingDetails.gstAmount.toFixed(2)})</span>
                                </div>

                                <div className="flex justify-between text-muted-foreground">
                                    <span>Room Tax</span>
                                    <span>{propertyTax?.room_tax_rate}% (₹{billingDetails.roomTaxAmount.toFixed(2)})</span>
                                </div>
                            </div>


                            <div className="pt-3 border-t border-border flex justify-between font-semibold text-foreground">
                                <span>Total Payable</span>
                                <span>₹{billingDetails.priceAfterTax.toFixed(2)}</span>
                            </div>
                        </CardSection>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={() => navigate("/bookings")}
                            >
                                Cancel
                            </Button>
                            <Button variant="hero" disabled={
                                isBooking ||
                                !selectedPropertyId
                            } onClick={submitReservation}>
                                Confirm Booking
                            </Button>
                        </div>
                    </div>


                <Sheet open={roomsModalOpen} onOpenChange={setRoomsModalOpen}>
                    <SheetContent
                        side="right"
                        className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background p-0 flex flex-col"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 flex flex-col"
                        >
                            <SheetHeader className="px-6 py-4 border-b">
                                <SheetTitle className="text-lg font-semibold">
                                    Available Rooms
                                </SheetTitle>
                            </SheetHeader>

                        <section className="flex-1 overflow-y-auto p-6 lg:p-3 bg-muted/20">

                            <h2 className="text-lg font-semibold text-foreground mb-4">
                                Available Rooms
                            </h2>

                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-3">
                                <div className="space-y-1 mb-4">
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={roomFilters.bedType}
                                        onChange={(e) => {
                                            setRoomFilters({ ...roomFilters, bedType: e.target.value })
                                        }}

                                        disabled={allAvailableRoomIds.length === 0}
                                    >
                                        <option value="">Select Bed type</option>
                                        {availableBedType.map((type, i) => {
                                            return <option value={type} key={i}>{type}</option>
                                        })}
                                    </NativeSelect>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={roomFilters.roomCategory}
                                        onChange={(e) => {
                                            setRoomFilters({ ...roomFilters, roomCategory: e.target.value })
                                        }}

                                        disabled={allAvailableRoomIds.length === 0}
                                    >
                                        <option value="">Select category</option>
                                        {availableRoomCategory.map((category, i) => {
                                            return <option value={category} key={i}>{category}</option>
                                        })}
                                    </NativeSelect>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={roomFilters.floor}
                                        onChange={(e) => {
                                            setRoomFilters({ ...roomFilters, floor: e.target.value })
                                        }}

                                        disabled={floors.length === 0}
                                    >
                                        <option value="">Select floor</option>
                                        {floors.map((floor, i) => {
                                            return <option value={floor} key={i}>{floor}</option>
                                        })}
                                    </NativeSelect>
                                </div>
                            </div>


                            {roomsByFloor.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {(arrivalError || departureError) ? "Departure date should be greater than arrival date" : !availableRoomsLoading ? "No available rooms on selected dates" : "Select dates to see available rooms."}
                                </p>
                            )}

                            <div className="space-y-3">
                                {roomsByFloor.map(({ floor, rooms }) => (
                                    (roomFilters.floor === "" || roomFilters.floor == floor.toString()) && <div key={floor}>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                            Floor {floor}
                                        </h3>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {rooms.map((room) => {
                                                const isSelected = selectedRooms.some(
                                                    (r) => r.ref_room_id === Number(room.id)
                                                );

                                                return (
                                                    (isSelected ||
                                                        ((!roomFilters.bedType || room.bed_type_name === roomFilters.bedType) &&
                                                            (!roomFilters.roomCategory || room.room_category_name === roomFilters.roomCategory))) &&
                                                    <button
                                                        key={room.id}
                                                        onClick={() => toggleRoom(Number(room.id))}
                                                        className={cn(
                                                            "h-[110px] rounded-[3px] border p-3 text-sm font-semibold transition",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "bg-card border-border hover:bg-muted"
                                                        )}
                                                    >
                                                        <div className="flex flex-col h-full">

                                                            {/* Top - Left */}
                                                            <span className="text-xs opacity-70 mb-4 text-left">
                                                                {getFloorName(room.floor_number)}
                                                            </span>

                                                            {/* Middle - Center */}
                                                            <div className="flex-1 flex items-center justify-center">
                                                                <span className="text-[2rem] font-semibold">
                                                                    {room.room_no}
                                                                </span>
                                                            </div>

                                                            {/* Bottom - Left */}
                                                            <span className="text-xs opacity-70 mt-4 text-left">
                                                                {room.bed_type_name.split(" ")[0]}|{room.room_category_name}
                                                            </span>

                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* <div className="border-t px-6 py-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setRoomsModalOpen(false)}>
                                Close
                            </Button>
                        </div> */}
                        </motion.div>
                    </SheetContent>
                </Sheet>


                </motion.div>
            </SheetContent>
        </Sheet>
    );
}

const CardSection = ({ title, subtitle, children }) => (
    <div className="rounded-[5px] border border-border bg-background p-5">
        <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
    </div>
);


const Grid = ({ cols = 4, children }) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
        {children}
    </div>
);


const Field = ({ label, children }) => (
    <div className="">
        <Label className="">{label}</Label>
        {children}
    </div>
);


const Toggle = ({ label, checked, onChange }) => (
    <div className="flex items-center gap-3 mt-2">
        <Switch checked={checked} onCheckedChange={onChange} />
        <Label className="text-sm">{label}</Label>
    </div>
);
