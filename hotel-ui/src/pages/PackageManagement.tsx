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
import { NativeSelect } from "@/components/ui/native-select";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { exportToExcel } from "@/utils/exportToExcel";
import { useAppSelector } from "@/redux/hook";
import { useCreatePackageMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useUpdatePackageMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { isWithinCharLimit } from "@/utils/isWithinCharLimit";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, RefreshCcw, Plus } from "lucide-react";
import { getStatusColor } from "@/constants/statusColors";
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect, GridToolbarRow, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { GridBadge } from "@/components/ui/grid-badge";

/* -------------------- Types -------------------- */
type PackageListItem = {
    id: string;
    package_name: string;
};

type PackageDetail = {
    id?: string;
    property_id?: string;
    package_name: string;
    description: string;
    base_price: string;
    is_active: boolean;
    system_generated: boolean
};

/* -------------------- Component -------------------- */
export default function PackageManagement() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"add" | "edit" | "view">("add");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const { myProperties, isMultiProperty, isInitializing } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        resetDeps: [selectedPropertyId, statusFilter, typeFilter, searchQuery],
    });

    const [selectedPackage, setSelectedPackage] = useState<PackageDetail>({
        package_name: "",
        description: "",
        base_price: "",
        is_active: true,
        system_generated: false
    });
    const [selectedPackageId, setSelectedPackageId] = useState(0)
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const {
        data: packages,
        isLoading: packagesLoading,
        isFetching: packagesFetching,
        isUninitialized: packageUninitialized,
        refetch: refetchPackages
    } = useGetPackagesByPropertyQuery({ propertyId: String(selectedPropertyId), page: 1, limit: 1000 }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: selectedPackageData, isLoading: packageLoading } = useGetPackageByIdQuery({ packageId: selectedPackageId }, {
        skip: !selectedPackageId || !isLoggedIn
    })

    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const [createPackage] = useCreatePackageMutation()
    const [updatePackage] = useUpdatePackageMutation()
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);

    /* -------------------- Handlers -------------------- */
    const handleOpenAdd = () => {
        setMode("add");
        setSelectedPackage({
            package_name: "",
            description: "",
            base_price: "",
            is_active: true,
            system_generated: false
        });
        setSheetOpen(true);
    };

    const handleOpenEdit = async (pkg: PackageListItem, forceMode: "edit" | "view" = "edit") => {
        setSelectedPackageId(() => +pkg?.id)
        setMode(forceMode);
        setSheetOpen(true);
    };

    const handleSubmit = () => {
        setSubmitted(true);

        const errors: Record<string, string> = {};

        if (!selectedPackage.package_name?.trim()) {
            errors.package_name = "Plan name is required";
        }

        if (!selectedPackage.base_price || Number(selectedPackage.base_price) <= 0) {
            errors.base_price = "Base price is required";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});

        const payload = {
            propertyId: String(selectedPropertyId),
            packageName: selectedPackage.package_name,
            description: selectedPackage.description,
            basePrice: selectedPackage.base_price,
            isActive: selectedPackage.is_active
        };

        const promise =
            mode === "add"
                ? createPackage(payload).unwrap()
                : updatePackage({ payload, packageId: selectedPackageId }).unwrap();

        toast.promise(promise, {
            pending: mode === "add" ? "Creating plan" : "Updating plan",
            success: mode === "add"
                ? "Package created successfully"
                : "Package updated successfully",
            error: "Error saving plan"
        });

        setSheetOpen(false);
    };

    useEffect(() => {
        if (packageLoading) return
        let selectedPackage = { ...selectedPackageData?.data }
        if (selectedPackage && selectedPackage.base_price == 0.00) {
            selectedPackage.base_price = ""
        }
        setSelectedPackage(selectedPackage)
    }, [selectedPackageData, packageLoading])

    const packageRows = useMemo(() => packages?.packages ?? [], [packages?.packages]);

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const refreshTable = async () => {
        if (packagesFetching) return;
        const toastId = toast.loading("Refreshing plans...");

        try {
            await refetchPackages();
            toast.dismiss(toastId);
            toast.success("Plans refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh plans");
        }
    };

    const exportPlansSheet = () => {
        if (!filteredPackageRows.length) {
            toast.info("No plans available to export");
            return;
        }

        const formatted = filteredPackageRows.map((pkg) => ({
            "Plan ID": formatModuleDisplayId("package", pkg.id),
            "Plan Name": pkg.package_name,
            "Description": pkg.description || "-",
            "Type": pkg.system_generated ? "System" : "Custom",
            "Base Price": `₹${Number(pkg.base_price).toFixed()}`,
            "Status": pkg.is_active ? "Active" : "Inactive",
        }));

        exportToExcel(formatted, "Plans.xlsx");
        toast.success("Export completed");
    };

    const resetFiltersHandler = () => {
        setSearchInput("");
        setSearchQuery("");
        setStatusFilter("");
        setTypeFilter("");
        resetPage();
    };

    const filteredPackageRows = useMemo(() => {
        const statusFiltered = statusFilter
            ? packageRows.filter((pkg) => String(pkg.is_active) === statusFilter)
            : packageRows;

        const typeFiltered = typeFilter
            ? statusFiltered.filter((pkg) => (typeFilter === "system" ? pkg.system_generated : !pkg.system_generated))
            : statusFiltered;

        return filterGridRowsByQuery(typeFiltered, searchQuery, [
            (pkg) => pkg.package_name,
            (pkg) => pkg.description,
            (pkg) => pkg.base_price,
            (pkg) => pkg.is_active ? "Active" : "Inactive",
            (pkg) => pkg.system_generated ? "System" : "Custom",
        ]);
    }, [packageRows, searchQuery, statusFilter, typeFilter]);

    const totalRecords = filteredPackageRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

    const paginatedPackageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredPackageRows.slice(start, start + limit);
    }, [filteredPackageRows, page, limit]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const packageColumns = useMemo<ColumnDef<PackageDetail>[]>(() => [
        {
            label: "Plan ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (pkg) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => handleOpenEdit({ id: String(pkg.id), package_name: pkg.package_name }, "view")}
                    aria-label={`Open plan ${formatModuleDisplayId("package", pkg.id)}`}
                >
                    {formatModuleDisplayId("package", pkg.id)}
                </button>
            ),
        },
        {
            label: "Plan Name",
            cellClassName: "font-semibold text-foreground",
            render: (pkg) => pkg.package_name,
        },
        {
            label: "Description",
            cellClassName: "text-muted-foreground max-w-[320px] text-sm",
            render: (pkg) => pkg.description || "-",
        },
        {
            label: "Type",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (pkg) => (
                <GridBadge
                    tone={pkg.system_generated ? "neutral" : "info"}
                    className="min-w-[84px]"
                >
                    {pkg.system_generated ? "System" : "Custom"}
                </GridBadge>
            ),
        },
        {
            label: "Base Price",
            headClassName: "text-center",
            cellClassName: "text-center font-medium",
            render: (pkg) => (
                <span className="inline-flex min-w-[72px] justify-center rounded-[3px] bg-muted/40 px-3 py-1 text-sm font-semibold">
                    {Number(pkg.base_price).toFixed()}
                </span>
            ),
        },
        {
            label: "Status",
            headClassName: "text-center",
            cellClassName: "text-center",
            render: (pkg) => (
                <GridBadge
                    status={pkg.is_active ? "active" : "inactive"}
                    statusType="toggle"
                    className="min-w-[88px]"
                >
                    {pkg.is_active ? "Active" : "Inactive"}
                </GridBadge>
            ),
        },
    ], []);

    return (
        <div className="flex flex-col">
            <section className="p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight text-foreground">
                            Plans
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage room plans and pricing
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        {isMultiProperty && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {myProperties?.properties?.map((property: { id: number; brand_name: string }) => (
                                        <option key={property.id} value={property.id}>
                                            {property.brand_name}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </div>
                        )}
                        {permission?.can_create &&
                            <>
                                <Button
                                    variant="hero"
                                    className="h-10 px-4 flex items-center gap-2"
                                    onClick={handleOpenAdd}
                                >
                                    <Plus className="w-4 h-4" /> Add Plan
                                </Button>
                            </>
                        }
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
                                    placeholder="Search plans..."
                                />

                                <GridToolbarSelect
                                    label="Type"
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    className="min-w-[160px]"
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "System", value: "system" },
                                        { label: "Custom", value: "custom" },
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    className="min-w-[180px]"
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Active", value: "true" },
                                        { label: "Inactive", value: "false" },
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Plans",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportPlansSheet,
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
                                            disabled: packagesFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={packageColumns}
                            data={!packageUninitialized && !packagesLoading ? paginatedPackageRows : []}
                            rowKey={(pkg) => pkg.id ?? pkg.package_name}
                            loading={packagesLoading || packagesFetching || isInitializing}
                            emptyText="No plans found"
                            actionClassName="text-center w-[60px]"
                            showActions={permission?.can_create}
                            actions={(pkg) => (
                                <>
                                    {permission?.can_create && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    aria-label={`Edit plan ${pkg.package_name}`}
                                                    onClick={() => handleOpenEdit({ id: String(pkg.id), package_name: pkg.package_name }, "edit")}
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View / Edit Plan</TooltipContent>
                                        </Tooltip>
                                    )}
                                </>
                            )}
                            enablePagination
                            paginationProps={{
                                page,
                                totalPages,
                                setPage,
                                disabled: packagesFetching,
                                totalRecords,
                                limit,
                                onLimitChange: handleLimitChange,
                            }}
                        />
                    </div>

                </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-xl overflow-y-auto"
                >
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <SheetHeader>
                                <SheetTitle>
                                    {mode === "add"
                                        ? "Add plan"
                                        : mode === "edit"
                                            ? "Edit plan"
                                            : "Plan summary"}
                                </SheetTitle>
                            </SheetHeader>

                            {/* Package Name */}
                            <div className="space-y-2">
                                <Label>Plan Name</Label>
                                {mode === "view" || (mode === "edit" && selectedPackage?.system_generated) ? (
                                    <p
                                        className="h-10 w-full rounded-[3px] bg-background px-3 flex items-center text-sm text-foreground cursor-default select-text"
                                    >
                                        {selectedPackage?.package_name}
                                    </p>
                                ) : (
                                    <Input
                                        className={submitted && formErrors.package_name ? "border-red-500" : ""}
                                        value={selectedPackage?.package_name}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            if (isWithinCharLimit(next, 50)) {
                                                setSelectedPackage(prev => ({
                                                    ...prev,
                                                    package_name: normalizeTextInput(next),
                                                }));
                                                setFormErrors(prev => ({ ...prev, package_name: "" }));
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label>Description</Label>
                                {mode === "view" || (mode === "edit" && selectedPackage?.system_generated) ? (
                                    <p
                                        className="w-full rounded-[3px] bg-background px-3 py-2 text-sm text-foreground cursor-default select-text whitespace-pre-wrap flex"
                                    >
                                        {selectedPackage?.description || "-"}
                                    </p>
                                ) : (
                                    <textarea
                                        className="w-full min-h-[100px] rounded-[3px] border border-border bg-background px-3 py-2 text-sm"
                                        value={selectedPackage?.description}
                                        onChange={(e) => {
                                            const next = e.target.value
                                            if (isWithinCharLimit(next, 200)) {
                                                setSelectedPackage((prev) => ({
                                                    ...prev,
                                                    description: normalizeTextInput(e.target.value),
                                                }))
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            {/* Price */}
                            <div className="space-y-2 pt-4 border-t border-border">
                                <Label>Base Price</Label>
                                {mode === "view" ? (
                                    <p className="h-10 w-full rounded-[3px] bg-background px-3 flex items-center text-sm text-foreground cursor-default">
                                        ₹ {selectedPackage?.base_price || "0.00"}
                                    </p>
                                ) : (
                                    <Input
                                        type="text"
                                        className={submitted && formErrors.base_price ? "border-red-500" : ""}
                                        value={selectedPackage?.base_price}
                                        onChange={(e) => {
                                            setSelectedPackage(prev => ({
                                                ...prev,
                                                base_price: normalizeNumberInput(e.target.value).toString(),
                                            }));
                                            setFormErrors(prev => ({ ...prev, base_price: "" }));
                                        }}
                                    />
                                )}
                            </div>

                            {/* Active */}
                            <div className="flex items-center gap-2">
                                {mode === "view" || (mode === "edit" && selectedPackage?.system_generated) ? (
                                    <div className="flex items-center gap-2">
                                        <Label>Status</Label>
                                        <span
                                            className={cn(
                                                "px-3 py-1 rounded-[3px] text-xs font-semibold",
                                                getStatusColor(selectedPackage?.is_active ? "active" : "inactive", "toggle")
                                            )}
                                        >
                                            {selectedPackage?.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <Switch
                                            checked={selectedPackage?.is_active}
                                            onCheckedChange={(v) =>
                                                setSelectedPackage((prev) => ({
                                                    ...prev,
                                                    is_active: v,
                                                }))
                                            }
                                        />
                                        <Label>Active</Label>
                                    </>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    variant="heroOutline"
                                    onClick={() => setSheetOpen(false)}
                                >
                                    {mode === "view" ? "Close" : "Cancel"}
                                </Button>

                                {mode === "view" ? null : (
                                    <Button
                                        variant="hero"
                                        onClick={handleSubmit}
                                    >
                                        {mode === "add" ? "Create Plan" : "Save Changes"}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

