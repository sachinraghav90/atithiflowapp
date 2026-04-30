import { useEffect, useMemo, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { FilterX, Download, Image as ImageIcon, KeyRound, Pencil, Phone, RefreshCcw } from "lucide-react";
import { useAddStaffMutation, useCreateUserMutation, useGetAllRolesQuery, useGetMyPropertiesQuery, useGetStaffByPropertyQuery, useLazyGetStaffByPropertyQuery, useLazyGetStaffByIdQuery, useUpdateStaffMutation, useUpdateStaffPasswordMutation, useGetPropertyAddressByUserQuery } from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/hook";
import { validateStaff } from "@/utils/validators";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import DatePicker from "react-datepicker";
import countries from '../utils/countries.json'
import { useLocation } from "react-router-dom";

import PersonalDetails from "@/components/staff-form/sections/PersonalDetails";
import ContactLogin from "@/components/staff-form/sections/ContactLogin";
import PropertyRoleAssignment from "@/components/staff-form/sections/PropertyRoleAssignment";
import IdentificationDocuments from "@/components/staff-form/sections/IdentificationDocuments";


import { usePermission } from "@/rbac/usePermission";
import EmergencyContacts from "@/components/staff-form/sections/EmergencyContacts";
import { formatReadableLabel } from "@/utils/formatString";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiToast } from "@/utils/apiToastPromise";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import { useGridPagination } from "@/hooks/useGridPagination";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";

/* -------------------- Types -------------------- */
type Staff = {
    id?: string;
    salutation: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    phone1: string;
    phone2?: string;
    designation: string;
    department: string;
    status: "Active" | "Inactive";
    image?: File | null;
    id_proof?: File | null;
};

const STAFF_STATUSES = ["Active", "Inactive"];

const STAFF_INITIAL_VALUE = {
    first_name: "",
    salutation: "Mr",
    middle_name: "",
    last_name: "",
    password: "",
    role_ids: [],
    address: "",
    gender: "",
    marital_status: "",
    employment_type: "",
    email: "",
    phone1: "",
    phone2: "",
    emergency_contact: "",
    emergency_contact_name: "",
    emergency_contact_2: "",
    emergency_contact_name_2: "",
    emergency_contact_relation: "",
    emergency_contact_relation_2: "",
    designation: "",
    department: "",
    hire_date: "",
    dob: "",
    leave_days: "",
    shift_pattern: "",
    status: "active",
    blood_group: "",
    id_proof_type: "Aadhaar",
    id_number: "",
    image: null,
    id_proof: null,
    user_id: "",
    property_id: "",
    // visa fields (for foreigner)
    visa_number: "",
    visa_issue_date: "",
    visa_expiry_date: "",

    // for ID proof type "Other"
    other_id_proof: "",
    nationality: "",
    country: ""
}

type FormError = {
    type: "required" | "invalid";
    message: string;
};

