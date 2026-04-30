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

    const cleanSearchQuery = useMemo(() => {
        if (!searchQuery) return "";
        const statusLabels = VENDOR_STATUS_OPTIONS.map(opt => opt.label.toLowerCase());
        return searchQuery
            .split(/\s+/)
            .filter(word => !statusLabels.includes(word.toLowerCase()))
            .join(" ")
            .trim();
    }, [searchQuery]);

    const { data: vendors, isLoading, isFetching, isUninitialized, refetch: refetchVendors } = useGetPropertyVendorsQuery({ 
        propertyId: selectedPropertyId, 
        page, 
        limit, 
        search: cleanSearchQuery, 
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
                search: cleanSearchQuery,
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
                                        setPage(1);
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
                                        setPage(1);
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
                    loading={isLoading || isInitializing}
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
                        disabled: !vendors,
                        totalRecords: vendors?.pagination?.totalItems ?? vendors?.pagination?.total ?? vendors?.data?.length ?? 0,
                        limit,
                        onLimitChange: handleLimitChange
                    }}
                />
                    </div>
                    </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <SheetHeader>
                            <div className="space-y-1">
                                <SheetTitle>
                                    {mode === "add" || mode === "edit"
                                        ? `Vendor [${mode === "add" ? "#NEW" : editingVendor?.id ? formatModuleDisplayId("vendor", editingVendor.id) : "#NEW"}]`
                                        : `Vendor Summary [${editingVendor?.id ? formatModuleDisplayId("vendor", editingVendor.id) : "..."}]`
                                    }
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    {mode === "add"
                                        ? "Onboard new supplier or service provider"
                                        : mode === "edit"
                                            ? "Modify existing vendor contact or tax information"
                                            : "Comprehensive overview of vendor relationship"}
                                </p>
                            </div>
                        </SheetHeader>

                        {mode === "view" ? (
                            <div className="space-y-6 mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <VendorViewSection title="Basic Information">
                                        <div className="space-y-4">
                                            <DetailRow label="Vendor Name" value={form.name} />
                                            <DetailRow label="Primary Category" value={formatReadableLabel(form.vendor_type)} />
                                            <div className="space-y-1.5">
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Relationship Status</div>
                                                <GridBadge status={form.is_active ? "active" : "inactive"} statusType="toggle" className="mt-0.5">
                                                    {form.is_active ? "Active" : "Inactive"}
                                                </GridBadge>
                                            </div>
                                        </div>
                                    </VendorViewSection>

                                    <VendorViewSection title="Contact Channels">
                                        <div className="space-y-4">
                                            <DetailRow label="Direct Contact" value={form.contact_no} />
                                            <DetailRow label="Official Email" value={form.email_id} />
                                            <DetailRow label="Physical Address" value={form.address} />
                                        </div>
                                    </VendorViewSection>

                                    <VendorViewSection title="Compliance & Tax">
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailRow label="PAN Number" value={form.pan_no} />
                                            <DetailRow label="GST Identification" value={form.gst_no} />
                                        </div>
                                    </VendorViewSection>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 mt-6">
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
                                                setForm({
                                                    ...form,
                                                    contact_no: normalizeTextInput(e.target.value.trim()),
                                                });
                                                setFormErrors((p) => ({ ...p, contact_no: "" }));
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

                                {mode === "edit" && (
                                    <div className="flex items-center gap-3 rounded-[5px] border p-4 bg-background/50">
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
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
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
                                                : "Save Changes"}
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

/* ---------------- Helpers ---------------- */
function VendorViewSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-primary/20 pb-1">{title}</h3>
            {children}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-sm font-semibold text-foreground px-0.5">
                {value || "—"}
            </div>
        </div>
    );
}
