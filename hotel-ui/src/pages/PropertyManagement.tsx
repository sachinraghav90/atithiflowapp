import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { TableCell } from "@/components/ui/table";
import { Building2, FilterX, Image as ImageIcon, Pencil, RefreshCcw } from "lucide-react";
import { useAddPropertyBySuperAdminMutation, useAddPropertyMutation, useBulkUpsertPropertyFloorsMutation, useGetMeQuery, useGetPropertiesQuery, useGetPropertyBanksQuery, useGetPropertyFloorsQuery, useLazyGetUsersByPropertyAndRoleQuery, useLazyGetUsersByRoleQuery, useUpdatePropertiesMutation, useUpsertPropertyBanksMutation } from "@/redux/services/hmsApi";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { useLocation, useNavigate } from "react-router-dom";

import PropertyIdentity from "@/components/property-form/sections/PropertyIdentity";
import PropertyLocation from "@/components/property-form/sections/PropertyLocation";
import PropertyTax from "@/components/property-form/sections/PropertyTax";
import PropertyConfiguration from "@/components/property-form/sections/PropertyConfiguration";
import PropertyOperations from "@/components/property-form/sections/PropertyOperations";
import PropertyBank from "@/components/property-form/sections/PropertyBank";
import PropertyCorporate from "@/components/property-form/sections/PropertyCorporate";


import { usePermission } from "@/rbac/usePermission";
import PropertyViewSection from "@/components/PropertyViewSection";
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";

// ---- Types ----
type Property = {
    id: string;
    brand_name: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    state: string;
    postal_code?: string | null;
    country?: string | null;
    phone?: string | null;
    phone2?: string | null;
    email?: string | null;
    is_active: boolean;
    total_rooms?: number | null;
    total_floors?: number | null;
    checkin_time?: string | null;
    checkout_time?: string | null;
    image?: string | null;
    owner_user_id?: string | null;
};

const EMPTY_PROPERTY = {
    brand_name: "",
    address_line_1: "",
    address_line_2: "",
    restaurant_tables: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    checkin_time: "12:00:00",
    checkout_time: "10:00:00",
    is_active: true,
    room_tax_rate: 0,
    gst: 5,
    serial_number: "001",
    serial_suffix: "",
    total_floors: 0,
    phone: "",
    phone2: "",
    email: "",
    total_rooms: "",
    year_opened: "",
    is_pet_friendly: false,
    smoking_policy: "",
    cancellation_policy: "",
    image: null,
    id: null,
    floors: [] as {
        floor_number: number;
        total_rooms: number | "";
    }[],
    owner_user_id: "",
    gst_no: "",
    location_link: "",
    address_line_1_office: "",
    address_line_2_office: "",
    city_office: "",
    state_office: "",
    postal_code_office: "",
    country_office: "",
    phone_office: "",
    phone2_office: "",
    email_office: "",
    status: "OWNED",
    bank_accounts: [] as BankAccount[],
    has_bank_details: false,
};

type BankAccount = {
    id?: number; // IMPORTANT for update
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
};

type FieldError = {
    type: "required" | "invalid";
    message: string;
};

