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
import { FilterX, Pencil, RefreshCcw } from "lucide-react";
import { getStatusColor } from "@/constants/statusColors";
import { GridToolbar, GridToolbarActions, GridToolbarSearch, GridToolbarSelect } from "@/components/ui/grid-toolbar";
import { filterGridRowsByQuery } from "@/utils/filterGridRows";

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
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(9);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

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
    const { data: properties, isLoading: propertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn
    })

    const {
        data: packages,
        isLoading: packagesLoading,
        isFetching: packagesFetching,
        isUninitialized: packageUninitialized,
        refetch: refetchPackages
    } = useGetPackagesByPropertyQuery({ propertyId: selectedPropertyId, page, limit }, {
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
            propertyId: selectedPropertyId,
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

        const promise = updatePackagesBulk({ packages: payload, propertyId: selectedPropertyId }).unwrap()

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

    useEffect(() => {
        if (propertiesLoading || !properties || !Array.isArray(properties?.properties)) return
        const propertyId = properties?.properties[0]?.id
        setSelectedPropertyId(propertyId)
    }, [properties])

    const packageRows = useMemo(() => packages?.packages ?? [], [packages?.packages]);
    const totalPages = packages?.pagination?.totalPages ?? 1;

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId]);

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

    const resetFiltersHandler = () => {
        if (properties?.properties?.[0]?.id) {
            setSelectedPropertyId(properties.properties[0].id);
        }
        setSearchQuery("");
        setStatusFilter("");
        setPage(1);
    };

    const filteredPackageRows = useMemo(() => {
        const statusFiltered = statusFilter
            ? packageRows.filter((pkg) => String(pkg.is_active) === statusFilter)
            : packageRows;

        return filterGridRowsByQuery(statusFiltered, searchQuery, [
            (pkg) => pkg.package_name,
            (pkg) => pkg.description,
            (pkg) => pkg.base_price,
            (pkg) => pkg.is_active ? "Active" : "Inactive",
        ]);
    }, [packageRows, searchQuery, statusFilter]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Plans
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage room plans and pricing
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {!isPriceEditMode && permission?.can_create &&
                            <>
                                <Button
                                    variant="heroOutline"
                                    // disabled={!(isSuperAdmin || isOwner || isAdmin)}
                                    onClick={() => {
                                        setIsPriceEditMode(true);
                                        setEditedPrices({});
                                    }}
                                >
                                    Edit Prices
                                </Button>
                                <Button variant="hero" onClick={handleOpenAdd}>
                                    Add Plan
                                </Button>
                            </>
                        }

                        {isPriceEditMode && (
                            <>
                                <Button
                                    variant="hero"
                                    disabled={!hasPriceChanges}
                                    onClick={handleBulkPriceUpdate}
                                >
                                    Update Prices
                                </Button>
                                <Button
                                    variant="hero"
                                    // disabled={!hasPriceChanges}
                                    onClick={() => {
                                        setIsPriceEditMode(false);
                                        setEditedPrices({});
                                    }}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>

                </div>

                <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 mt-4 bg-muted/20 flex flex-col flex-1 min-h-0">
                    <GridToolbar className="mb-2">
                        {(isSuperAdmin || isOwner) && <GridToolbarSelect
                            label="PROPERTY"
                            value={selectedPropertyId}
                            onChange={setSelectedPropertyId}
                            className="min-w-[220px]"
                            options={[
                                { label: "--Please Select--", value: "", disabled: true },
                                ...(!propertiesLoading
                                    ? (properties?.properties?.map((property) => ({
                                        label: property.brand_name,
                                        value: property.id,
                                    })) ?? [])
                                    : []),
                            ]}
                        />}

                        <GridToolbarSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search plans..."
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
                                },
                            ]}
                        />
                    </GridToolbar>

                    <AppDataGrid
                    columns={[
                        {
                            label: "Plan Name",
                            key: "package_name",
                            cellClassName: "font-medium",
                        },
                        {
                            label: "Description",
                            key: "description",
                            cellClassName: "font-medium",
                        },
                        {
                            label: "Base Price",
                            cellClassName: "font-medium",
                            render: (pkg: PackageDetail) =>
                                isPriceEditMode ? (
                                    <Input
                                        type="text"
                                        className="h-8"
                                        value={editedPrices[pkg.id!] ?? Number(pkg.base_price).toString()}
                                        onChange={(e) => handlePriceChange(pkg.id!, e.target.value)}
                                    />
                                ) : (
                                    Number(pkg.base_price).toFixed()
                                ),
                        },
                        {
                            label: "Status",
                            render: (pkg: PackageDetail) => (
                                <span
                                    className={cn(
                                        "px-3 py-1 rounded-[3px] text-xs font-semibold",
                                        getStatusColor(pkg.is_active ? "active" : "inactive", "toggle")
                                    )}
                                >
                                    {pkg.is_active ? "Active" : "Inactive"}
                                </span>
                            ),
                        },
                    ] as ColumnDef[]}
                    data={!packageUninitialized && !packagesLoading ? filteredPackageRows : []}
                    loading={packagesLoading}
                    emptyText="No plans found"
                    minWidth="760px"
                    enablePagination
                    paginationProps={{
                        page,
                        totalPages,
                        setPage,
                        totalRecords: packages?.pagination?.total ?? packageRows.length,
                        limit,
                        onLimitChange: (value) => {
                            setLimit(value);
                            setPage(1);
                        },
                        disabled: packagesLoading || packagesFetching,
                    }}
                    actionLabel=""
                    actionClassName="text-center w-[72px]"
                    actions={(pkg: PackageListItem) => (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                    onClick={() => handleOpenEdit(pkg)}
                                    aria-label={`View and edit details for plan ${pkg.package_name}`}
                                >
                                    <Pencil className="w-4 h-4 mx-auto" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View / Edit Details</TooltipContent>
                        </Tooltip>
                    )}
                    />
                </div>
            </section>

            {/* -------------------- Add / Edit Sheet -------------------- */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    className="
                            fixed
                            left-1/2
                            top-1/2
                            -translate-x-1/2
                            -translate-y-1/2
                            w-full
                            sm:max-w-xl
                            max-h-[88vh]
                            overflow-y-auto
                            rounded-[5px]
                            scrollbar-hide
                        ">
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
                                    }
                                    }
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
        </div >
    );
}

