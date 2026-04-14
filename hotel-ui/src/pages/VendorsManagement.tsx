import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    useCreateVendorMutation,
    useGetMyPropertiesQuery,
    useGetPropertyVendorsQuery,
    useUpdateVendorMutation,
} from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useAppSelector } from "@/redux/hook";
import {
    selectIsOwner,
    selectIsSuperAdmin,
} from "@/redux/selectors/auth.selectors";
import { toast } from "react-toastify";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useGridPagination } from "@/hooks/useGridPagination";
import { FilterX, Pencil, RefreshCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusColor } from "@/constants/statusColors";

/* ---------------- Types ---------------- */
type Vendor = {
    id: string;
    property_id: string;
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
    is_active: boolean;
};

type VendorForm = {
    name: string;
    pan_no?: string;
    gst_no?: string;
    address?: string;
    contact_no?: string;
    email_id?: string;
    vendor_type?: string;
    is_active?: boolean;
};

/* ---------------- Component ---------------- */
export default function VendorsManagement() {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit" | "view">("add");
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

    const [form, setForm] = useState<VendorForm>({
        name: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500)
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, debouncedSearch],
    });

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const { 
        myProperties, 
        isMultiProperty, 
        isSuperAdmin, 
        isOwner,
        isLoading: myPropertiesLoading
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: vendors, isLoading, isFetching, isUninitialized, refetch: refetchVendors } = useGetPropertyVendorsQuery({ propertyId: selectedPropertyId, page, limit, search: debouncedSearch }, {
        skip: !isLoggedIn || !selectedPropertyId,
    });

    const [createVendor] = useCreateVendorMutation()
    const [updateVendor] = useUpdateVendorMutation()


    /* ---------------- Effects ---------------- */
    // Hook handles all initialization logic now


    /* ---------------- Handlers ---------------- */
    const openAdd = () => {
        setMode("add");
        setEditingVendor(null);
        setForm({ name: "" });
        setSheetOpen(true);
    };

    const handleSave = () => {
        setSubmitted(true);

        const errors: Record<string, string> = {};
        const PHONE_REGEX = /^[0-9()]{10,15}$/;

        if (!form.name?.trim()) {
            errors.name = "Name is required";
        }

        if (!form.address?.trim()) {
            errors.address = "Address is required";
        }

        if (!form.contact_no?.trim()) {
            errors.contact_no = "Contact number is required";
        } else if (!PHONE_REGEX.test(form.contact_no)) {
            errors.contact_no = "Invalid contact number";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            // toast.error(Object.values(errors)[0]); // optional
            return;
        }

        setFormErrors({});

        const payload =
            mode === "add"
                ? buildVendorPayload(form, Number(selectedPropertyId))
                : buildVendorPayload(form);

        const promise =
            mode === "add"
                ? createVendor(payload).unwrap()
                : updateVendor({
                    payload,
                    vendorId: editingVendor!.id,
                }).unwrap();

        toast.promise(promise, {
            pending: `${mode === "add" ? "Creating" : "Updating"} vendor...`,
            success: `Vendor ${mode === "add" ? "created" : "updated"} successfully`,
            error: `Error ${mode === "add" ? "creating" : "updating"} vendor`,
        });

        setSheetOpen(false);
    };

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)
    const vendorRows = useMemo(() => vendors?.data ?? [], [vendors?.data]);

    const resetFiltersHandler = () => {
        setSearch("");
        resetPage();
    };

    const refreshTable = async () => {
        if (isFetching) return;
        const toastId = toast.loading("Refreshing vendors...");

        try {
            await refetchVendors();
            toast.dismiss(toastId);
            toast.success("Vendors refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh vendors");
        }
    };

    useEffect(() => {
        if (!sheetOpen) {
            setFormErrors({});
            setSubmitted(false);
        }
    }, [sheetOpen]);

    const openView = (vendor: Vendor) => {

        setMode("view");

        setEditingVendor(vendor);

        setForm({
            name: vendor.name,
            pan_no: vendor.pan_no,
            gst_no: vendor.gst_no,
            address: vendor.address,
            contact_no: vendor.contact_no,
            email_id: vendor.email_id,
            vendor_type: vendor.vendor_type,
            is_active: vendor.is_active
        });

        setSheetOpen(true);
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Vendors</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage suppliers & vendors
                        </p>
                    </div>

                    {permission?.can_create && <Button variant="hero" onClick={openAdd}>
                        Add Vendor
                    </Button>}
                </div>

                <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                    <GridToolbar className="mb-2">
                        {(isOwner || isSuperAdmin) && (
                            <GridToolbarSelect
                                label="PROPERTY"
                                value={selectedPropertyId}
                                onChange={setSelectedPropertyId}
                                className="min-w-[220px]"
                                options={[
                                    { label: "Select Property", value: "", disabled: true },
                                    ...(myProperties?.properties?.map((p: { id: string; brand_name: string }) => ({
                                        label: p.brand_name,
                                        value: p.id,
                                    })) ?? []),
                                ]}
                            />
                        )}

                        <GridToolbarSearch
                            value={search}
                            onChange={setSearch}
                            placeholder="Search vendors..."
                        />

                        <GridToolbarSelect
                            label="STATUS"
                            value="all"
                            onChange={() => { }}
                            className="min-w-[160px]"
                            options={[{ label: "All", value: "all" }]}
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
                            key: "name",
                            cellClassName: "font-medium",
                        },
                        {
                            label: "Type",
                            render: (v: Vendor) => v.vendor_type || "—",
                        },
                        {
                            label: "Contact",
                            render: (v: Vendor) => v.contact_no || "—",
                        },
                        {
                            label: "Status",
                            render: (v: Vendor) => (
                                <span className={cn(
                                    "px-3 py-1 rounded-[3px] text-xs font-semibold",
                                    getStatusColor(v.is_active ? "active" : "inactive", "toggle")
                                )}>
                                    {v.is_active ? "Active" : "Inactive"}
                                </span>
                            ),
                        },
                    ] satisfies ColumnDef[]}
                    data={vendorRows}
                    loading={isLoading}
                    emptyText="No vendors found"
                    minWidth="600px"
                    actionLabel=""
                    actionClassName="text-center w-[72px]"
                    actions={(v: Vendor) => (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                    onClick={() => openView(v)}
                                    aria-label={`View and edit details for vendor ${v.name}`}
                                >
                                    <Pencil className="w-4 h-4 mx-auto" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View / Edit Details</TooltipContent>
                        </Tooltip>
                    )}
                    enablePagination={!!vendors?.pagination}
                    paginationProps={{
                        page,
                        totalPages: vendors?.pagination?.totalPages ?? 1,
                        setPage,
                        disabled: !vendors,
                        totalRecords: vendors?.pagination?.totalItems ?? vendors?.pagination?.total ?? vendors?.data?.length ?? 0,
                        limit,
                        onLimitChange: handleLimitChange
                    }}
                />
                </div>
            </section>

            {/* Add / Edit Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>
                            {mode === "add"
                                ? "Add Vendor"
                                : mode === "edit"
                                    ? "Edit Vendor"
                                    : "Vendor Details"}

                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 mt-6">

                        {mode === "view" ? (

                            <div className="space-y-4 text-sm">

                                <DetailRow label="Name" value={form.name} />

                                <DetailRow label="PAN" value={form.pan_no} />

                                <DetailRow label="GST" value={form.gst_no} />

                                <DetailRow label="Address" value={form.address} />

                                <DetailRow label="Contact No" value={form.contact_no} />

                                <DetailRow label="Email" value={form.email_id} />

                                <DetailRow label="Vendor Type" value={form.vendor_type} />

                            </div>

                        ) : (
                            <>
                                <div>
                                    <Label htmlFor="vendor-name">Name*</Label>
                                    <Input
                                        id="vendor-name"
                                        name="vendor_name"
                                        className={submitted && formErrors.name ? "border-red-500" : ""}
                                        value={form.name}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                name: normalizeTextInput(e.target.value),
                                            });
                                            setFormErrors((p) => ({ ...p, name: "" }));
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="vendor-pan">PAN</Label>
                                        <Input
                                            id="vendor-pan"
                                            name="vendor_pan"
                                            value={form.pan_no ?? ""}
                                            onChange={(e) =>
                                                e.target.value.length < 20 &&
                                                setForm({
                                                    ...form,
                                                    pan_no: normalizeTextInput(e.target.value),
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="vendor-gst">GST</Label>
                                        <Input
                                            id="vendor-gst"
                                            name="vendor_gst"
                                            value={form.gst_no ?? ""}
                                            onChange={(e) =>
                                                e.target.value.length < 20 &&
                                                setForm({
                                                    ...form,
                                                    gst_no: normalizeTextInput(e.target.value),
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="vendor-address">Address*</Label>
                                    <Input
                                        id="vendor-address"
                                        name="vendor_address"
                                        className={submitted && formErrors.address ? "border-red-500" : ""}
                                        value={form.address ?? ""}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                address: normalizeTextInput(e.target.value),
                                            });
                                            setFormErrors((p) => ({ ...p, address: "" }));
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="vendor-contact-no">Contact No*</Label>
                                        <Input
                                            id="vendor-contact-no"
                                            name="vendor_contact_no"
                                            className={submitted && formErrors.contact_no ? "border-red-500" : ""}
                                            value={form.contact_no ?? ""}
                                            onChange={(e) => {
                                                // if (e.target.value.trim().length <= 15) {
                                                setForm({
                                                    ...form,
                                                    contact_no: normalizeTextInput(e.target.value.trim()),
                                                });
                                                setFormErrors((p) => ({ ...p, contact_no: "" }));
                                                // }
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="vendor-email">Email</Label>
                                        <Input
                                            id="vendor-email"
                                            name="vendor_email"
                                            value={form.email_id ?? ""}
                                            onChange={(e) =>
                                                e.target.value.length < 150 &&
                                                setForm({
                                                    ...form,
                                                    email_id: normalizeTextInput(e.target.value),
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="vendor-type">Vendor Type</Label>
                                    <Input
                                        id="vendor-type"
                                        name="vendor_type"
                                        value={form.vendor_type ?? ""}
                                        onChange={(e) =>
                                            e.target.value.length < 50 &&
                                            setForm({
                                                ...form,
                                                vendor_type: normalizeTextInput(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                {mode === "edit" && <div className="flex items-center gap-3">

                                    <Switch
                                        className="scale-90"
                                        checked={!!form.is_active}
                                        onCheckedChange={(checked) =>
                                            setForm({
                                                ...form,
                                                is_active: checked
                                            })
                                        }
                                    />

                                    <span className={cn(
                                        "px-3 py-1 rounded-[3px] text-xs font-semibold",
                                        getStatusColor(form.is_active ? "active" : "inactive", "toggle")
                                    )}>
                                        {form.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>}

                            </>
                        )}
                        <div className="pt-4 border-t flex justify-end gap-3">

                            {mode === "view" ? (

                                permission?.can_create && (
                                    <>
                                        <Button
                                            variant="hero"
                                            onClick={() => setMode("edit")}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="heroOutline"
                                            onClick={() => setSheetOpen(false)}
                                        >
                                            Close
                                        </Button>
                                    </>
                                )

                            ) : (

                                <>
                                    <Button
                                        variant="heroOutline"
                                        onClick={() => setMode("view")}
                                    >
                                        Cancel
                                    </Button>

                                    {permission?.can_create && (
                                        <Button variant="hero" onClick={handleSave}>
                                            {mode === "add"
                                                ? "Create Vendor"
                                                : "Save Changes"}
                                        </Button>
                                    )}

                                </>

                            )}

                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div >
    );
}

/* ---------------- Helpers ---------------- */
function buildVendorPayload(
    form: VendorForm,
    propertyId?: number
) {
    const payload: VendorForm & { property_id?: number } = {
        name: form.name,
        pan_no: form.pan_no,
        gst_no: form.gst_no,
        address: form.address,
        contact_no: form.contact_no,
        email_id: form.email_id,
        vendor_type: form.vendor_type,
        is_active: form.is_active
    };

    if (propertyId) payload.property_id = propertyId;

    return payload;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
            <div className="text-muted-foreground">{label}</div>
            <div className="col-span-2 font-medium">
                {value || "—"}
            </div>
        </div>
    );
}
