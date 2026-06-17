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
import { useCreatePackageMutation, useGetMyPropertiesQuery, useGetPackageByIdQuery, useGetPackagesByPropertyQuery, useUpdatePackageMutation, useGetLogsQuery as useGetAuditLogsQuery, useGetLogsByTableQuery } from "@/redux/services/hmsApi";
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
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import { formatAppDateTime } from "@/utils/dateFormat";
import { getFormattedAuditChanges, getAuditActionBadge, getAuditChangePlainText, formatAuditActionText } from "@/utils/auditUtils";

const getAuditChangeText = (details: any, audit: any) => {
    if (audit.event_type === "CREATE") {
        return (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Plan:</span> Created
            </div>
        );
    }
    
    if (!details) return "--";

    const { before, after } = details;
    
    // For CREATE, there might only be 'after' with the initial values
    if (!before && after) {
        return (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Plan:</span> Created
            </div>
        );
    }
    
    if (!before || !after) {
        // Handle flat legacy logs using the global formatter
        if (typeof details === 'object' && Object.keys(details).length > 0) {
            // Filter out internal fields if needed, getFormattedAuditChanges already does some filtering
            // but we can map the keys nicely.
            const customParsers = {
                "package_name": (v: any) => v,
                "base_price": (v: any) => `₹${v}`,
            };
            return getFormattedAuditChanges(details, customParsers);
        }
        return "--";
    }

    const formattedDetails: any = { before: {}, after: {} };

    Object.keys(after).forEach((key) => {
        const oldVal = before[key];
        const newVal = after[key];
        if (oldVal !== newVal) {
            formattedDetails.before[key] = oldVal || "--";
            formattedDetails.after[key] = newVal || "--";
        }
    });

    return getFormattedAuditChanges(formattedDetails);
};

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
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const { 
        myProperties, 
        isMultiProperty, 
        isInitializing,
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    const { page, limit, setPage, resetPage, handleLimitChange } = useGridPagination({
        resetDeps: [selectedPropertyId, statusFilter, typeFilter, searchQuery],
    });

    const [mainTab, setMainTab] = useState<"packages" | "audit">("packages");
    const [mainAuditPage, setMainAuditPage] = useState(1);
    const [mainAuditLimit, setMainAuditLimit] = useState(10);
    const [historySearchInput, setHistorySearchInput] = useState("");
    const [historySearchQuery, setHistorySearchQuery] = useState("");
    const [historyActionFilter, setHistoryActionFilter] = useState("");

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const {
        data: globalAuditLogs,
        isLoading: globalAuditLogsLoading,
        isFetching: globalAuditLogsFetching,
        refetch: refetchGlobalAuditLogs
    } = useGetLogsByTableQuery({
        tableName: "packages",
        page: mainAuditPage,
        limit: mainAuditLimit,
    }, {
        skip: !isLoggedIn || mainTab !== "audit"
    });

    const paginatedHistoryLogs = useMemo(() => {
        let rows = globalAuditLogs?.data ?? [];
        if (historySearchQuery) {
            const lowerQuery = historySearchQuery.toLowerCase();
            rows = rows.filter((r: any) =>
                r.event_type?.toLowerCase().includes(lowerQuery) ||
                r.user_name?.toLowerCase().includes(lowerQuery) ||
                r.user_first_name?.toLowerCase().includes(lowerQuery) ||
                (r.event_id && formatModuleDisplayId("package", r.event_id).toLowerCase().includes(lowerQuery))
            );
        }
        if (historyActionFilter) {
            rows = rows.filter((r: any) => r.event_type?.toUpperCase() === historyActionFilter.toUpperCase());
        }
        return rows;
    }, [globalAuditLogs?.data, historySearchQuery, historyActionFilter]);

    const historyTotalRecords = globalAuditLogs?.pagination?.totalItems ?? globalAuditLogs?.pagination?.total ?? 0;
    const historyTotalPages = globalAuditLogs?.pagination?.totalPages ?? 1;

    const historyActionOptions = useMemo(() => ["CREATE", "UPDATE", "DELETE"], []);

    const resetHistoryFilters = () => {
        setHistorySearchInput("");
        setHistorySearchQuery("");
        setHistoryActionFilter("");
        setMainAuditPage(1);
    };

    const refreshHistoryGrid = async () => {
        if (globalAuditLogsFetching) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchGlobalAuditLogs();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const exportHistoryLogs = () => {
        if (!paginatedHistoryLogs.length) return toast.info("No history rows to export");
        const formatted = paginatedHistoryLogs.map((audit: any) => {
            let details: any = null;
            try {
                details = typeof audit.details === "string" ? JSON.parse(audit.details) : audit.details;
            } catch {}
            
            let changeText = "--";
            if (details) {
                changeText = getAuditChangePlainText(details, {
                    "package_name": (v: any) => v,
                    "base_price": (v: any) => `₹${v}`,
                });
            }

            return {
                "Plan ID": formatModuleDisplayId("package", audit.event_id),
                "Action": formatAuditActionText(audit.event_type),
                "Change": changeText,
                "User": `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                "Date & Time": formatAppDateTime(audit.created_on),
            };
        });
        exportToExcel(formatted, "Plans-History.xlsx");
        toast.success("Export completed");
    };

    const [selectedPackage, setSelectedPackage] = useState<PackageDetail>({
        package_name: "",
        description: "",
        base_price: "",
        is_active: true,
        system_generated: false
    });
    const [selectedPackageId, setSelectedPackageId] = useState(0)

    const {
        data: packages,
        isLoading: packagesLoading,
        isFetching: packagesFetching,
        isUninitialized: packageUninitialized,
        refetch: refetchPackages
    } = useGetPackagesByPropertyQuery({ 
        propertyId: String(selectedPropertyId), 
        page, 
        limit,
        search: searchQuery,
        status: statusFilter,
        type: typeFilter
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: selectedPackageData, isLoading: packageLoading } = useGetPackageByIdQuery({ packageId: selectedPackageId }, {
        skip: !selectedPackageId || !isLoggedIn
    })

    const [itemAuditPage, setItemAuditPage] = useState(1);
    const itemAuditLimit = 10;

    const { data: auditLogs, isLoading: isAuditLogsLoading, isFetching: isAuditLogsFetching } = useGetAuditLogsQuery(
        {
            tableName: "packages",
            eventId: selectedPackageId,
            page: itemAuditPage,
            limit: itemAuditLimit,
        },
        {
            skip: !selectedPackageId || sheetTab !== "history" || sheetOpen === false,
        }
    );

    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const [createPackage] = useCreatePackageMutation()
    const [updatePackage] = useUpdatePackageMutation()
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);

    /* -------------------- Handlers -------------------- */
    const handleOpenAdd = () => {
        setMode("add");
        setSheetTab("summary");
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
        setSheetTab("summary");
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
        const selectedPackage = { ...selectedPackageData?.data }
        if (selectedPackage && selectedPackage.base_price == 0.00) {
            selectedPackage.base_price = ""
        }
        setSelectedPackage(selectedPackage)
    }, [selectedPackageData, packageLoading])

    const auditColumns: ColumnDef<any>[] = useMemo(
        () => [

            {
                label: "Action",
                key: "event_type",
                cellClassName: "whitespace-nowrap min-w-[120px]",
                render: (row: any) => getAuditActionBadge(row.event_type),
            },
            { 
                label: "Updated By", 
                cellClassName: "whitespace-nowrap",
                render: (log: any) => `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || "System"
            },
            {
                label: "Date & Time",
                headClassName: "text-white",
                key: "created_on",
                render: (row: any) => row.created_on ? formatAppDateTime(row.created_on) : "--",
                cellClassName: "text-muted-foreground whitespace-nowrap min-w-[130px]"
            },
            {
                label: "Changes",
                key: "details",
                render: (row: any) => {
                    if (!row.details) return "--";
                    let detailsObj = row.details;
                    if (typeof detailsObj === "string") {
                        try {
                            detailsObj = JSON.parse(detailsObj);
                        } catch (e) {
                            return "--";
                        }
                    }
                    return getAuditChangeText(detailsObj, row);
                },
                className: "whitespace-normal break-words min-w-[300px] max-w-[350px] py-2"
            },
        ],
        [itemAuditPage, itemAuditLimit, selectedPackageId]
    );

    const packageRows = useMemo(() => packages?.packages ?? [], [packages?.packages]);

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const refreshTable = async () => {
        if (packagesFetching) return;
        const toastId = toast.loading("Refreshing data...");

        try {
            await refetchPackages();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const exportPlansSheet = () => {
        if (!packageRows.length) {
            toast.info("No plans available to export");
            return;
        }

        const formatted = packageRows.map((pkg) => ({
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

    const totalRecords = packages?.pagination?.totalItems ?? packages?.pagination?.total ?? packageRows.length;
    const totalPages = packages?.pagination?.totalPages ?? 1;

    const paginatedPackageRows = packageRows;

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
                    tone={pkg.system_generated ? "accent" : "info"}
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
            <section className="p-4 lg:p-6 space-y-4">
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
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => {
                                        setSelectedPropertyId(Number(e.target.value) || null);
                                        resetPage();
                                    }}
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

                <div className="border-b border-border flex">
                    <button
                        onClick={() => setMainTab("packages")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            mainTab === "packages"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Plans
                    </button>
                    <button
                        onClick={() => setMainTab("audit")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            mainTab === "audit"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        History
                    </button>
                </div>

                {mainTab === "packages" && (
                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
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
                                    label="Type"
                                    value={typeFilter}
                                    onChange={(value) => {
                                        setTypeFilter(value);
                                        resetPage();
                                    }}
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
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        resetPage();
                                    }}
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
                )}

                {mainTab === "audit" && (
                    <div className="flex-1">
                        <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                            <div className="w-full">
                                <GridToolbar className="border-b-0">
                                    <GridToolbarRow className="gap-2">
                                        <GridToolbarSearch
                                            value={historySearchInput}
                                            onChange={setHistorySearchInput}
                                            onSearch={() => {
                                                setHistorySearchQuery(historySearchInput.trim());
                                                setMainAuditPage(1);
                                            }}

                                        />

                                        <GridToolbarSelect
                                            label="Action"
                                            value={historyActionFilter}
                                            onChange={(value) => {
                                                setHistoryActionFilter(value);
                                                setMainAuditPage(1);
                                            }}
                                            options={[
                                                { label: "All", value: "" },
                                                ...historyActionOptions.map((action) => ({
                                                    label: action,
                                                    value: action,
                                                })),
                                            ]}
                                        />

                                        <GridToolbarActions
                                            className="gap-1 justify-end"
                                            actions={[
                                                {
                                                    key: "export",
                                                    label: "Export History",
                                                    icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: exportHistoryLogs,
                                                },
                                                {
                                                    key: "reset",
                                                    label: "Reset Filters",
                                                    icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: resetHistoryFilters,
                                                },
                                                {
                                                    key: "refresh",
                                                    label: "Refresh Data",
                                                    icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                    onClick: refreshHistoryGrid,
                                                    disabled: globalAuditLogsFetching,
                                                },
                                            ]}
                                        />
                                    </GridToolbarRow>
                                </GridToolbar>
                            </div>
                            <div className="px-2 pb-2">
                                <AppDataGrid
                                    data={paginatedHistoryLogs}
                                    loading={globalAuditLogsLoading}
                                    rowKey={(audit: any) => audit.id}
                                    emptyText="No history logs found."
                                    showActions={false}
                                    enablePagination={true}
                                    paginationProps={{
                                        page: mainAuditPage,
                                        setPage: setMainAuditPage,
                                        totalPages: historyTotalPages,
                                        disabled: globalAuditLogsFetching,
                                        totalRecords: historyTotalRecords,
                                        limit: mainAuditLimit,
                                        onLimitChange: (limit) => {
                                            setMainAuditLimit(limit);
                                            setMainAuditPage(1);
                                        }
                                    }}
                                    columns={[
                                        {
                                            label: "Plan ID",
                                            headClassName: "text-center w-[120px]",
                                            cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                            render: (audit: any) => audit.event_id ? formatModuleDisplayId("package", audit.event_id) : "—",
                                        },
                                        {
                                            label: "Action",
                                            headClassName: "text-center w-[140px]",
                                            cellClassName: "text-center font-medium min-w-[140px]",
                                            render: (audit: any) => getAuditActionBadge(audit.event_type),
                                        },
                                        {
                                            label: "Change",
                                            headClassName: "w-[320px]",
                                            cellClassName: "min-w-[320px] whitespace-normal text-primary/80 font-medium",
                                            render: (audit: any) => {
                                                let parsed = audit.details;
                                                if (typeof parsed === 'string') {
                                                    try { parsed = JSON.parse(parsed); } catch { }
                                                }
                                                return getFormattedAuditChanges(parsed, {
                                                    "package_name": (v: any) => v,
                                                    "base_price": (v: any) => `₹${v}`,
                                                });
                                            },
                                        },
                                        {
                                            label: "User",
                                            headClassName: "w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => `${audit.user_first_name || ""} ${audit.user_last_name || ""}`.trim() || audit.user_name || "System",
                                        },
                                        {
                                            label: "Date & Time",
                                            headClassName: "text-white w-[180px]",
                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                            render: (audit: any) => formatAppDateTime(audit.created_on),
                                        },
                                    ] as ColumnDef<any>[]}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className={cn("w-full overflow-y-auto bg-background p-0 transition-all duration-300", sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-3xl sm:max-w-2xl")}
                >
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col h-full"
                        >
                            <SheetHeader className="px-6 pb-4 pt-2 border-b border-border relative">
                                <div className="space-y-1">
                                    <SheetTitle className="text-xl font-bold">
                                        {mode === "add" ? "Create New Plan" : mode === "edit" ? `Update Plan ${selectedPackage?.id ? `[#${formatModuleDisplayId("package", selectedPackage.id)}]` : "..."}` : `Plan Summary ${selectedPackage?.id ? `[#${formatModuleDisplayId("package", selectedPackage.id)}]` : "..."}`}
                                    </SheetTitle>
                                   <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                        {mode === "add" ? "Setup new room plan" : mode === "edit" ? "Modify existing plan information" : "Plan details and pricing"}
                                    </p>
                                </div>
                            </SheetHeader>

                            <div className="px-6 pb-6 pt-4 flex-1 overflow-y-auto">
                            {mode === "view" ? (
                                <div className="space-y-4">
                                    <div className="border-b border-border flex">
                                        <button
                                            onClick={() => setSheetTab("summary")}
                                            className={cn(
                                                "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
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
                                                "px-4 py-2 text-xs font-bold tracking-widest transition-all border-b-2 -mb-[2px]",
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
                                            <CardSectionView title="Plan Configuration" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                <ViewField label="Plan Name" value={selectedPackage?.package_name} />
                                                <ViewField label="Base Price" value={selectedPackage?.base_price ? `₹ ${selectedPackage.base_price}` : "—"} />
                                                <ViewField label="Type" value={selectedPackage?.system_generated ? "System" : "Custom"} />
                                                <ViewField label="Status" value={selectedPackage?.is_active ? "Active" : "Inactive"} />
                                            </CardSectionView>

                                            <CardSectionView title="Internal Description" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 gap-y-4">
                                                <ViewField label="Description" value={selectedPackage?.description || "No description provided."} />
                                            </CardSectionView>
                                        </div>
                                    )}

                                    {sheetTab === "history" && (
                                        !auditLogs?.data?.length ? (
                                            <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                                <p className="text-sm text-muted-foreground italic">No history logs available yet.</p>
                                            </div>
                                        ) : (
                                            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                                <AppDataGrid
                                                    columns={auditColumns}
                                                    data={auditLogs.data}
                                                    loading={isAuditLogsLoading || isAuditLogsFetching}
                                                    enablePagination
                                                    paginationProps={{
                                                        page: itemAuditPage,
                                                        totalPages: auditLogs.pagination?.totalPages || 1,
                                                        setPage: setItemAuditPage,
                                                        disabled: isAuditLogsFetching,
                                                        totalRecords: auditLogs.pagination?.total || 0,
                                                        limit: itemAuditLimit,
                                                    }}
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(isSuperAdmin || isOwner) && mode === "add" && (
                                        <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-1 -mt-1 -mb-2">
                                            <Label>Property</Label>
                                            <NativeSelect
                                                className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                                value={selectedPropertyId ?? ""}
                                                onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
                                            >
                                                <option value="" disabled>Select Property</option>
                                                {!myPropertiesLoading &&
                                                    myProperties?.properties?.map((property: { id: number; brand_name: string }) => (
                                                        <option key={property.id} value={property.id}>
                                                            {property.brand_name}
                                                        </option>
                                                    ))}
                                            </NativeSelect>
                                        </div>
                                    )}

                                    <div className="rounded-[5px] border border-primary/50 bg-background p-5 shadow-sm space-y-5 [&>h3+*]:!mt-4">
                                        <h3 className="text-sm font-semibold text-primary/90">
                                            Plan Details
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-foreground">Plan Name*</Label>
                                                {selectedPackage?.system_generated ? (
                                                    <p className="text-sm font-semibold text-foreground py-1 px-0.5">
                                                        {selectedPackage?.package_name || "—"}
                                                    </p>
                                                ) : (
                                                    <Input
                                                        className={cn("h-10", submitted && formErrors.package_name ? "border-red-500" : "")}
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
                                                {submitted && formErrors.package_name && <p className="text-[10px] text-red-500 font-medium">{formErrors.package_name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-foreground">Description</Label>
                                                {selectedPackage?.system_generated ? (
                                                    <div className="bg-muted/10 p-3 rounded-[3px] border border-border/50 min-h-[80px]">
                                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                            {selectedPackage?.description || "No description provided"}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        className="w-full min-h-[100px] rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30 leading-relaxed resize-none shadow-none"
                                                        placeholder="Briefly describe what this plan includes..."
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

                                            <div className="space-y-2">
                                                <Label className="text-foreground">Base Price (₹)*</Label>
                                                <div className="relative max-w-[200px]">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                                    <Input
                                                        type="text"
                                                        className={cn("h-10 pl-7 font-semibold", submitted && formErrors.base_price ? "border-red-500" : "")}
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
                                                {submitted && formErrors.base_price && <p className="text-[10px] text-red-500 font-medium">{formErrors.base_price}</p>}
                                            </div>

                                            <div className="flex items-center gap-3 rounded-[5px] border border-primary/50 p-4 bg-accent/20">
                                                <Switch
                                                    className="scale-90"
                                                    checked={selectedPackage?.is_active}
                                                    disabled={selectedPackage?.system_generated}
                                                    onCheckedChange={(v) =>
                                                        setSelectedPackage((prev) => ({
                                                            ...prev,
                                                            is_active: v,
                                                        }))
                                                    }
                                                />
                                                <span className={cn(
                                                    "text-xs font-bold tracking-wide",
                                                    selectedPackage?.is_active ? "text-green-600" : "text-muted-foreground"
                                                )}>
                                                    {selectedPackage?.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="-mx-6 -mb-6 px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 mt-4">
                                <Button
                                    variant="heroOutline"
                                    onClick={() => setSheetOpen(false)}
                                >
                                    {mode === "view" ? "Close" : "Cancel"}
                                </Button>

                                {mode !== "view" && (
                                    <Button
                                        variant="hero"
                                        onClick={handleSubmit}
                                    >
                                        {mode === "add" ? "Create Plan" : "Update"}
                                    </Button>
                                )}
                            </div>
                            </div>
                        </motion.div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