export default function PropertyManagement() {
    const [mode, setMode] = useState<"add" | "edit" | "view">("add");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    // pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // filters
    const [search, setSearch] = useState("");
    const [city, setCity] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [country, setCountry] = useState("");
    const [updatingPropertyIds, setUpdatingPropertyIds] = useState<Set<string>>(new Set());
    const [newProperty, setNewProperty] = useState(EMPTY_PROPERTY);
    const [originalProperty, setOriginalProperty] = useState<any>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const [showOfficeFields, setShowOfficeFields] = useState(false);
    const [hasBankDetails, setHasBankDetails] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
        {
            account_holder_name: "",
            account_number: "",
            ifsc_code: "",
            bank_name: "",
        },
    ]);
    const [deletedBankIds, setDeletedBankIds] = useState<number[]>([]);
    const [originalBankAccounts, setOriginalBankAccounts] = useState<BankAccount[]>([]);
    const [originalHasBankDetails, setOriginalHasBankDetails] = useState(false);
    const [propertyErrors, setPropertyErrors] = useState<Record<string, FieldError>>({});

    const debouncedSearch = useDebounce(search, 500)
    // const isLoggedIn = useSelector((state: any) => state.isLoggedIn.value);
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const navigate = useNavigate()

    const [addProperty] = useAddPropertyMutation()
    const [addPropertySuperAdmin] = useAddPropertyBySuperAdminMutation()
    const [updateProperty] = useUpdatePropertiesMutation()
    const {
        data: properties,
        isLoading: propertiesLoading,
        isFetching: propertiesFetching,
        isError: propertiesError,
        isUninitialized: propertyUninitialized,
        refetch: refetchProperties,
    } = useGetPropertiesQuery({
        page,
        limit,
        search: debouncedSearch || undefined,
        city: city || undefined,
        state: stateFilter || undefined,
        country: country || undefined,
    }, {
        refetchOnMountOrArgChange: false
    });

    const { data: floorsResponse, isLoading: floorsLoading } = useGetPropertyFloorsQuery(selectedProperty?.id, { skip: !selectedProperty?.id, });
    const floors = floorsResponse?.floors ?? [];

    const { data: propertyBanks } = useGetPropertyBanksQuery(selectedProperty?.id, {
        skip: !isLoggedIn || !selectedProperty?.id
    })

    const [bulkUpsertFloors] = useBulkUpsertPropertyFloorsMutation()
    const [upsertPropertyBank] = useUpsertPropertyBanksMutation()

    const [getUsers, { data: users }] = useLazyGetUsersByRoleQuery()
    const [getPropertyAdmins, { data: propertyAdmins }] = useLazyGetUsersByPropertyAndRoleQuery()
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    useEffect(() => {
        if (!isLoggedIn) return
        if (isSuperAdmin) {
            getUsers("owner")
        } else if (isOwner && selectedProperty) {
            // getUsers("admin")
            getPropertyAdmins({ propertyId: selectedProperty.id, role: "admin" })
        }
    }, [isLoggedIn, isSuperAdmin, getUsers, selectedProperty])

    useEffect(() => {
        if (mode === "edit" && floors.length > 0) {
            setNewProperty(prev => ({
                ...prev,
                total_floors: floors.length,
                floors: floors.map(f => ({
                    floor_number: f.floor_number,
                    total_rooms: f.rooms_count,
                })),
            }));
        }
    }, [floors, mode]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, city, stateFilter, country]);

    useEffect(() => {
        if (mode === "add" && newProperty.floors.length !== newProperty.total_floors) {
            syncFloors(newProperty.total_floors);
        }
    }, [newProperty.total_floors, mode]);

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    useEffect(() => {
        if (mode === "edit" && newProperty.address_line_1_office) {
            setShowOfficeFields(true);
        }
    }, [mode, newProperty.address_line_1_office]);

    useEffect(() => {
        if (sheetOpen) return
        setShowOfficeFields(false)
        setPropertyErrors({})
    }, [sheetOpen])

    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            if (logoPreview) URL.revokeObjectURL(logoPreview);
        };
    }, [imagePreview, logoPreview]);

    useEffect(() => {
        setImageError(false);
        setLogoError(false);
    }, [newProperty?.id]);

    useEffect(() => {
        if (mode !== "edit") return;

        if (propertyBanks?.length) {
            setHasBankDetails(true);
            setBankAccounts(propertyBanks);
        } else {
            setHasBankDetails(false);
            setBankAccounts([
                {
                    account_holder_name: "",
                    account_number: "",
                    ifsc_code: "",
                    bank_name: "",
                },
            ]);
        }
    }, [propertyBanks, mode]);

    const toggleActive = async (id: string, is_active: boolean) => {
        setUpdatingPropertyIds(prev => new Set(prev).add(id));

        try {
            await updateProperty({
                id,
                payload: { is_active },
            }).unwrap();
        } catch (err) {
            toast.error("Failed to update property status");
        } finally {
            setUpdatingPropertyIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const viewMode = mode === "view";
    const propertyRows = useMemo(
        () =>
            (!propertiesLoading && !propertyUninitialized && !propertiesError)
                ? (properties?.data || properties?.properties || [])
                : [],
        [properties, propertiesError, propertiesLoading, propertyUninitialized]
    );

    function buildPropertyFormData(payload: any) {
        const fd = new FormData()

        const total_rooms = payload.floors.reduce((acc, curr) => {
            return acc + curr.total_rooms
        }, 0)

        fd.append('brand_name', payload.brand_name)
        fd.append('address_line_1', payload.address_line_1)

        if (payload.address_line_2) fd.append('address_line_2', payload.address_line_2)
        if (payload.city) fd.append('city', payload.city)
        if (payload.state) fd.append('state', payload.state)
        if (payload.postal_code) fd.append('postal_code', payload.postal_code)
        if (payload.country) fd.append('country', payload.country)

        if (payload.checkin_time) fd.append('checkin_time', payload.checkin_time)
        if (payload.checkout_time) fd.append('checkout_time', payload.checkout_time)

        fd.append('is_active', String(payload.is_active ?? true))
        fd.append('is_pet_friendly', String(payload.is_pet_friendly ?? false))

        fd.append('room_tax_rate', String(payload.room_tax_rate ?? 0))
        fd.append('gst', String(payload.gst ?? 0))

        if (payload.serial_number) fd.append('serial_number', payload.serial_number)
        if (payload.total_floors) fd.append('total_floors', String(payload.total_floors))
        if (total_rooms) fd.append('total_rooms', String(total_rooms))

        if (payload.phone) fd.append('phone', payload.phone)
        if (payload.phone2) fd.append('phone2', payload.phone2)
        if (payload.email) fd.append('email', payload.email)

        if (payload.year_opened) fd.append('year_opened', String(payload.year_opened))
        if (payload.smoking_policy) fd.append('smoking_policy', payload.smoking_policy)
        if (payload.cancellation_policy) fd.append('cancellation_policy', payload.cancellation_policy)

        if (selectedImageFile) {
            fd.append("image", selectedImageFile);
            fd.append("image_mime", selectedImageFile.type);
        }

        if (payload.owner_user_id) fd.append("owner_user_id", payload.owner_user_id)
        if (payload.gst_no) fd.append("gst_no", payload.gst_no)

        if (payload.location_link) fd.append("location_link", payload.location_link);

        if (payload.address_line_1_office) fd.append("address_line_1_office", payload.address_line_1_office);
        if (payload.address_line_2_office) fd.append("address_line_2_office", payload.address_line_2_office);
        if (payload.city_office) fd.append("city_office", payload.city_office);
        if (payload.state_office) fd.append("state_office", payload.state_office);
        if (payload.postal_code_office) fd.append("postal_code_office", payload.postal_code_office);
        if (payload.country_office) fd.append("country_office", payload.country_office);

        if (payload.phone_office) fd.append("phone_office", payload.phone_office);
        if (payload.phone2_office) fd.append("phone2_office", payload.phone2_office);
        if (payload.email_office) fd.append("email_office", payload.email_office);
        if (logoFile) {
            fd.append("logo", logoFile);
            fd.append("logo_mime", logoFile.type);
        }
        if (payload.status) fd.append("status", payload.status)
        if (payload.restaurant_tables) fd.append("restaurant_tables", payload.restaurant_tables)

        return fd
    }

    const phoneRegex = /^[0-9()]{10,15}$/;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    function validateProperty(
        property: any,
        hasBankDetails: boolean,
        bankAccounts: any[],
        showOfficeFields: boolean
    ) {

        const errors: Record<string, FieldError> = {};

        /* ================= BASIC REQUIRED ================= */

        if (!property.brand_name?.trim())
            errors.brand_name = {
                type: "required",
                message: "Property name is required"
            };

        if (!property.serial_number)
            errors.serial_number = {
                type: "required",
                message: "Serial number is required"
            };

        if (!property.address_line_1)
            errors.address_line_1 = {
                type: "required",
                message: "Address is required"
            };

        if (!property.city)
            errors.city = {
                type: "required",
                message: "City is required"
            };

        if (!property.state)
            errors.state = {
                type: "required",
                message: "State is required"
            };

        if (!property.postal_code)
            errors.postal_code = {
                type: "required",
                message: "Postal code is required"
            };

        if (!property.country)
            errors.country = {
                type: "required",
                message: "Country is required"
            };

        if (!property.total_floors || property.total_floors < 1)
            errors.total_floors = {
                type: "required",
                message: "At least 1 floor is required"
            };

        if (!property.gst_no)
            errors.gst_no = {
                type: "required",
                message: "GST number is required"
            };

        /* ================= INVALID FORMAT ================= */

        if (!phoneRegex.test(property.phone || ""))
            errors.phone = {
                type: "invalid",
                message: "Invalid phone number"
            };

        if (property.phone2 && !phoneRegex.test(property.phone2))
            errors.phone2 = {
                type: "invalid",
                message: "Invalid alternate phone number"
            };

        if (!emailRegex.test(property.email || ""))
            errors.email = {
                type: "invalid",
                message: "Invalid email"
            };

        /* ================= OFFICE FIELDS ================= */

        if (showOfficeFields) {

            if (!property.address_line_1_office)
                errors.address_line_1_office = {
                    type: "required",
                    message: "Office address required"
                };

            if (!property.city_office)
                errors.city_office = {
                    type: "required",
                    message: "Office city required"
                };

            if (!property.state_office)
                errors.state_office = {
                    type: "required",
                    message: "Office state required"
                };

            if (!property.postal_code_office)
                errors.postal_code_office = {
                    type: "required",
                    message: "Office postal code required"
                };

            if (!property.country_office)
                errors.country_office = {
                    type: "required",
                    message: "Office country required"
                };

            if (!phoneRegex.test(property.phone_office || ""))
                errors.phone_office = {
                    type: "invalid",
                    message: "Invalid office phone"
                };

            if (
                property.phone2_office &&
                !phoneRegex.test(property.phone2_office)
            )
                errors.phone2_office = {
                    type: "invalid",
                    message: "Invalid alternate office phone"
                };

            if (!emailRegex.test(property.email_office || ""))
                errors.email_office = {
                    type: "invalid",
                    message: "Invalid office email"
                };
        }

        /* ================= BANK DETAILS ================= */

        if (hasBankDetails) {

            bankAccounts.forEach((b, i) => {

                if (!b.account_holder_name)
                    errors[`bank_${i}_account_holder_name`] = {
                        type: "required",
                        message: "Required"
                    };

                if (!b.account_number)
                    errors[`bank_${i}_account_number`] = {
                        type: "required",
                        message: "Required"
                    };

                if (!b.ifsc_code)
                    errors[`bank_${i}_ifsc_code`] = {
                        type: "required",
                        message: "Required"
                    };

                if (!b.bank_name)
                    errors[`bank_${i}_bank_name`] = {
                        type: "required",
                        message: "Required"
                    };

            });
        }

        return errors;
    }


    async function handleSubmitProperty() {

        const errors = validateProperty(
            newProperty,
            hasBankDetails,
            bankAccounts,
            showOfficeFields
        );

        setPropertyErrors(errors);

        if (Object.keys(errors).length > 0) {
            toast.error("Please fill all the details correctly");
            return;
        }

        const formData = buildPropertyFormData(newProperty)

        const promise =
            mode === 'add'
                ? (isSuperAdmin && newProperty.owner_user_id) ? addPropertySuperAdmin(formData).unwrap() : addProperty(formData).unwrap()
                : updateProperty({
                    id: selectedProperty.id,
                    payload: formData,
                }).unwrap()

        toast.promise(promise, {
            pending: mode === 'add'
                ? 'Creating property...'
                : 'Updating property...',
            success: mode === 'add'
                ? 'Property created successfully'
                : 'Property updated successfully',
            error: 'Something went wrong',
        })

        const { id } = await promise

        if (hasBankDetails) {
            await upsertPropertyBank({
                propertyId: id,
                accounts: bankAccounts,
                deletedIds: deletedBankIds,
            }).unwrap();
        }

        await bulkUpsertFloors({
            property_id: id,
            floors: newProperty.floors.map((f) => ({
                floor_number: f.floor_number,
                rooms_count: f.total_rooms,
            })),
            prefix: newProperty.serial_suffix
        }).unwrap();
        if (mode === "add") {
            navigate("/rooms", {
                state: { propertyId: id }
            })
        }
        setSheetOpen(false)
        setDeletedBankIds([]);
    }

    function syncFloors(totalFloors: number) {
        setNewProperty(prev => {
            const safeFloors = Array.isArray(prev.floors) ? prev.floors : [];

            let floors = [...safeFloors];

            if (totalFloors > floors.length) {
                for (let i = floors.length + 1; i <= totalFloors; i++) {
                    floors.push({
                        floor_number: i,
                        total_rooms: 1,
                    });
                }
            }

            if (totalFloors < floors.length) {
                floors = floors.slice(0, totalFloors);
            }

            floors = floors.map((f, i) => ({
                ...f,
                floor_number: i,
            }));

            return {
                ...prev,
                total_floors: totalFloors,
                floors,
            };
        });
    }

    function normalizeForCompare(payload: any) {
        const clone = { ...payload };

        delete clone.id;
        delete clone.image;
        delete clone.floors;

        return clone;
    }

    const addBankAccount = () => {
        setBankAccounts(prev => [
            ...prev,
            {
                account_holder_name: "",
                account_number: "",
                ifsc_code: "",
                bank_name: "",
            },
        ]);
    };

    const updateBankField = (
        index: number,
        field: keyof BankAccount,
        value: string
    ) => {
        setBankAccounts(prev => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                [field]: normalizeTextInput(value),
            };
            return copy;
        });
    };

    const removeBankAccount = (index: number) => {
        setBankAccounts(prev => {
            const removed = prev[index];
            if (removed?.id) {
                setDeletedBankIds(ids => [...ids, removed.id!]);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    function normalizeBanks(banks: BankAccount[]) {
        return banks.map(b => ({
            id: b.id ?? null,
            account_holder_name: b.account_holder_name,
            account_number: b.account_number,
            ifsc_code: b.ifsc_code,
            bank_name: b.bank_name,
        }));
    }

    const isDirty =
        mode === "edit" &&
        originalProperty &&
        (
            JSON.stringify(normalizeForCompare(originalProperty)) !==
            JSON.stringify(normalizeForCompare(newProperty))
            ||
            JSON.stringify(normalizeBanks(originalBankAccounts)) !==
            JSON.stringify(normalizeBanks(bankAccounts))
            ||
            originalHasBankDetails !== hasBankDetails
            ||
            deletedBankIds.length > 0
            ||
            !!selectedImageFile
        );

    useEffect(() => {
        if (!sheetOpen) {
            setDeletedBankIds([]);
        }
    }, [sheetOpen]);

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const resetFiltersHandler = () => {
        setSearch("");
        setCity("");
        setStateFilter("");
        setCountry("");
        setPage(1);
    };

    const refreshTable = async () => {
        const toastId = toast.loading("Refreshing properties...");

        try {
            await refetchProperties();
            toast.dismiss(toastId);
            toast.success("Properties refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh properties");
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Properties</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage your hotels and property-level configuration.
                        </p>
                    </div>

                    {permission?.can_create && <Button
                        variant="hero"
                        disabled={!permission?.can_create}
                        onClick={() => {
                            setMode("add");
                            setSelectedProperty(null);
                            setNewProperty(EMPTY_PROPERTY);
                            setSheetOpen(true);
                        }}
                    >
                        Add Property
                    </Button>}

                </div>
                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={search}
                                    onChange={setSearch}
                                    placeholder="Search property name, city, state..."
                                />

                                <GridToolbarSelect
                                    label="STATUS"
                                    value="all"
                                    onChange={() => { }}
                                    options={[{ label: "All Status", value: "all" }]}
                                />

                                <div className="w-full" /> {/* Empty col 3 */}

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "reset",
                                            label: "Reset Filters",
                                            icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: resetFiltersHandler,
                                        },
                                        {
                                            key: "refresh",
                                            label: "Refresh Data",
                                            icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: refreshTable,
                                            disabled: propertiesFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <AppDataGrid
                    columns={[
                        {
                            label: "Property",
                            cellClassName: "font-medium",
                            render: (property: Property) => (
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {property.brand_name}
                                </div>
                            ),
                        },
                        {
                            label: "Address",
                            cellClassName: "font-medium",
                            render: (property: Property) => (
                                <div className="text-sm">
                                    {property.city}, {property.state}
                                </div>
                            ),
                        },
                        {
                            label: "Email",
                            key: "email",
                            cellClassName: "text-muted-foreground text-xs",
                        },
                        {
                            label: "Phone",
                            key: "phone",
                            cellClassName: "font-mono text-xs",
                        },
                        {
                            label: "Status",
                            cellClassName: "text-center",
                            render: (property: Property) => (
                                <span
                                    className={cn(
                                        "px-3 py-1 text-xs font-semibold rounded-[3px]",
                                        getStatusColor(property.is_active ? "active" : "inactive", "toggle")
                                    )}
                                >
                                    {property.is_active ? "Active" : "Inactive"}
                                </span>
                            ),
                        },
                    ] as ColumnDef[]}
                    data={propertyRows}
                    loading={propertiesLoading}
                    emptyText="No properties found"
                    minWidth="760px"
                    actionLabel=""
                    actionClassName="text-center w-[72px]"
                    actions={(property: Property) => (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                    disabled={updatingPropertyIds.has(property.id)}
                                    aria-label={`View and edit details for property ${property.brand_name}`}
                                    onClick={() => {
                                        setMode("view");
                                        setSelectedProperty(property);

                                        const prepared = {
                                            ...EMPTY_PROPERTY,
                                            ...property,
                                            floors: [],
                                            total_rooms: property.total_rooms != null ? String(property.total_rooms) : "",
                                            total_floors: property.total_floors ?? 0,
                                            owner_user_id: property.owner_user_id ?? "",
                                        };

                                        setNewProperty(prepared);
                                        setOriginalProperty(JSON.parse(JSON.stringify(prepared)));
                                        setOriginalBankAccounts(
                                            propertyBanks ? JSON.parse(JSON.stringify(propertyBanks)) : []
                                        );
                                        setOriginalHasBankDetails(!!propertyBanks?.length);
                                        setSheetOpen(true);
                                    }}
                                >
                                    <Pencil className="w-4 h-4 mx-auto" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View / Edit Details</TooltipContent>
                        </Tooltip>
                    )}
                    enablePagination={!!properties?.pagination}
                    paginationProps={{
                        page,
                        totalPages: properties?.pagination?.totalPages ?? 1,
                        setPage,
                        disabled: propertiesFetching,
                        totalRecords: properties?.pagination?.totalItems || properties?.data?.length || 0,
                        limit,
                        onLimitChange: (value) => {
                            setLimit(value);
                            setPage(1);
                        }
                    }}
                />
                </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-4xl lg:max-w-5xl overflow-y-auto"
                >

                    <motion.div className="space-y-1">

                        <SheetHeader>
                            <SheetTitle>
                                {mode === "add"
                                    ? "Add Property"
                                    : mode === "edit"
                                        ? "Edit Property"
                                        : "Property Details"}
                            </SheetTitle>
                        </SheetHeader>

                        {viewMode ? (
                            <>
                                {/* ===== IDENTITY ===== */}
                                <PropertyViewSection title="Property Identity">
                                    <ViewField label="Property Name" value={newProperty.brand_name} />
                                    <ViewField label="Property Code" value={newProperty.serial_number} />
                                    <ViewField label="GSTIN" value={newProperty.gst_no} />
                                    <ViewField label="Status" value={newProperty.status} />
                                </PropertyViewSection>

                                {/* ===== MEDIA ===== */}
                                <PropertyViewSection title="Media">

                                    {/* IMAGE */}
                                    {!imageError ? (
                                        <div className="w-full max-w-sm aspect-video rounded-md overflow-hidden bg-muted">
                                            <img
                                                src={`${import.meta.env.VITE_API_URL}/properties/${newProperty.id}/image`}
                                                className="w-full h-full object-cover"
                                                onError={() => setImageError(true)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-md">
                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                        </div>

                                    )}

                                    {/* LOGO */}
                                    {!logoError ? (
                                        <div className="w-24 aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                            <img
                                                src={`${import.meta.env.VITE_API_URL}/properties/${newProperty.id}/logo`}
                                                className="w-full h-full object-contain"
                                                onError={() => setLogoError(true)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-md">
                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}

                                </PropertyViewSection>


                                {/* ===== LOCATION ===== */}
                                <PropertyViewSection title="Location">
                                    <ViewField label="Address" value={newProperty.address_line_1} />
                                    <ViewField label="City" value={newProperty.city} />
                                    <ViewField label="State" value={newProperty.state} />
                                    <ViewField label="Country" value={newProperty.country} />
                                    <ViewField label="Postal Code" value={newProperty.postal_code} />
                                </PropertyViewSection>

                                {/* ===== CONTACT ===== */}
                                <PropertyViewSection title="Contact">
                                    <ViewField label="Phone" value={newProperty.phone} />
                                    <ViewField label="Alternate Phone" value={newProperty.phone2} />
                                    <ViewField label="Email" value={newProperty.email} />
                                </PropertyViewSection>

                                {/* ===== OPERATIONS ===== */}
                                <PropertyViewSection title="Operations">
                                    <ViewField label="Check-in" value={newProperty.checkin_time} />
                                    <ViewField label="Check-out" value={newProperty.checkout_time} />
                                    {/* <ViewField label="Pet Friendly" value={newProperty.is_pet_friendly ? "Yes" : "No"} /> */}
                                </PropertyViewSection>

                                {/* ===== TAX ===== */}
                                <PropertyViewSection title="Tax">
                                    <ViewField label="GST %" value={newProperty.gst} />
                                    <ViewField label="Room Tax %" value={newProperty.room_tax_rate} />
                                </PropertyViewSection>

                                {/* ===== OFFICE (optional) ===== */}
                                {newProperty.address_line_1_office && (
                                    <PropertyViewSection title="Corporate Office">
                                        <ViewField label="Address" value={newProperty.address_line_1_office} />
                                        <ViewField label="City" value={newProperty.city_office} />
                                        <ViewField label="Phone" value={newProperty.phone_office} />
                                    </PropertyViewSection>
                                )}
                            </>

                        ) : (
                            <>

                                {/* ================= PROPERTY IDENTITY ================= */}

                                <PropertyIdentity
                                    value={newProperty}
                                    setValue={setNewProperty}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                    imagePreview={imagePreview}
                                    setImagePreview={setImagePreview}
                                    selectedImageFile={selectedImageFile}
                                    setSelectedImageFile={setSelectedImageFile}
                                    imageError={imageError}
                                    setImageError={setImageError}
                                    logoPreview={logoPreview}
                                    setLogoPreview={setLogoPreview}
                                    logoFile={logoFile}
                                    setLogoFile={setLogoFile}
                                    logoError={logoError}
                                    setLogoError={setLogoError}
                                />

                                {/* ================= LOCATION ================= */}

                                <PropertyLocation
                                    value={newProperty}
                                    setValue={setNewProperty}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                />

                                {/* ================= LEGAL TAX ================= */}

                                <PropertyTax
                                    value={newProperty}
                                    setValue={setNewProperty}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                />

                                {/* ================= CONFIGURATION ================= */}

                                <PropertyConfiguration
                                    value={newProperty}
                                    setValue={setNewProperty}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                />

                                {/* ================= OPERATIONS ================= */}

                                <PropertyOperations
                                    value={newProperty}
                                    setValue={setNewProperty}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                />

                                {/* ================= CORPORATE ================= */}

                                <PropertyCorporate
                                    value={newProperty}
                                    setValue={setNewProperty}
                                    showOfficeFields={showOfficeFields}
                                    setShowOfficeFields={setShowOfficeFields}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                />

                                {/* ================= BANK ================= */}

                                <PropertyBank
                                    bankAccounts={bankAccounts}
                                    setBankAccounts={setBankAccounts}
                                    hasBankDetails={hasBankDetails}
                                    setHasBankDetails={setHasBankDetails}
                                    deletedBankIds={deletedBankIds}
                                    setDeletedBankIds={setDeletedBankIds}
                                    errors={propertyErrors}
                                    setErrors={setPropertyErrors}
                                    viewMode={false}
                                />
                            </>
                        )}
                    </motion.div>
                    {/* ================= ACTION FOOTER ================= */}

                    <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">

                        {/* Cancel always available */}
                        <Button
                            variant="heroOutline"
                            onClick={() => setSheetOpen(false)}
                        >
                            Cancel
                        </Button>

                        {/* VIEW MODE BUTTON */}
                        {mode === "view" && (
                            <Button
                                variant="hero"
                                onClick={() => setMode("edit")}
                            >
                                Edit Property
                            </Button>
                        )}

                        {/* CREATE BUTTON */}
                        {mode === "add" && permission?.can_create && (
                            <Button
                                variant="hero"
                                onClick={handleSubmitProperty}
                            >
                                Create Property
                            </Button>
                        )}

                        {/* UPDATE BUTTON */}
                        {mode === "edit" && permission?.can_create && (
                            <Button
                                variant="hero"
                                disabled={!isDirty}
                                onClick={handleSubmitProperty}
                            >
                                Save Changes
                            </Button>
                        )}

                    </div>


                </SheetContent>
            </Sheet>
        </div>
    );
}

function PropertyStatusCell({ property, toggleActive, isUpdating }) {
    const [isActive, setIsActive] = useState(property.is_active);

    // Sync when parent data changes (important!)
    useEffect(() => {
        setIsActive(property.is_active);
    }, [property.is_active]);

    const debouncedIsActive = useDebounce(isActive, 0);

    useEffect(() => {
        if (debouncedIsActive !== property.is_active) {
            toggleActive(property.id, debouncedIsActive);
        }
    }, [debouncedIsActive]);

    return (
        <TableCell>
            <div className="flex items-center gap-2">
                <Switch
                    disabled={isUpdating}
                    checked={isActive}
                    onCheckedChange={setIsActive}
                />
                <span className="text-sm text-muted-foreground">
                    {isActive ? "Active" : "Inactive"}
                </span>
            </div>
        </TableCell>
    );
}

function ViewField({ label, value }) {

    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">
                {value || "-"}
            </p>
        </div>
    );
}
