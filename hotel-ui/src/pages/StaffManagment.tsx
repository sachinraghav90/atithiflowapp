import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { FilterX, Image as ImageIcon, KeyRound, Pencil, RefreshCcw } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useAddStaffMutation, useCreateUserMutation, useGetAllRolesQuery, useGetMyPropertiesQuery, useGetStaffByPropertyQuery, useLazyGetStaffByIdQuery, useUpdateStaffMutation, useUpdateStaffPasswordMutation, useGetPropertyAddressByUserQuery } from "@/redux/services/hmsApi";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiToast } from "@/utils/apiToastPromise";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/constants/statusColors";
import { useGridPagination } from "@/hooks/useGridPagination";

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
    status: "active" | "inactive";
    image?: File | null;
    id_proof?: File | null;
};

const STAFF_INITIAL_VALUE = {
    first_name: "",
    salutation: "",
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

    const [search, setSearch] = useState("");
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

    const debouncedSearch = useDebounce(search, 500);
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, debouncedSearch, statusFilter],
    });
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const { 
        myProperties, 
        isMultiProperty, 
        isSuperAdmin, 
        isOwner,
        isLoading: myPropertiesLoading
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: staffData, isLoading, isFetching, refetch: refetchStaff } = useGetStaffByPropertyQuery({
        property_id: selectedPropertyId,
        page,
        limit,
        search: debouncedSearch,
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
        setSearch("");
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

    const openStaffDetails = async (staffMember: Staff) => {
        try {
            setMode("view");
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

    return (
        <>
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Staff Directory</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your hotel staff and their roles
                    </p>
                </div>
                {permission?.can_create && (
                    <Button
                        onClick={() => {
                            setMode("add");
                            setStaff(STAFF_INITIAL_VALUE);
                            setFormErrors({});
                            setSheetOpen(true);
                        }}
                    >
                        Add Staff
                    </Button>
                )}
            </div>

                <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                    <GridToolbar className="mb-2">
                        {(isSuperAdmin || isOwner) && (
                            <GridToolbarSelect
                                label="PROPERTY"
                                value={selectedPropertyId}
                                onChange={setSelectedPropertyId}
                                className="min-w-[220px]"
                                options={[
                                    { label: "Select Property", value: "", disabled: true },
                                    ...(myProperties?.properties?.map((property: { id: string; brand_name: string }) => ({
                                        label: property.brand_name,
                                        value: property.id,
                                    })) ?? []),
                                ]}
                            />
                        )}

                        <GridToolbarSearch
                            value={search}
                            onChange={setSearch}
                            placeholder="Search staff name, email..."
                        />

                        <GridToolbarSelect
                            label="STATUS"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="min-w-[180px]"
                            options={[
                                { label: "All", value: "" },
                                { label: "Active", value: "active" },
                                { label: "Inactive", value: "inactive" },
                            ]}
                        />

                        <GridToolbarActions
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
                                    disabled: isFetching,
                                },
                            ]}
                        />
                    </GridToolbar>

                    <AppDataGrid
                    columns={[
                        {
                            label: "Name",
                            cellClassName: "font-medium",
                            render: (s: Staff) => `${s.salutation} ${s.first_name} ${s.last_name}`,
                        },
                        {
                            label: "Email",
                            key: "email",
                        },
                        {
                            label: "Designation",
                            key: "designation",
                        },
                        {
                            label: "Status",
                            render: (s: Staff) => (
                                <span
                                    className={cn(
                                        "px-3 py-1 text-xs font-semibold rounded-[3px]",
                                        getStatusColor(s.status, "staff")
                                    )}
                                >
                                    {s.status}
                                </span>
                            ),
                        },
                    ] as ColumnDef[]}
                    data={staffRows}
                    loading={isLoading}
                    emptyText="No staff added yet"
                    minWidth="700px"
                    rowKey={(s: Staff, idx: number) => s.id ?? idx}
                    actionLabel=""
                    actionClassName="text-center w-[112px]"
                    actions={(s: Staff) => (
                        <div className="flex justify-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                        aria-label={`View and edit details for ${s.first_name} ${s.last_name}`}
                                        onClick={() => openStaffDetails(s)}
                                    >
                                        <Pencil className="w-4 h-4 mx-auto" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>View / Edit Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-[3px]"
                                        onClick={() => openPasswordModal(s)}
                                        aria-label={`Update password for ${s.first_name} ${s.last_name}`}
                                    >
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Update Password</TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                    enablePagination={!!staffData?.pagination}
                    paginationProps={{
                        page,
                        totalPages: staffData?.pagination?.totalPages ?? 1,
                        setPage,
                        disabled: !staffData,
                        totalRecords: staffData?.pagination?.totalItems ?? staffData?.pagination?.total ?? staffData?.data?.length ?? 0,
                        limit,
                        onLimitChange: handleLimitChange,
                    }}
                />
                </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <SheetTitle>
                                {mode === "add"
                                    ? "Add Staff"
                                    : mode === "edit"
                                        ? "Edit Staff"
                                        : "Staff Details"}
                            </SheetTitle>
                        </SheetHeader>

                        {viewMode ? (

                            <>
                                {/* ================= PERSONAL DETAILS ================= */}

                                <StaffViewSection title="Personal Details">
                                    <div className="grid grid-cols-2 gap-4">

                                        <ViewField label="First Name" value={staff.first_name} />
                                        <ViewField label="Middle Name" value={staff.middle_name} />
                                        <ViewField label="Last Name" value={staff.last_name} />
                                        <ViewField label="Gender" value={staff.gender} />
                                        <ViewField label="Marital Status" value={staff.marital_status} />
                                        <ViewField label="DOB" value={staff.dob} />
                                        <ViewField label="Nationality" value={staff.nationality} />
                                        <ViewField label="Blood Group" value={staff.blood_group} />

                                    </div>
                                </StaffViewSection>

                                {/* ================= CONTACT ================= */}

                                <StaffViewSection title="Contact & Login">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ViewField label="Email" value={staff.email} />
                                        <ViewField label="Phone" value={staff.phone1} />
                                        <ViewField label="Alternate Phone" value={staff.phone2} />
                                        <ViewField label="Address" value={staff.address} />
                                    </div>
                                </StaffViewSection>

                                {/* ================= ROLE ================= */}

                                <StaffViewSection title="Property & Role">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ViewField label="Property" value={staff.property_id} />
                                        <ViewField label="Department" value={staff.department} />
                                        <ViewField label="Designation" value={staff.designation} />
                                        <ViewField label="Role" value={staff.role_ids?.[0]} />
                                        <ViewField label="Employment Type" value={staff.employment_type} />
                                        <ViewField label="Joining Date" value={staff.hire_date} />
                                    </div>
                                </StaffViewSection>

                                {/* ================= EMERGENCY ================= */}

                                <StaffViewSection title="Emergency Contacts">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ViewField label="Primary Contact" value={staff.emergency_contact} />
                                        <ViewField label="Contact Name" value={staff.emergency_contact_name} />
                                        <ViewField label="Relation" value={staff.emergency_contact_relation} />
                                        <ViewField label="Secondary Contact" value={staff.emergency_contact_2} />
                                    </div>
                                </StaffViewSection>

                                {/* ================= IDENTIFICATION ================= */}

                                <StaffViewSection title="Identification">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ViewField label="ID Proof Type" value={staff.id_proof_type} />
                                        <ViewField label="ID Number" value={staff.id_number} />
                                    </div>
                                </StaffViewSection>
                            </>

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
                                Close
                            </Button>

                            {/* VIEW MODE -> show edit button */}
                            {mode === "view" && (
                                <Button
                                    variant="hero"
                                    onClick={() => setMode("edit")}
                                >
                                    Edit Staff
                                </Button>
                            )}

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
                                    Save Changes
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
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Confirm Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
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

        </>
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

function StaffViewSection({ title, children }) {
    return (
        <div className="space-y-4 rounded-[5px] border border-border bg-card p-5">
            <h3 className="text-base font-semibold text-foreground">
                {title}
            </h3>
            {children}
        </div>
    );
}
