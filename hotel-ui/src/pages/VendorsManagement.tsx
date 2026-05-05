import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { NativeSelect } from "@/components/ui/native-select";
import Sidebar from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
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
    useLazyExportPropertyVendorsQuery,
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
import { useGridPagination } from "@/hooks/useGridPagination";
import { FilterX, Pencil, RefreshCcw, Download, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { formatReadableLabel } from "@/utils/formatString";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";

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

const VENDOR_STATUS_OPTIONS = [
    { label: "All", value: "" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
];

const buildVendorPayload = (form: VendorForm, propertyId?: number) => {
    const payload: any = {
        name: form.name,
        pan_no: form.pan_no,
        gst_no: form.gst_no,
        address: form.address,
        contact_no: form.contact_no,
        email_id: form.email_id,
        vendor_type: form.vendor_type,
        is_active: form.is_active,
    };
    if (propertyId) payload.property_id = propertyId;
    return payload;
};

/* ---------------- Component ---------------- */
export default function VendorsManagement() {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit" | "view">("add");
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");

    const [form, setForm] = useState<VendorForm>({
        name: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        initialLimit: 10,
        resetDeps: [selectedPropertyId, searchQuery, typeFilter, statusFilter],
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

    const { data: vendors, isLoading, isFetching, isUninitialized, refetch: refetchVendors } = useGetPropertyVendorsQuery({ 
        propertyId: selectedPropertyId, 
        page, 
        limit, 
        search: searchQuery, 
        type: typeFilter, 
        status: statusFilter 
    }, {
        skip: !isLoggedIn || !selectedPropertyId,
    });

    const vendorTypeOptions = useMemo(() => {
        const types = Array.from(new Set((vendors?.data || []).map((v: Vendor) => v.vendor_type).filter(Boolean)));
        return types.map(t => ({ label: String(t), value: String(t) }));
    }, [vendors?.data]);

    const [getVendorsForExport, { isFetching: exportingVendors }] = useLazyExportPropertyVendorsQuery();

    const [createVendor] = useCreateVendorMutation()
    const [updateVendor] = useUpdateVendorMutation()


    /* ---------------- Handlers ---------------- */
    const openAdd = () => {
        setMode("add");
        setEditingVendor(null);
        setSheetTab("summary");
        setForm({ name: "", is_active: true });
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
    
    const vendorRows = useMemo(() => {
        return vendors?.data ?? [];
    }, [vendors?.data]);

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setTypeFilter("");
        setStatusFilter("");
        resetPage();
    };

    const exportVendorsSheet = async () => {
        if (exportingVendors) return;
        const toastId = toast.loading("Preparing vendors export...");

        try {
            const res = await getVendorsForExport({
                propertyId: selectedPropertyId,
                search: searchQuery.trim(),
                type: typeFilter,
                status: statusFilter
            }).unwrap();

            const rows = res?.data ?? [];

            if (!rows.length) {
                toast.dismiss(toastId);
                return toast.info("No data to export");
            }

            const formatted = rows.map((v: Vendor) => ({
                "Vendor ID": formatModuleDisplayId("vendor", v.id),
                "Name": v.name,
                "Type": v.vendor_type || "—",
                "Contact": v.contact_no || "—",
                "Status": v.is_active ? "Active" : "Inactive"
            }));

            exportToExcel(formatted, "Vendors.xlsx");
            toast.dismiss(toastId);
            toast.success("Vendors exported successfully");
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to export vendors");
        }
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

    const openView = (vendor: Vendor, forceMode: "view" | "edit" | "add" = "view") => {
        setMode(forceMode);
        setSheetTab("summary");

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
        <div className="flex flex-col bg-background">
            <section className="flex flex-col p-6 lg:p-8 gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold leading-tight">Vendors</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Supplier and vendor logistics management
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
                                    {myProperties?.properties?.map((p: any) => (
                                        <option key={p.id} value={p.id}>
                                            {p.brand_name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>
                        )}

                        {permission?.can_create && (
                            <Button variant="hero" className="h-10 px-4 flex items-center gap-2" onClick={openAdd}>
                                <Plus className="w-4 h-4" /> Add Vendor
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
                                    onChange={(val) => {
                                        setSearchInput(val);
                                        if (val.trim() === "") {
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
                                    label="Type"
                                    value={typeFilter}
                                    onChange={(val) => {
                                        setTypeFilter(val);
                                        resetPage();
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...vendorTypeOptions
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(val) => {
                                        setStatusFilter(val);
                                        resetPage();
                                    }}
                                    options={VENDOR_STATUS_OPTIONS}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Vendors",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportVendorsSheet,
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
                    scrollable={false}
                    columns={[
                        {
                            label: "Vendor ID",
                            headClassName: "text-center",
                            cellClassName: "text-center font-medium min-w-[90px]",
                            render: (v: Vendor) => (
                                <button
                                    type="button"
                                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                    onClick={() => openView(v, "view")}
                                    aria-label={`Open summary view for vendor ${formatModuleDisplayId("vendor", v.id)}`}
                                >
                                    {formatModuleDisplayId("vendor", v.id)}
                                </button>
                            ),
                        },
                        {
                            label: "Name",
                            key: "name",
                            cellClassName: "font-medium",
                        },
                        {
                            label: "Type",
                            cellClassName: "text-muted-foreground",
                            render: (v: Vendor) => formatReadableLabel(v.vendor_type) || "—",
                        },
                        {
                            label: "Contact",
                            cellClassName: "text-muted-foreground whitespace-nowrap",
                            render: (v: Vendor) => v.contact_no || "—",
                        },
                        {
                            label: "Status",
                            headClassName: "text-center",
                            cellClassName: "text-center",
                            render: (v: Vendor) => (
                                <GridBadge status={v.is_active ? "active" : "inactive"} statusType="toggle">
                                    {v.is_active ? "Active" : "Inactive"}
                                </GridBadge>
                            ),
                        },
                    ] satisfies ColumnDef[]}
                    data={vendorRows}
                    loading={isLoading || isFetching || isInitializing}
                    emptyText="No vendors found"
                    minWidth="600px"
                    actionLabel=""
                    actionClassName="text-center w-[60px]"
                    showActions={permission?.can_create}
                    actions={(v: Vendor) => (
                        <>
                            {permission?.can_create && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            onClick={() => openView(v, "edit")}
                                            aria-label={`View and edit details for vendor ${v.name}`}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View / Edit Details</TooltipContent>
                                </Tooltip>
                            )}
                        </>
                    )}
                    enablePagination={!!vendors?.pagination}
                    paginationProps={{
                        page,
                        totalPages: vendors?.pagination?.totalPages ?? 1,
                        setPage,
                        disabled: isFetching || !vendors,
                        totalRecords: vendors?.pagination?.totalItems ?? vendors?.pagination?.total ?? vendors?.data?.length ?? 0,
                        limit,
                        onLimitChange: handleLimitChange
                    }}
                />
                    </div>
                    </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full lg:max-w-4xl sm:max-w-3xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold text-foreground">
                                    {mode === "add" || mode === "edit"
                                        ? `Vendor ${mode === "add" ? "" : editingVendor?.id ? `#${formatModuleDisplayId("vendor", editingVendor.id)}` : ""}`
                                        : `Vendor ${editingVendor?.id ? `#${formatModuleDisplayId("vendor", editingVendor.id)}` : ""}`
                                    }
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {mode === "add"
                                        ? "Onboard New Supplier or Service Provider"
                                        : mode === "edit"
                                            ? "Modify Existing Vendor Contact or Tax Information"
                                            : "Comprehensive Overview of Vendor Relationship"}
                                </p>
                            </div>
                        </SheetHeader>

                        {mode === "view" ? (
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
                                    <div className="space-y-4">
                                        <PropertyViewSection title="Basic Information" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Vendor Name" value={form.name} />
                                            <ViewField label="Primary Category" value={formatReadableLabel(form.vendor_type)} />
                                            <ViewField label="Relationship Status" value={form.is_active ? "Active" : "Inactive"} />
                                        </PropertyViewSection>

                                        <PropertyViewSection title="Contact Channels" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="Direct Contact" value={form.contact_no} />
                                            <ViewField label="Official Email" value={form.email_id} />
                                            <ViewField label="Physical Address" value={form.address} />
                                        </PropertyViewSection>

                                        <PropertyViewSection title="Compliance & Tax" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            <ViewField label="PAN Number" value={form.pan_no} />
                                            <ViewField label="GST Identification" value={form.gst_no} />
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
                            <div className="space-y-5 mt-6">
                                <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-5">
                                    <h3 className="text-[11px] font-semibold text-primary/90 uppercase tracking-[0.16em] border-b border-primary/50 pb-2">
                                        Vendor Details
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name*</Label>
                                            <Input
                                                className={submitted && formErrors.name ? "border-red-500 h-10" : "h-10"}
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

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vendor Type</Label>
                                            <Input
                                                className="h-10"
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

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PAN</Label>
                                            <Input
                                                className="h-10"
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

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">GST</Label>
                                            <Input
                                                className="h-10"
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

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact No*</Label>
                                            <Input
                                                className={submitted && formErrors.contact_no ? "border-red-500 h-10" : "h-10"}
                                                value={form.contact_no ?? ""}
                                                onChange={(e) => {
                                                    setForm({
                                                        ...form,
                                                        contact_no: normalizeTextInput(e.target.value.trim()),
                                                    });
                                                    setFormErrors((p) => ({ ...p, contact_no: "" }));
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</Label>
                                            <Input
                                                className="h-10"
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

                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address*</Label>
                                            <Input
                                                className={submitted && formErrors.address ? "border-red-500 h-10" : "h-10"}
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
                                    </div>

                                    {mode === "edit" && (
                                        <div className="flex items-center gap-3 rounded-[5px] border border-primary/50 p-4 bg-accent/20">
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
                                                "px-3 py-1 rounded-[3px] text-xs font-bold uppercase tracking-wider",
                                                getStatusColor(form.is_active ? "active" : "inactive", "toggle")
                                            )}>
                                                {form.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                            {mode === "view" ? (
                                <Button
                                    variant="heroOutline"
                                    onClick={() => setSheetOpen(false)}
                                >
                                    Close
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="heroOutline"
                                        onClick={() => setSheetOpen(false)}
                                    >
                                        Cancel
                                    </Button>

                                    {permission?.can_create && (
                                        <Button variant="hero" onClick={handleSave}>
                                            {mode === "add"
                                                ? "Create Vendor"
                                                : "Update"}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
