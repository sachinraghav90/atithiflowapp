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
import { useCreatePackageMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useUpdatePackageMutation, useUpdatePackagesBulkMutation } from "@/redux/services/hmsApi";
import { toast } from "react-toastify";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput, normalizeTextInput } from "@/utils/normalizeTextInput";
import { isWithinCharLimit } from "@/utils/isWithinCharLimit";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Pencil, RefreshCcw } from "lucide-react";
import { getStatusColor } from "@/constants/statusColors";
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect, GridToolbarRow, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useGridPagination } from "@/hooks/useGridPagination";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";

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
    const [mode, setMode] = useState<"add" | "edit">("add");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const { myProperties, isMultiProperty } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

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
        system_generated: true
    });
    const [selectedPackageId, setSelectedPackageId] = useState(0)
    const [isPriceEditMode, setIsPriceEditMode] = useState(false);
    const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});


    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const {
        data: packages,
        isLoading: packagesLoading,
        isFetching: packagesFetching,
        isUninitialized: packageUninitialized,
        refetch: refetchPackages
    } = useGetPackagesByPropertyQuery({ propertyId: String(selectedPropertyId), page, limit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: selectedPackageData, isLoading: packageLoading } = useGetPackageByIdQuery({ packageId: selectedPackageId }, {
        skip: !selectedPackageId || !isLoggedIn
    })

    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const [createPackage] = useCreatePackageMutation()
    const [updatePackage] = useUpdatePackageMutation()
    const [updatePackagesBulk] = useUpdatePackagesBulkMutation()
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
            system_generated: true
        });
        setSheetOpen(true);
    };

    const handleOpenEdit = async (pkg: PackageListItem) => {
        setSelectedPackageId(() => +pkg?.id)
        setMode("edit");
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

    const handlePriceChange = (id: string, value: string) => {
        setEditedPrices(prev => ({
            ...prev,
            [id]: normalizeNumberInput(value).toString(),
        }));
    };

    const hasPriceChanges = Object.keys(editedPrices).length > 0;

    const handleBulkPriceUpdate = () => {
        const payload = Object.entries(editedPrices).map(([id, base_price]) => ({
            id,
            base_price: Number(base_price),
        }));

        const promise = updatePackagesBulk({ packages: payload, propertyId: String(selectedPropertyId) }).unwrap()

        toast.promise(promise, {
            pending: "Updating plans...",
            error: "Error updating plans",
            success: "Plans updated successfully"
        })

        setIsPriceEditMode(false);
        setEditedPrices({});
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
    const totalPages = packages?.pagination?.totalPages ?? 1;

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

    const packageColumns = useMemo<ColumnDef<PackageDetail>[]>(() => [
        {
            label: "Plan ID",
            headClassName: "text-center",
            cellClassName: "text-center font-medium min-w-[90px]",
            render: (pkg) => (
                <button
                    type="button"
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => handleOpenEdit({ id: String(pkg.id), package_name: pkg.package_name })}
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
                <span className="inline-flex min-w-[84px] justify-center px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {pkg.system_generated ? "System" : "Custom"}
                </span>
            ),
        },
        {
            label: "Base Price",
            headClassName: "text-center",
            cellClassName: "text-center font-medium",
            render: (pkg) =>
                isPriceEditMode ? (
                    <div className="flex justify-center">
                        <Input
                            type="text"
                            className="h-8 w-24 text-center"
                            value={editedPrices[pkg.id!] ?? Number(pkg.base_price).toString()}
                            onChange={(e) => handlePriceChange(pkg.id!, e.target.value)}
                        />
                    </div>
                ) : (
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
                <span
                    className={cn(
                        "inline-flex min-w-[88px] justify-center px-3 py-1 text-xs font-semibold rounded-[3px]",
                        getStatusColor(pkg.is_active ? "active" : "inactive", "toggle")
                    )}
                >
                    {pkg.is_active ? "Active" : "Inactive"}
                </span>
            ),
        },
    ], [editedPrices, isPriceEditMode]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
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
                                    variant="heroOutline"
                                    className="h-10"
                                    onClick={() => {
                                        if (isPriceEditMode) {
                                            setIsPriceEditMode(false);
                                            setEditedPrices({});
                                            return;
                                        }

                                        setIsPriceEditMode(true);
                                        setEditedPrices({});
                                    }}
                                >
                                    {isPriceEditMode ? "Cancel Edit" : "Edit Prices"}
                                </Button>
                                <Button
                                    variant="hero"
                                    className="h-10"
                                    onClick={handleOpenAdd}
                                    disabled={isPriceEditMode}
                                >
                                    Add Plan
                                </Button>
                                <Button
                                    variant="hero"
                                    className="h-10"
                                    disabled={!isPriceEditMode || !hasPriceChanges}
                                    onClick={handleBulkPriceUpdate}
                                >
                                    Update Prices
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
                                    label="TYPE"
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    className="min-w-[160px]"
                                    options={[
                                        { label: "Any", value: "" },
                                        { label: "System", value: "system" },
                                        { label: "Custom", value: "custom" },
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="STATUS"
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    className="min-w-[180px]"
                                    options={[
                                        { label: "Any", value: "" },
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
                            columns={packageColumns}
                            data={!packageUninitialized && !packagesLoading ? filteredPackageRows : []}
                            rowKey={(pkg) => pkg.id ?? pkg.package_name}
                            loading={packagesLoading || packagesFetching}
                            emptyText="No plans found"
                            actionClassName="text-center w-[60px]"
                            actions={(pkg) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            aria-label={`Edit plan ${pkg.package_name}`}
                                            onClick={() => handleOpenEdit({ id: String(pkg.id), package_name: pkg.package_name })}
                                        >
                                            <Pencil className="w-4 h-4 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View / Edit Plan</TooltipContent>
                                </Tooltip>
                            )}
                            enablePagination={Boolean(packages?.pagination)}
                            paginationProps={packages?.pagination ? {
                                page,
                                totalPages,
                                setPage,
                                disabled: packagesFetching,
                                totalRecords: packages.pagination.totalItems ?? packages.pagination.total ?? packageRows.length,
                                limit,
                                onLimitChange: handleLimitChange,
                            } : undefined}
                        />
                    </div>

                </div>
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-xl overflow-y-auto scrollbar-hide"
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
                                        : "Edit plan"}
                                </SheetTitle>
                            </SheetHeader>

                            {/* Package Name */}
                            <div className="space-y-2">
                                <Label>Plan Name</Label>
                                {(mode === "edit" && selectedPackage?.system_generated) ?
                                    <p
                                        className="
                                        h-10
                                        w-full
                                        rounded-[3px]
                                        bg-background
                                        px-3
                                        flex
                                        items-center
                                        text-sm
                                        text-foreground
                                        cursor-default
                                        select-text
                                    "
                                    >
                                        {selectedPackage?.package_name}
                                    </p> :
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
                                }
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label>Description</Label>
                                {(mode === "edit" && selectedPackage?.system_generated) ?
                                    <p
                                        className="
                                        h-10
                                        w-full
                                        rounded-[3px]
                                        bg-background
                                        px-3
                                        flex
                                        items-center
                                        text-sm
                                        text-foreground
                                        cursor-default
                                        select-text
                                    "
                                    >
                                        {selectedPackage?.description}
                                    </p>
                                    : <textarea
                                        // readOnly={!(isSuperAdmin || isOwner || isAdmin) || (mode === "edit" && selectedPackage?.system_generated)}
                                        className="w-full min-h-[100px] rounded-[3px] border border-border bg-background px-3 py-2 text-sm"
                                        value={selectedPackage?.description}
                                        onChange={(e) => {
                                            const next = e.target.value
                                            if (isWithinCharLimit(next, 50)) {
                                                setSelectedPackage((prev) => ({
                                                    ...prev,
                                                    description: normalizeTextInput(e.target.value),
                                                }))
                                            }
                                        }}
                                    />}
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <Label>Base Price</Label>
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
                            </div>

                            {/* Active */}
                            {!selectedPackage?.system_generated && <div className="flex items-center gap-2">
                                <Switch
                                    // disabled={!(isSuperAdmin || isOwner || isAdmin)}
                                    checked={selectedPackage?.is_active}
                                    onCheckedChange={(v) =>
                                        setSelectedPackage((prev) => ({
                                            ...prev,
                                            is_active: v,
                                        }))
                                    }
                                />
                                <Label>Active</Label>
                            </div>}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    variant="heroOutline"
                                    onClick={() => setSheetOpen(false)}
                                >
                                    Cancel
                                </Button>

                                <Button variant="hero"
                                    // disabled={!selectedPackage?.base_price || !selectedPackage?.package_name}
                                    onClick={handleSubmit}>
                                    {mode === "add"
                                        ? "Create Plan"
                                        : "Save Changes"}
                                </Button>
                            </div>
                        </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