export default function StaffManagement() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit" | "view">("add");
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPropertyId, setSelectedPropertyId] = useState("");

    const [statusFilter, setStatusFilter] = useState("");

    const [staff, setStaff] = useState<typeof STAFF_INITIAL_VALUE>(STAFF_INITIAL_VALUE);
    const [idProofMode, setIdProofMode] = useState<"select" | "other">("select");
    const [staffImageExists, setStaffImageExists] = useState(false);
    const [staffIdProofExists, setStaffIdProofExists] = useState<boolean | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, FormError>>({});
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordStaffId, setPasswordStaffId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");


    const viewMode = mode === "view";

    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, statusFilter, searchQuery],
    });
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const { 
        myProperties, 
        isMultiProperty, 
        isSuperAdmin, 
        isOwner,
        isInitializing,
        isLoading: myPropertiesLoading
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const cleanSearchQuery = useMemo(() => {
        if (!searchQuery) return "";
        const statusLabels = STAFF_STATUSES.map(s => s.toLowerCase());
        const filterKeywords = [...statusLabels];
        return filterKeywords
            .sort((left, right) => right.length - left.length)
            .reduce((query, keyword) => {
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return query.replace(new RegExp(`\\b${escapedKeyword}\\b`, "gi"), " ");
            }, searchQuery)
            .replace(/\s+/g, " ")
            .trim();
    }, [searchQuery]);

    const { data: staffData, isLoading, isFetching, refetch: refetchStaff } = useGetStaffByPropertyQuery({
        property_id: selectedPropertyId,
        page,
        limit,
        search: cleanSearchQuery,
        department: "",
        status: statusFilter,
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    });

    const [createStaff, { isLoading: creating }] = useAddStaffMutation();
    const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
    const [updateStaffPassword] = useUpdateStaffPasswordMutation()
    const [getStaffById] = useLazyGetStaffByIdQuery();
    const { data: roles } = useGetAllRolesQuery(undefined, {
        skip: !isLoggedIn
    })

    useEffect(() => {
        if (sheetOpen) return
        setStaff(STAFF_INITIAL_VALUE)
        setFormErrors({})
    }, [sheetOpen])

    // Hook handles all initialization logic now

    useEffect(() => {
        if (mode === "edit" && staff.id) {
            const img = new Image();
            img.src = `${import.meta.env.VITE_API_URL}/staff/${staff.id}/image`;

            img.onload = () => setStaffImageExists(true);
            img.onerror = () => setStaffImageExists(false);
        } else {
            setStaffImageExists(false);
        }
    }, [mode, staff.id]);

    useEffect(() => {
        if (mode === "edit" && staff.id) {
            const img = new Image();
            img.src = `${import.meta.env.VITE_API_URL}/staff/${staff.id}/id-proof`;

            img.onload = () => setStaffIdProofExists(true);
            img.onerror = () => setStaffIdProofExists(false);
        } else {
            setStaffIdProofExists(false);
        }
    }, [mode, staff.id]);

    const downloadImage = async (url: string, filename = "staff-image.jpg") => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Image download failed", err);
            toast.error("Failed to download image");
        }
    };

    const handleSubmit = async () => {
        try {
            if (mode === "view") return;

            const errors = validateStaff(
                staff,
                mode,
                staffIdProofExists,
                roles?.roles || [],
                isSuperAdmin
            );

            setFormErrors(errors);

            if (Object.keys(errors).length > 0) {
                toast.error("Please fill all the fields correctly"); // show first error
                return;
            }

            if (mode === "add" && staff.role_ids.length === 0) {
                toast.error("Please select a role")
                return
            }

            const fd = new FormData()

            Object.entries(staff).forEach(([key, value]) => {
                if (
                    value === null ||
                    value === "" ||
                    key === "id" ||
                    key === "image" ||
                    key === "id_proof" ||
                    key === "roles" ||
                    key === "emergency_contact_2" ||
                    key === "phone2"
                ) {
                    return
                }

                if (Array.isArray(value)) {
                    value.forEach((v) => fd.append(`${key}[]`, v))
                } else {
                    fd.append(key, value)
                }
            })

            if (staff.image instanceof File) {
                fd.append("image", staff.image)
                fd.append("image_mime", staff.image.type)
            }

            if (staff.id_proof instanceof File) {
                fd.append("id_proof", staff.id_proof)
                fd.append("id_proof_mime", staff.id_proof.type)
            }

            if (staff.phone2?.split(" ")[1]) fd.append("phone2", staff.phone2)
            if (staff.emergency_contact_2?.split(" ")[1]) fd.append("emergency_contact_2", staff.emergency_contact_2)

            const promise =
                mode === "add"
                    ? createStaff(fd).unwrap()
                    : updateStaff({ id: staff.id, payload: fd }).unwrap()

            await toast.promise(promise, {
                pending:
                    mode === "add"
                        ? "Creating user & staff..."
                        : "Updating staff...",
                success:
                    mode === "add"
                        ? "Staff created successfully"
                        : "Staff updated successfully",
                error: "Something went wrong",
            })

            setSheetOpen(false)
        } catch (err) {
            console.error("Staff submit failed", err)
        }
    }

    const excludedRoles = isSuperAdmin ? ["SUPER_ADMIN"]
        : isOwner
            ? ["SUPER_ADMIN", "OWNER"]
            : ["SUPER_ADMIN", "OWNER", "ADMIN"];

    const toDateInput = (value?: string) =>
        value ? value.split("T")[0] : "";

    const parseDate = (value?: string) =>
        value ? new Date(value) : null;

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;   // local timezone safe
    };

    const openPasswordModal = (staff) => {
        setPasswordStaffId(staff.user_id);
        setPasswordModalOpen(true);
    };

    const handlePasswordUpdate = async () => {

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long")
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        const payload = {
            password: newPassword,
            user_id: passwordStaffId
        }

        await apiToast(
            updateStaffPassword(payload).unwrap(),
            "Password Updated Successfully"
        )

        setPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
    };


    const location = useLocation();
    const { permission } = usePermission(location.pathname);
    const staffRows = useMemo(() => staffData?.data ?? [], [staffData?.data]);

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        resetPage();
    };

    const refreshTable = async () => {
        if (isFetching) return;
        const toastId = toast.loading("Refreshing staff...");

        try {
            await refetchStaff();
            toast.dismiss(toastId);
            toast.success("Staff refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh staff");
        }
    };

    const [getStaffForExport, { isFetching: exportingStaff }] = useLazyGetStaffByPropertyQuery();

    const exportStaffSheet = async () => {
        if (exportingStaff) return;
        const totalRecords = staffData?.pagination?.totalItems ?? staffData?.pagination?.total ?? staffRows.length;
        if (!totalRecords) {
            toast.info("No staff items to export");
            return;
        }
        const toastId = toast.loading("Preparing staff export...");

        try {
            const res = await getStaffForExport({
                property_id: selectedPropertyId,
                search: cleanSearchQuery,
                status: statusFilter,
                export: true
            }).unwrap();

            if (!res?.data?.length) {
                toast.dismiss(toastId);
                toast.info("No staff items to export");
                return;
            }

            const formatted = res.data.map((staffMember: any) => ({
                "Staff ID": formatModuleDisplayId("staff", staffMember.id),
                "Name": `${staffMember.first_name || ""} ${staffMember.last_name || ""}`.trim() || "-",
                "Contact": staffMember.phone || staffMember.phone1 || "-",
                "Property": staffMember.properties?.[0]?.brand_name || "-",
                "Role": staffMember.roles?.[0]?.name || "-",
                "Status": staffMember.status || "-",
            }));

            exportToExcel(formatted, "Staff.xlsx");
            toast.dismiss(toastId);
            toast.success("Export completed");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export staff");
        }
    };

    const openStaffDetails = async (staffMember: Staff, forceMode: "view" | "edit" = "view") => {
        try {
            setMode(forceMode);
            setSheetTab("summary");
            setSheetOpen(true);

            const data = await getStaffById(staffMember.id!).unwrap();
            const fullStaff = data?.data;

            setStaff({
                ...STAFF_INITIAL_VALUE,
                ...fullStaff,
                role_ids: fullStaff.roles?.length
                    ? [String(fullStaff.roles[0].id)]
                    : [],
                hire_date: toDateInput(fullStaff.hire_date),
                dob: toDateInput(fullStaff.dob),
                image: null,
                id_proof: null,
            });
        } catch (err) {
            console.error(err);
        }
    };

    const staffColumns = useMemo<ColumnDef<any>[]>(() => [
        {
            label: "Staff ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (s) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => openStaffDetails(s, "view")}
                    aria-label={`Open summary view for staff ${formatModuleDisplayId("staff", s.id)}`}
                >
                    {formatModuleDisplayId("staff", s.id)}
                </button>
            ),
        },
        {
            label: "Name",
            cellClassName: "font-medium",
            render: (s) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-[3px] border border-border">
                        <AvatarImage src={s.image || ""} />
                        <AvatarFallback className="rounded-[3px] bg-primary/10 text-primary font-bold text-[10px]">
                            {s.first_name?.[0]}{s.last_name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold whitespace-nowrap">{s.first_name} {s.last_name}</span>
                        <span className="text-xs text-muted-foreground leading-none">{s.email || "No email"}</span>
                    </div>
                </div>
            ),
        },
        {
            label: "Contact",
            cellClassName: "text-muted-foreground text-sm whitespace-nowrap",
            render: (s) => (
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{s.phone || s.phone1 || "-"}</span>
                </div>
            ),
        },
        {
            label: "Property",
            cellClassName: "text-muted-foreground text-sm",
            render: (s) => s.properties?.[0]?.brand_name || "-",
        },
        {
            label: "Role",
            cellClassName: "text-muted-foreground text-sm",
            render: (s) => formatReadableLabel(s.roles?.[0]?.name) || "-",
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center whitespace-nowrap",
            render: (s) => (
                <GridBadge status={s.status} statusType="staff" className="min-w-[88px]">
                    {s.status}
                </GridBadge>
            ),
        },
    ], []);

    return (
        <div className="flex flex-col">
            <section className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Staff</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your hotel staff and their roles
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isMultiProperty && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        setSelectedPropertyId(e.target.value);
                                        resetPage();
                                    }}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {myProperties?.properties?.map((property: { id: string; brand_name: string }) => (
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
                                className="h-10"
                                onClick={() => {
                                    setMode("add");
                                    setSheetTab("summary");
                                    setStaff(STAFF_INITIAL_VALUE);
                                    setFormErrors({});
                                    setSheetOpen(true);
                                }}
                            >
                                Add Staff
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchInput}
                                    onChange={(value) => {
                                        setSearchInput(value);
                                        if (!value.trim()) {
                                            setSearchQuery("");
                                            resetPage();
                                        }
                                    }}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        resetPage();
                                    }}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        resetPage();
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...STAFF_STATUSES.map((s) => ({ 
                                            label: s, 
                                            value: s 
                                        })),
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Staff",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportStaffSheet,
                                        },
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
                                            disabled: isFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={staffColumns}
                            data={staffRows}
                            loading={isLoading || isFetching || isInitializing}
                            emptyText="No staff added yet"
                            minWidth="700px"
                            rowKey={(s: Staff, idx: number) => s.id ?? idx}
                            actionLabel=""
                            actionClassName="text-center w-[96px]"
                             showActions={permission?.can_create}
                            actions={(s: Staff) => (
                                <div className="flex justify-center gap-2">
                                    {permission?.can_create && (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                        aria-label={`View and edit details for ${s.first_name} ${s.last_name}`}
                                                        onClick={() => openStaffDetails(s, "edit")}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mx-auto" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>View / Edit Details</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7 rounded-[3px] shadow-sm"
                                                        onClick={() => openPasswordModal(s)}
                                                        aria-label={`Update password for ${s.first_name} ${s.last_name}`}
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Update Password</TooltipContent>
                                            </Tooltip>
                                        </>
                                    )}
                                </div>
                            )}
                            enablePagination={!!staffData?.pagination}
                            paginationProps={{
                                page,
                                totalPages: staffData?.pagination?.totalPages ?? 1,
                                setPage,
                                disabled: isFetching || !staffData,
                                totalRecords: staffData?.pagination?.totalItems ?? staffData?.pagination?.total ?? staffData?.data?.length ?? 0,
                                limit,
                                onLimitChange: handleLimitChange,
                            }}
                        />
                    </div>
                </div>
            </section>
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full lg:max-w-3xl sm:max-w-2xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold text-foreground">
                                    {mode === "add" ? "Register New Staff" : mode === "edit" ? `Update Staff Member [${staff?.id ? `#${formatModuleDisplayId("staff", staff.id)}` : "..."}]` : `Staff Summary [${staff?.id ? `#${formatModuleDisplayId("staff", staff.id)}` : "..."}]`}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {mode === "add" ? "Create New Profile for Hotel Personnel" : mode === "edit" ? "Modify Existing Staff Member Information" : "Detailed Profile Information of Staff Member"}
                                </p>
                            </div>
                        </SheetHeader>

                        {viewMode ? (

                            <div className="space-y-4">
                                <div className="border-b border-border flex">
                                    <button
                                        onClick={() => setSheetTab("summary")}
                                        className={cn(
                                            "px-4 py-2 text-[11px] font-bold tracking-wide transition-all border-b-2 -mb-[2px]",
                                            sheetTab === "summary"
                                                ? "border-primary text-primary"
                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Summary
                                    </button>
                                    <button
                                        onClick={() => setSheetTab("history")}
                                        className={cn(
                                            "px-4 py-2 text-[11px] font-bold tracking-wide transition-all border-b-2 -mb-[2px]",
                                            sheetTab === "history"
                                                ? "border-primary text-primary"
                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        History
                                    </button>
                                </div>

                                {sheetTab === "summary" && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <PropertyViewSection title="Personal Details" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        <ViewField label="First Name" value={staff.first_name} />
                                        <ViewField label="Middle Name" value={staff.middle_name} />
                                        <ViewField label="Last Name" value={staff.last_name} />
                                        <ViewField label="Gender" value={staff.gender} />
                                        <ViewField label="Marital Status" value={staff.marital_status} />
                                        <ViewField label="DOB" value={staff.dob} />
                                        <ViewField label="Nationality" value={staff.nationality} />
                                        <ViewField label="Blood Group" value={staff.blood_group} />
                                </PropertyViewSection>


                                <PropertyViewSection title="Contact & Login" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        <ViewField label="Email" value={staff.email} />
                                        <ViewField label="Phone" value={staff.phone1} />
                                        <ViewField label="Alternate Phone" value={staff.phone2} />
                                        <ViewField label="Address" value={staff.address} />
                                </PropertyViewSection>


                                <PropertyViewSection title="Property & Role" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        <ViewField label="Property" value={staff.property_id} />
                                        <ViewField label="Department" value={staff.department} />
                                        <ViewField label="Designation" value={staff.designation} />
                                        <ViewField label="Role" value={staff.role_ids?.[0]} />
                                        <ViewField label="Employment Type" value={staff.employment_type} />
                                        <ViewField label="Joining Date" value={staff.hire_date} />
                                </PropertyViewSection>


                                <PropertyViewSection title="Emergency Contacts" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        <ViewField label="Primary Contact" value={staff.emergency_contact} />
                                        <ViewField label="Contact Name" value={staff.emergency_contact_name} />
                                        <ViewField label="Relation" value={staff.emergency_contact_relation} />
                                        <ViewField label="Secondary Contact" value={staff.emergency_contact_2} />
                                </PropertyViewSection>


                                <PropertyViewSection title="Identification" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        <ViewField label="ID Proof Type" value={staff.id_proof_type} />
                                        <ViewField label="ID Number" value={staff.id_number} />
                                </PropertyViewSection>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                        <p className="text-sm text-muted-foreground">No history logs available yet.</p>
                                    </div>
                                )}
                            </div>

                        ) : (

                            <>


                                {/* ================= PERSONAL DETAILS ================= */}

                                <PersonalDetails
                                    value={staff}
                                    setValue={setStaff}
                                    errors={formErrors}
                                    setErrors={setFormErrors}
                                    viewMode={viewMode}
                                    mode={mode}
                                    staffImageExists={staffImageExists}
                                />

                                {/* ================= CONTACT & LOGIN ================= */}

                                <ContactLogin
                                    value={staff}
                                    setValue={setStaff}
                                    errors={formErrors}
                                    setErrors={setFormErrors}
                                    viewMode={viewMode}
                                    mode={mode}
                                />

                                {/* ================= PROPERTY & ROLE ================= */}

                                <PropertyRoleAssignment
                                    value={staff}
                                    setValue={setStaff}
                                    errors={formErrors}
                                    setErrors={setFormErrors}
                                    viewMode={viewMode}
                                    roles={roles?.roles}
                                    excludedRoles={excludedRoles}
                                    properties={myProperties?.properties}
                                    isSuperAdmin={isSuperAdmin}
                                    myPropertiesLoading={myPropertiesLoading}
                                    isPrivilegeUser={isSuperAdmin || isOwner}
                                />

                                {/* ================= EMERGENCY CONTACTS ================= */}

                                <EmergencyContacts
                                    value={staff}
                                    setValue={setStaff}
                                    errors={formErrors}
                                    setErrors={setFormErrors}
                                    viewMode={viewMode}
                                />

                                {/* ================= IDENTIFICATION ================= */}

                                <IdentificationDocuments
                                    value={staff}
                                    setValue={setStaff}
                                    errors={formErrors}
                                    setErrors={setFormErrors}
                                    viewMode={viewMode}
                                    mode={mode}
                                    idProofMode={idProofMode}
                                    setIdProofMode={setIdProofMode}
                                    staffIdProofExists={staffIdProofExists}
                                    downloadImage={downloadImage}
                                />
                            </>

                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">

                            <Button
                                variant="heroOutline"
                                onClick={() => setSheetOpen(false)}
                            >
                                {viewMode ? "Close" : "Cancel"}
                            </Button>


                            {/* CREATE */}
                            {mode === "add" && permission?.can_create && (
                                <Button
                                    variant="hero"
                                    disabled={creating || updating}
                                    onClick={handleSubmit}
                                >
                                    Create Staff
                                </Button>
                            )}

                            {/* UPDATE */}
                            {mode === "edit" && permission?.can_create && (
                                <Button
                                    variant="hero"
                                    disabled={creating || updating}
                                    onClick={handleSubmit}
                                >
                                    Update
                                </Button>
                            )}

                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
                <DialogContent>

                    <DialogHeader>
                        <DialogTitle>Update Password</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">

                        <div>
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Password</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                className="h-9"
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                className="h-9"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="heroOutline"
                                onClick={() => setPasswordModalOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="hero"
                                onClick={handlePasswordUpdate}
                            >
                                Update Password
                            </Button>
                        </div>

                    </div>

                </DialogContent>
            </Dialog>

        </div>
    );
}
