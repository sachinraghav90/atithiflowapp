import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { MenuItemSelect } from "@/components/MenuItemSelect";
import { useCreateMenuItemBulkMutation, useCreateMenuItemGroupMutation, useCreateMenuItemMutation, useGetMenuItemGroupsLightQuery, useGetMenuItemGroupsQuery, useGetPropertyMenuLightQuery, useGetPropertyMenuQuery, useUpdateMenuItemGroupMutation, useUpdateMenuItemMutation, useGetLogsQuery as useGetAuditLogsQuery, useGetLogsByTableQuery } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { SheetContent, SheetHeader, SheetTitle, Sheet } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiToast } from "@/utils/apiToastPromise";
import { cn } from "@/lib/utils";
import MenuMasterBulkSheet from "@/components/MenuMasterBulkSheet";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Plus, Pencil, RefreshCcw, UtensilsCrossed, Flame, Clock, Info, DollarSign, Camera } from "lucide-react";
import { GridBadge } from "@/components/ui/grid-badge";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { formatAppDateTime } from "@/utils/dateFormat";
import { toast } from "react-toastify";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import CardSectionView from "@/components/CardSectionView";
import ViewField from "@/components/ViewField";
import { getFormattedAuditChanges, getAuditActionBadge, getAuditChangePlainText as getBaseAuditChangeText, formatAuditActionText } from "@/utils/auditUtils";

/* ---------------- Helpers ---------------- */
const parseAuditDetails = (details: any) => {
    try {
        return typeof details === "string" ? JSON.parse(details) : details;
    } catch {
        return null;
    }
};

const getAuditActionLabel = (audit: any) => {
    return getAuditActionBadge(audit.event_type);
};

const getAuditChangeText = (details: any, audit: any, isPlainText = false) => {
    if (audit.event_type === "CREATE") {
        return isPlainText ? "Menu Item: Created" : (
            <div className="text-muted-foreground">
                <span className="font-semibold text-foreground/80">Menu Item:</span> Created
            </div>
        );
    }
    
    if (!details) return "--";

    if (!details.before || !details.after) {
        // Fallback for flat objects (Create/Delete) or broken test records where before is null
        const fallbackDetails = (!details.before && details.after && typeof details.after === 'object') 
            ? details.after 
            : details;
        return isPlainText ? getBaseAuditChangeText(fallbackDetails) : getFormattedAuditChanges(fallbackDetails);
    }

    const { before, after } = details;
    const formattedDetails: any = { before: {}, after: {} };

    if (before.item_name !== undefined && before.item_name !== after.item_name) {
        formattedDetails.before["Item Name"] = before.item_name;
        formattedDetails.after["Item Name"] = after.item_name;
    }
    if (before.price !== undefined && before.price !== after.price) {
        formattedDetails.before["Price"] = `₹${String(before.price ?? "").replace(/^₹+/, "").trim()}`;
        formattedDetails.after["Price"] = `₹${String(after.price ?? "").replace(/^₹+/, "").trim()}`;
    }
    if (before.prep_time !== undefined && before.prep_time !== after.prep_time) {
        formattedDetails.before["Prep Time"] = before.prep_time || "None";
        formattedDetails.after["Prep Time"] = after.prep_time || "None";
    }
    if (before.menu_item_group !== undefined && before.menu_item_group !== after.menu_item_group) {
        formattedDetails.before["Menu Group"] = before.menu_item_group || "None";
        formattedDetails.after["Menu Group"] = after.menu_item_group || "None";
    }
    if (before.is_active !== undefined && before.is_active !== after.is_active) {
        formattedDetails.before["Active"] = before.is_active ? "Yes" : "No";
        formattedDetails.after["Active"] = after.is_active ? "Yes" : "No";
    }
    if (before.is_veg !== undefined && before.is_veg !== after.is_veg) {
        formattedDetails.before["Pure Veg"] = before.is_veg ? "Yes" : "No";
        formattedDetails.after["Pure Veg"] = after.is_veg ? "Yes" : "No";
    }
    if (before.description !== undefined && before.description !== after.description) {
        formattedDetails.before["Description"] = before.description || "None";
        formattedDetails.after["Description"] = after.description || "None";
    }
    if (before.image !== undefined && before.image !== after.image) {
        formattedDetails.before["Item Image"] = "Previous";
        formattedDetails.after["Item Image"] = "Updated";
    }

    return isPlainText ? getBaseAuditChangeText(formattedDetails) : getFormattedAuditChanges(formattedDetails);
};

type MenuItem = {
    id: string;
    menu_sequence?: string | number;
    property_id: string;
    item_name: string;
    menu_item_group: string;
    menu_item_group_id: string;
    price: string;
    is_active: boolean;
    is_veg: boolean;
    description?: string | null;
    image?: string | null;      // raw binary from API
    prep_time?: number | null;
};

type MenuForm = {
    item_name: string;
    menuItemGroupId: string;
    price: string;
    is_active: boolean;
    is_veg: boolean;
    prep_time?: number | "";
    image?: File | null;
    description: string;
};


function buildCreateMenuPayload(
    form: MenuForm,
    propertyId: number
) {
    const fd = new FormData();

    fd.append("propertyId", String(propertyId));
    fd.append("itemName", form.item_name);
    fd.append("menuItemGroupId", form.menuItemGroupId);
    fd.append("price", form.price);
    fd.append("isActive", String(form.is_active));
    fd.append("isVeg", String(form.is_veg));
    fd.append("description", form.description);

    if (form.prep_time !== "") {
        fd.append("prepTime", String(form.prep_time));
    }

    if (form.image) {
        fd.append("image", form.image);
    }

    return fd;
}

function buildUpdateMenuPayload(
    form: Partial<MenuForm>
) {
    const fd = new FormData();

    if (form.item_name) fd.append("itemName", form.item_name);
    if (form.menuItemGroupId) fd.append("menuItemGroupId", form.menuItemGroupId);
    if (form.price) fd.append("price", form.price);

    if (form.prep_time !== undefined && form.prep_time !== "") {
        fd.append("prepTime", String(form.prep_time));
    }

    if (form.is_active !== undefined) {
        fd.append("isActive", String(form.is_active));
    }

    if (form.is_veg !== undefined) {
        fd.append("isVeg", String(form.is_veg));
    }

    if (form.description !== undefined) {
        fd.append("description", form.description);
    }

    if (form.image) {
        fd.append("image", form.image);
    }

    return fd;
}

export default function MenuMaster() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"items" | "history">("items");
    const [auditPage, setAuditPage] = useState(1);
    const [auditLimit, setAuditLimit] = useState(10);
    const [auditSearchInput, setAuditSearchInput] = useState("");
    const [auditSearchQuery, setAuditSearchQuery] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
    const [selected, setSelected] = useState<MenuItem | null>(null);
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

    const [form, setForm] = useState<MenuForm>({
        item_name: "",
        menuItemGroupId: "",
        price: "",
        is_active: true,
        is_veg: true,
        prep_time: "",
        image: null,
        description: "",
    });

    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [viewGroupOpen, setViewGroupOpen] = useState(false);

    const [groupName, setGroupName] = useState("");
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
    const [editGroupName, setEditGroupName] = useState("");
    const [groupErrors, setGroupErrors] = useState<Record<string, string>>({});
    const [groupEditState, setGroupEditState] = useState({});
    const [bulkOpen, setBulkOpen] = useState(false);
    const [sheetTab, setSheetTab] = useState<"summary" | "history">("summary");
    const [itemAuditPage, setItemAuditPage] = useState(1);
    const [itemAuditLimit, setItemAuditLimit] = useState(5);
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { 
        myProperties, 
        isInitializing, 
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: menuData, isLoading, isFetching, refetch } = useGetPropertyMenuQuery({ 
        propertyId: selectedPropertyId,
        page, 
        limit,
        search: searchQuery.trim(),
        group: groupFilter,
        type: typeFilter,
        status: statusFilter
    }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: menuItemGroups } = useGetMenuItemGroupsQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: menuLight } = useGetPropertyMenuLightQuery(selectedPropertyId, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: menuGroupsLight } = useGetMenuItemGroupsLightQuery({ propertyId: selectedPropertyId }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const { data: auditLogs, isLoading: isAuditLogsLoading, isFetching: isAuditLogsFetching } = useGetAuditLogsQuery({
        tableName: "menu_master",
        eventId: selected?.id,
        page: itemAuditPage,
        limit: itemAuditLimit,
    }, {
        skip: !selected?.id || mode !== "view" || sheetTab !== "history"
    });

    const { data: globalAuditLogs, isLoading: globalAuditLoading, isFetching: globalAuditFetching, refetch: refetchGlobalLogs } = useGetLogsByTableQuery({
        tableName: "menu_master",
        propertyId: selectedPropertyId,
        page: auditPage,
        limit: auditLimit,
        search: auditSearchQuery,
        action: auditActionFilter,
    }, {
        skip: !isLoggedIn || !selectedPropertyId || activeTab !== "history"
    });

    const [createMenuItem] = useCreateMenuItemMutation()
    const [updateMenuItem] = useUpdateMenuItemMutation()
    const [createMenuItemGroup] = useCreateMenuItemGroupMutation()
    const [updateMenuItemGroup] = useUpdateMenuItemGroupMutation()
    const [createMenuItemBulk] = useCreateMenuItemBulkMutation()

    function validateMenuForm(form: MenuForm) {
        const errors: Record<string, string> = {};

        if (!form.item_name.trim())
            errors.item_name = "Item name is required";

        if (!form.price || Number(form.price) <= 0)
            errors.price = "Valid price is required";

        if (
            form.prep_time !== "" &&
            (Number(form.prep_time) <= 0 || isNaN(Number(form.prep_time)))
        ) {
            errors.prep_time = "Prep time must be a valid number";
        }

        return errors;
    }

    function buildCreateGroupPayload(name: string, propertyId: number) {
        return {
            property_id: propertyId,
            name
        };
    }

    useEffect(() => {
        if (!form.image) return;

        const previewUrl = URL.createObjectURL(form.image);
        return () => URL.revokeObjectURL(previewUrl);
    }, [form.image]);

    const menuGroupOptions = useMemo(() => {
        if (menuGroupsLight && Array.isArray(menuGroupsLight) && menuGroupsLight.length > 0) {
            return menuGroupsLight.map((g: any) => g.name).sort((a: string, b: string) => a.localeCompare(b));
        }

        const groups = Array.from(
            new Set((menuData?.data ?? []).map((item: MenuItem) => item.menu_item_group).filter(Boolean))
        );

        return groups.sort((a, b) => String(a).localeCompare(String(b)));
    }, [menuData?.data, menuGroupsLight]);

    const menuRows = useMemo(() => menuData?.data ?? [], [menuData?.data]);
    
    const totalRecords = menuData?.pagination?.total ?? 0;
    const totalPages = menuData?.pagination?.totalPages ?? 1;
    const paginatedMenuItems = menuRows;

    useEffect(() => {
        if (page > totalPages && totalPages > 0) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const resetGridFilters = () => {
        setSearchInput("");
        setSearchQuery("");
        setGroupFilter("");
        setTypeFilter("");
        setStatusFilter("");
        setPage(1);
    };

    const handleRefresh = async () => {
        if (isFetching) return;

        const toastId = toast.loading("Refreshing data...");

        try {
            await refetch();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const exportMenuItems = () => {
        if (!menuRows.length) {
            toast.info("No menu items to export");
            return;
        }

        const formatted = menuRows.map((item: MenuItem) => ({
            "Menu ID": formatModuleDisplayId("menu", item.menu_sequence || item.id),
            "Name": item.item_name,
            "Group": item.menu_item_group || "--",
            "Price": `₹${item.price}`,
            "Type": item.is_veg ? "Veg" : "Non-Veg",
            "Prep Time": item.prep_time ? `${item.prep_time} min` : "--",
            "Status": item.is_active ? "Active" : "Inactive",
        }));

        exportToExcel(formatted, "Menu-Items.xlsx");
        toast.success("Export completed");
    };

    const filteredAuditLogs = useMemo(() => {
        let rows = globalAuditLogs?.data ?? [];
        if (auditSearchQuery) {
            const query = auditSearchQuery.toLowerCase();
            rows = rows.filter((log: any) => {
                const searchFields = [
                    log.event_id?.toString() || "",
                    log.event_id ? formatModuleDisplayId("menu", log.event_id) : "",
                    log.event_type || "",
                    `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || "System"
                ];
                return searchFields.some((field) => field.toLowerCase().includes(query));
            });
        }
        return rows;
    }, [globalAuditLogs?.data, auditSearchQuery]);

    const exportAuditLogsSheet = () => {
        if (!filteredAuditLogs.length) {
            toast.info("No audit logs to export");
            return;
        }

        const formatted = filteredAuditLogs.map((log: any) => {
            const userName = `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || "System";
            return {
                "Menu ID": formatModuleDisplayId("menu", log.event_id),
                "Action": formatAuditActionText(log.event_type),
                "Change": getAuditChangeText(parseAuditDetails(log.details), log, true),
                "User": userName,
                "Date & Time": formatAppDateTime(log.created_on),
            };
        });

        exportToExcel(formatted, "MenuItemsAuditLogs.xlsx");
        toast.success("History exported successfully");
    };

    const resetHistoryFilters = () => {
        setAuditSearchInput("");
        setAuditSearchQuery("");
        setAuditActionFilter("");
        setAuditPage(1);
    };

    const refreshHistoryGrid = async () => {
        if (globalAuditFetching) return;
        const toastId = toast.loading("Refreshing data...");
        try {
            await refetchGlobalLogs();
            toast.dismiss(toastId);
            toast.success("Data refreshed");
        } catch {
            toast.dismiss(toastId);
            toast.error("Failed to refresh data");
        }
    };

    const openView = (item: MenuItem) => {
        setSelected(item);
        setSheetTab("summary");
        setIsDescExpanded(false);
        setMode("view");
    };

    const openEdit = (item: MenuItem) => {
        setSelected(item);
        setSheetTab("summary");
        setIsDescExpanded(false);
        setForm({
            item_name: item.item_name,
            menuItemGroupId: item.menu_item_group_id,
            price: item.price,
            is_active: item.is_active,
            is_veg: item.is_veg,
            prep_time: item.prep_time ?? "",
            image: null,
            description: item.description ?? "",
        });
        setMode("edit");
    };

    async function handleForm() {
        if (!selectedPropertyId) return;

        setSubmitted(true);

        const errors = validateMenuForm(form);
        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        try {
            if (mode === "add") {
                const payload = buildCreateMenuPayload(form, selectedPropertyId);

                await apiToast(
                    createMenuItem(payload).unwrap(),
                    "Menu item created successfully"
                )
            }

            if (mode === "edit" && selected) {
                const payload = buildUpdateMenuPayload(form);
                await apiToast(
                    updateMenuItem({ id: selected.id, payload }).unwrap(),
                    "Menu item updated successfully"
                )
            }

            setMode(null);
            setSelected(null);
            setSubmitted(false);
            setFormErrors({});
            setPage(1);
        } catch (err) {
            console.error("Menu save failed", err);
        }
    }

    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    return (
        <div className="flex flex-col bg-background">
            <section className="p-4 lg:p-6 space-y-4">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* LEFT SIDE */}
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold leading-tight">Menu Items</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage restaurant menu items
                        </p>
                    </div>


                    {/* RIGHT SIDE */}
                    <div className="flex items-center gap-3">

                        {(isSuperAdmin || isOwner) && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
                                    Property
                                </span>
                                <div className="flex-1 min-w-0 h-full">
                                    <MenuItemSelect
                                        value={selectedPropertyId ?? ""}
                                        items={myProperties?.properties?.map((p) => ({ id: p.id, label: p.brand_name })) || []}
                                        onSelect={(val) => setSelectedPropertyId(Number(val) || null)}
                                        itemName="label"
                                        placeholder="Select property"
                                        extraClasses="border-0 rounded-none h-full shadow-none focus-visible:ring-0 bg-transparent px-2"
                                    />
                                </div>
                            </div>
                        )}
                        <Button
                            variant="heroOutline"
                            onClick={() => setViewGroupOpen(true)}
                        >
                            View Groups
                        </Button>

                        <Button
                            variant="hero"
                            onClick={() => {
                                setGroupErrors({});
                                setCreateGroupOpen(true);
                            }}
                        >
                            Create Group
                        </Button>

                        {permission?.can_create && (
                            <Button
                                variant="hero"
                                onClick={() => {
                                    setForm({
                                        item_name: "",
                                        menuItemGroupId: "",
                                        price: "",
                                        is_active: true,
                                        is_veg: true,
                                        prep_time: "",
                                        image: null,
                                        description: "",
                                    });
                                    setBulkOpen(true)
                                }}
                            >
                                 <Plus className="h-4 w-4 mr-1" /> Add Menu Item
                            </Button>
                        )}

                    </div>

                </div>

                <div className="border-b border-border flex">
                    <button
                        onClick={() => setActiveTab("items")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            activeTab === "items"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Items
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={cn(
                            "px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]",
                            activeTab === "history"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        History
                    </button>
                </div>

                {activeTab === "items" && (
                <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                    <div className="w-full">
                        <GridToolbar className="border-b-0">
                            <GridToolbarRow className="gap-2">
                                <GridToolbarSearch
                                    value={searchInput}
                                    onChange={setSearchInput}
                                    onSearch={() => {
                                        setSearchQuery(searchInput.trim());
                                        setPage(1);
                                    }}
                                />

                                <GridToolbarSelect
                                    label="Group"
                                    value={groupFilter}
                                    onChange={(value) => {
                                        setGroupFilter(value);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        ...menuGroupOptions.map((group) => ({
                                            label: String(group),
                                            value: String(group),
                                        })),
                                    ]}
                                />

                                <GridToolbarSelect
                                    label="Type"
                                    value={typeFilter}
                                    onChange={(value) => {
                                        setTypeFilter(value);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Veg", value: "veg" },
                                        { label: "Non-Veg", value: "non-veg" },
                                    ]}
                                />

                                <GridToolbarActions
                                    className="gap-1 justify-end"
                                    actions={[
                                        {
                                            key: "export",
                                            label: "Export Menu Items",
                                            icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: exportMenuItems,
                                        },
                                        {
                                            key: "reset",
                                            label: "Reset Filters",
                                            icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: resetGridFilters,
                                        },
                                        {
                                            key: "refresh",
                                            label: "Refresh Data",
                                            icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                            onClick: handleRefresh,
                                            disabled: isFetching,
                                        },
                                    ]}
                                />
                            </GridToolbarRow>

                            <GridToolbarRow className="gap-2">
                                <GridToolbarSelect
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        setPage(1);
                                    }}
                                    options={[
                                        { label: "All", value: "" },
                                        { label: "Active", value: "active" },
                                        { label: "Inactive", value: "inactive" },
                                    ]}
                                />

                                <GridToolbarSpacer />
                                <GridToolbarSpacer />
                                <GridToolbarSpacer type="actions" />
                            </GridToolbarRow>
                        </GridToolbar>
                    </div>

                    <div className="px-2 pb-2">
                        <AppDataGrid
                            density="compact"
                            columns={[
                                {
                                    label: "Menu ID",
                                    headClassName: "text-center w-[120px]",
                                    cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                    render: (item: MenuItem) => (
                                        <button
                                            type="button"
                                            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                            onClick={() => openView(item)}
                                            aria-label={`Open summary for menu item ${formatModuleDisplayId("menu", item.menu_sequence || item.id)}`}
                                        >
                                            {formatModuleDisplayId("menu", item.menu_sequence || item.id)}
                                        </button>
                                    ),
                                },
                                {
                                    label: "Name",
                                    key: "item_name",
                                    cellClassName: "font-semibold text-foreground",
                                },
                                {
                                    label: "Group",
                                    render: (item: MenuItem) => item.menu_item_group || "—",
                                    cellClassName: "text-muted-foreground",
                                },
                                {
                                    label: "Price",
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-semibold whitespace-nowrap",
                                    render: (item: MenuItem) => `₹${item.price}`,
                                },
                                {
                                    label: "Type",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (item: MenuItem) => (
                                        <GridBadge status={item.is_veg ? "veg" : "non-veg"} statusType="menuType">
                                            {item.is_veg ? "Veg" : "Non-Veg"}
                                        </GridBadge>
                                    ),
                                },
                                {
                                    label: "Prep Time",
                                    headClassName: "text-center",
                                    cellClassName: "text-center text-muted-foreground whitespace-nowrap",
                                    render: (item: MenuItem) => item.prep_time ? `${item.prep_time} min` : "—",
                                },
                                {
                                    label: "Status",
                                    headClassName: "text-center",
                                    cellClassName: "text-center",
                                    render: (item: MenuItem) => (
                                        <GridBadge status={item.is_active ? "active" : "inactive"} statusType="toggle">
                                            {item.is_active ? "Active" : "Inactive"}
                                        </GridBadge>
                                    ),
                                },
                            ] as ColumnDef[]}
                            data={paginatedMenuItems}
                            loading={isLoading || isFetching || isInitializing}
                            emptyText="No menu items found"
                            minWidth="980px"
                            enablePagination
                            paginationProps={{
                                page,
                                totalPages,
                                setPage,
                                totalRecords,
                                limit,
                                onLimitChange: (value) => {
                                    setLimit(value);
                                    setPage(1);
                                },
                                disabled: isFetching,
                            }}
                            actionLabel=""
                            actionClassName="text-center w-[60px]"
                            showActions={permission?.can_create}
                            actions={(item: MenuItem) => (
                                <>
                                    {permission?.can_create && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    onClick={() => openEdit(item)}
                                                    aria-label={`View and edit details for menu item ${item.item_name}`}
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Update Item</TooltipContent>
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        />
                    </div>
                </div>
                )}

                {activeTab === "history" && (
                    <div className="grid-header border border-border rounded-[3px] overflow-x-auto bg-background flex flex-col min-h-0">
                        <div className="w-full">
                            <GridToolbar className="border-b-0">
                                <GridToolbarRow className="gap-2">
                                    <GridToolbarSearch
                                        value={auditSearchInput}
                                        onChange={(val) => {
                                            setAuditSearchInput(val);
                                            if (!val.trim()) setAuditSearchQuery("");
                                        }}
                                        onSearch={() => {
                                            setAuditSearchQuery(auditSearchInput.trim());
                                            setAuditPage(1);
                                        }}
                                    />
                                    <GridToolbarSelect
                                        label="Action"
                                        value={auditActionFilter}
                                        onChange={(val) => {
                                            setAuditActionFilter(val);
                                            setAuditPage(1);
                                        }}
                                        options={[
                                            { label: "All", value: "" },
                                            { label: "Create", value: "CREATE" },
                                            { label: "Update", value: "UPDATE" },
                                            { label: "Delete", value: "DELETE" },
                                        ]}
                                    />
                                    <GridToolbarActions
                                        className="gap-1 justify-end"
                                        actions={[
                                            {
                                                key: "export",
                                                label: "Export History",
                                                icon: <Download className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: exportAuditLogsSheet,
                                            },
                                            {
                                                key: "reset",
                                                label: "Reset Filters",
                                                icon: <FilterX className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: resetHistoryFilters,
                                            },
                                            {
                                                key: "refresh",
                                                label: "Refresh History",
                                                icon: <RefreshCcw className="w-4 h-4 text-foreground/80 hover:text-foreground" />,
                                                onClick: refreshHistoryGrid,
                                                disabled: globalAuditFetching,
                                            },
                                        ]}
                                    />
                                </GridToolbarRow>
                            </GridToolbar>
                        </div>
                        <div className="px-2 pb-2">
                            <AppDataGrid
                                density="compact"
                                columns={[
                                    {
                                        label: "Menu ID",
                                        headClassName: "text-center w-[120px]",
                                        cellClassName: "text-center font-medium text-primary min-w-[120px]",
                                        render: (log: any) => formatModuleDisplayId("menu", log.event_id)
                                    },
                                    { 
                                        label: "Action", 
                                        headClassName: "text-center w-[140px]",
            cellClassName: "text-center font-medium min-w-[140px]",
                                        render: (log: any) => getAuditActionBadge(log.event_type)
                                    },
                                    { 
                                        label: "Change", 
                                        headClassName: "w-[320px]",
            cellClassName: "min-w-[320px] whitespace-normal text-primary/80 font-medium",
                                        render: (log: any) => getAuditChangeText(parseAuditDetails(log.details), log) 
                                    },
                                    { 
                                        label: "User", 
                                        headClassName: "w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
                                        render: (log: any) => `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || "System"
                                    },
                                    { 
                                        label: "Date & Time", 
                                        headClassName: "text-white w-[180px]",
            cellClassName: "text-muted-foreground min-w-[180px]",
                                        render: (log: any) => formatAppDateTime(log.created_on) 
                                    }
                                ] as ColumnDef[]}
                                data={filteredAuditLogs}
                                loading={globalAuditLoading || globalAuditFetching}
                                emptyText="No history logs found"
                                minWidth="800px"
                                enablePagination
                                paginationProps={{
                                    page: auditPage,
                                    totalPages: globalAuditLogs?.pagination?.totalPages ?? 1,
                                    setPage: setAuditPage,
                                    totalRecords: globalAuditLogs?.pagination?.total ?? globalAuditLogs?.data?.length ?? 0,
                                    limit: auditLimit,
                                    onLimitChange: (v) => { setAuditLimit(v); setAuditPage(1); },
                                    disabled: globalAuditFetching,
                                }}
                            />
                        </div>
                    </div>
                )}
            </section>


            {/* VIEW / EDIT / ADD SHEET */}
            <Sheet open={!!mode} onOpenChange={() => setMode(null)}>
                <SheetContent side="right" className={cn("w-full overflow-y-auto bg-background transition-all duration-300", sheetTab === "history" ? "sm:max-w-4xl" : "lg:max-w-4xl sm:max-w-3xl")}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {mode === "add" ? "Create Menu Item" : mode === "edit" ? `Update Menu Item [${selected?.id ? `#${formatModuleDisplayId("menu", selected.menu_sequence || selected.id)}` : "..."}]` : `Menu Item [${selected?.id ? `#${formatModuleDisplayId("menu", selected.menu_sequence || selected.id)}` : "..."}]`}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                                    {mode === "add" ? "Setup your new food or beverage item" : mode === "edit" ? "Modify existing menu item details" : "Detailed summary of menu item configuration"}
                                </p>
                            </div>
                        </SheetHeader>

                        {/* Sheet Tabs */}
                        {mode === "view" && (
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
                        )}

                        {/* CONTENT BLOCKS */}
                        {mode === "view" && selected && (
                            <div className="space-y-3">
                                {sheetTab === "summary" && (
                                    <div className="space-y-3">
                                        <CardSectionView title="Item Details" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                                            <ViewField label="Name" value={selected.item_name} />
                                            <ViewField label="Menu Group" value={selected.menu_item_group || "General"} />
                                            <ViewField label="Dietary Type" value={selected.is_veg ? "Veg" : "Non-Veg"} />
                                            <ViewField label="Price" value={`₹ ${selected.price}`} />
                                            <ViewField label="Prep Time" value={selected.prep_time ? `${selected.prep_time} mins` : "—"} />
                                            <ViewField label="Status" value={selected.is_active ? "Active" : "Inactive"} />
                                        </CardSectionView>

                                        <CardSectionView title="Description & Media" titleClassName="text-sm font-semibold text-primary/90 border-b-0 pb-0 mb-4 tracking-normal" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            <ViewField
                                                label="Item Description"
                                                valueClassName="font-normal"
                                                value={
                                                    <div className="relative aspect-video rounded-lg bg-accent/30 border border-primary/50 overflow-hidden flex flex-col">
                                                        <div className={cn(
                                                            "flex-1 p-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap overflow-y-auto scrollbar-thin",
                                                            !isDescExpanded && selected.description && selected.description.length > 150 ? "line-clamp-4" : ""
                                                        )}>
                                                            {selected.description || "No description provided for this menu item."}
                                                        </div>
                                                        {selected.description && selected.description.length > 150 && (
                                                            <div className="px-3 pb-2 bg-gradient-to-t from-accent/30 to-transparent pt-4 -mt-4">
                                                                <button 
                                                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                                                    className="text-[10px] font-bold text-primary hover:underline tracking-wide"
                                                                >
                                                                    {isDescExpanded ? "Show Less" : "Show More"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                            />

                                            <ViewField
                                                label="Item Image"
                                                valueClassName="font-normal"
                                                value={
                                                    <div 
                                                        className="relative aspect-video rounded-lg overflow-hidden border border-primary/50 bg-accent/20 cursor-zoom-in group"
                                                        onClick={() => setIsImagePreviewOpen(true)}
                                                    >
                                                        <img
                                                            src={`${import.meta.env.VITE_API_URL}/menu/${selected.id}/image`}
                                                            alt={selected.item_name}
                                                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            onError={(e) => { e.currentTarget.src = "https://placehold.co/400x225?text=Preview+Unavailable"; }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <div className="bg-white/90 p-2 rounded-full shadow-lg">
                                                                <Plus className="w-5 h-5 text-primary" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </CardSectionView>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <div className="space-y-3">
                                        {!auditLogs?.data?.length ? (
                                            <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                                <p className="text-xs text-muted-foreground italic">No recent activity logs.</p>
                                            </div>
                                        ) : (
                                            <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                                                <AppDataGrid
                                                    columns={[

                                                        { 
                                                            label: "Action", 
                                                            render: (log: any) => getAuditActionBadge(log.event_type)
                                                        },
                                                        { 
                                                            label: "Updated By", 
                                                            headClassName: "text-center w-[140px]",
            cellClassName: "text-center font-medium min-w-[140px]",
                                                            render: (log: any) => `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || "System"
                                                        },
                                                        { 
                                                            label: "Date & Time", 
                                                            headClassName: "text-white w-[180px]", 
                                                            cellClassName: "text-muted-foreground min-w-[180px]",
                                                            render: (log: any) => formatAppDateTime(log.created_on) 
                                                        },
                                                        { 
                                                            label: "Changes", 
                                                            cellClassName: "text-[11px] font-medium text-foreground/80 break-words min-w-[300px] max-w-[350px]",
                                                            render: (log: any) => getAuditChangeText(parseAuditDetails(log.details), log) 
                                                        }
                                                    ] as ColumnDef[]}
                                                    data={auditLogs.data}
                                                    loading={isAuditLogsLoading || isAuditLogsFetching}
                                                    rowKey={(log: any) => log.id}
                                                    minWidth="600px"
                                                    enablePagination
                                                    paginationProps={{
                                                        page: itemAuditPage,
                                                        totalPages: auditLogs?.pagination?.totalPages ?? 1,
                                                        setPage: setItemAuditPage,
                                                        totalRecords: auditLogs?.pagination?.total ?? auditLogs?.data?.length ?? 0,
                                                        limit: itemAuditLimit,
                                                        onLimitChange: (v) => { setItemAuditLimit(v); setItemAuditPage(1); },
                                                        disabled: !auditLogs,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {(mode === "add" || mode === "edit") && (
                            <div className="space-y-5">
                                {(isSuperAdmin || isOwner) && mode === "add" && (
                                    <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-2 mb-4">
                                        <Label>Property</Label>
                                        <NativeSelect
                                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                            value={selectedPropertyId ?? ""}
                                            onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                        >
                                            <option value="" disabled>Select Property</option>
                                            {!myPropertiesLoading &&
                                                myProperties?.properties?.map((property) => (
                                                    <option key={property.id} value={property.id}>
                                                        {property.brand_name}
                                                    </option>
                                                ))}
                                        </NativeSelect>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Consolidated Basic Info & Pricing Card */}
                                    <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4">
                                        <h3 className="text-sm font-semibold text-primary/90">
                                            Basic Information & Pricing
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-foreground">Item Name *</Label>
                                                    <Input
                                                        placeholder="e.g. Chocolate Brownie"
                                                        className={cn("h-11 bg-background shadow-none", submitted && formErrors.item_name ? "border-red-500" : "border-border/60")}
                                                        value={form.item_name}
                                                        onChange={(e) => {
                                                            setForm({ ...form, item_name: e.target.value });
                                                            setFormErrors(prev => ({ ...prev, item_name: "" }));
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-foreground">Menu Group *</Label>
                                                    <NativeSelect
                                                        className={cn("h-11 bg-background shadow-none", submitted && formErrors.menuItemGroupId ? "border-red-500" : "border-border/60")}
                                                        value={form.menuItemGroupId}
                                                        onChange={(e) => setForm({ ...form, menuItemGroupId: e.target.value })}
                                                    >
                                                        <option value="">Select Group</option>
                                                        {menuItemGroups?.data?.map((g: any) => (
                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                        ))}
                                                    </NativeSelect>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-foreground">Price (₹) *</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className={cn("h-11 bg-background shadow-none", submitted && formErrors.price ? "border-red-500" : "border-border/60")}
                                                            value={form.price}
                                                            onChange={(e) => {
                                                                setForm({ ...form, price: normalizeNumberInput(e.target.value) });
                                                                setFormErrors(prev => ({ ...prev, price: "" }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-foreground">Prep Time (mins)</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g. 15"
                                                            className={cn("h-11 bg-background shadow-none", submitted && formErrors.prep_time ? "border-red-500" : "border-border/60")}
                                                            value={form.prep_time}
                                                            onChange={(e) => setForm({ ...form, prep_time: e.target.value === "" ? "" : Number(e.target.value) })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-[34px]">
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={form.is_active}
                                                            onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                                                        />
                                                        <Label className="text-sm font-semibold cursor-pointer">Active</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={form.is_veg}
                                                            onCheckedChange={(v) => setForm({ ...form, is_veg: v })}
                                                        />
                                                        <Label className="text-sm font-semibold cursor-pointer">Pure Veg</Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Consolidated Description & Media Card */}
                                    <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4">
                                        <h3 className="text-sm font-semibold text-primary/90">
                                            Description & Media
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                                            <div className="space-y-2">
                                                <Label className="text-foreground">Item Description</Label>
                                                <div className="relative">
                                                    <textarea
                                                        className="w-full min-h-[175px] rounded-lg border border-border/60 px-3 py-2 pb-8 text-sm bg-background focus:ring-1 focus:ring-primary outline-none transition-all resize-none shadow-none"
                                                        placeholder="Briefly describe the item's ingredients or preparation..."
                                                        maxLength={255}
                                                        value={form.description}
                                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                    />
                                                    <div className="absolute bottom-2 right-3 text-[10px] font-bold text-muted-foreground/40 tracking-widest pointer-events-none">
                                                        {form.description?.length || 0}/255
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-foreground">Item Image</Label>
                                                <div className="space-y-4">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        className="h-10 text-xs bg-background border-border/60 file:text-xs file:font-bold file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:mr-3 file:px-3 cursor-pointer"
                                                        onChange={(e) => setForm({ ...form, image: e.target.files?.[0] ?? null })}
                                                    />
                                                    <div className="h-[120px] rounded-lg border border-dashed border-primary/50 bg-accent/10 flex items-center justify-center">
                                                        {mode === "edit" && selected && !form.image ? (
                                                            <div className="relative h-24 w-40 rounded-lg overflow-hidden border border-primary/50 shadow-sm">
                                                                <img
                                                                    src={`${import.meta.env.VITE_API_URL}/menu/${selected.id}/image`}
                                                                    alt="Current"
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => { e.currentTarget.src = "https://placehold.co/150x150?text=No+Image"; }}
                                                                />
                                                            </div>
                                                        ) : form.image ? (
                                                            <div className="relative h-24 w-40 rounded-lg overflow-hidden border border-primary/20 shadow-sm ring-2 ring-primary/5">
                                                                <img
                                                                    src={URL.createObjectURL(form.image)}
                                                                    alt="Preview"
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="text-muted-foreground/30 flex flex-col items-center gap-2">
                                                                <Camera className="w-8 h-8 opacity-20" />
                                                                <span className="text-[10px] font-bold tracking-widest">No Image Preview</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button variant="heroOutline" onClick={() => setMode(null)}>
                                {mode === "view" ? "Close" : "Cancel"}
                            </Button>
                            {(mode === "add" || mode === "edit") && (
                                <Button variant="hero" onClick={handleForm}>
                                    {mode === "add" ? "Create Menu Item" : "Update"}
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

            {/* CREATE GROUP SHEET */}
            <Sheet open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 bg-background">
                    <SheetHeader className="px-6 py-4 border-b -mb-[2px] bg-background">
                        <SheetTitle className="text-xl font-bold">Create Menu Item Group</SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto bg-background">
                        <div className="px-6 pb-3 pt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="space-y-6">
                            {(isSuperAdmin || isOwner) && (
                                <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-2 mb-4">
                                    <Label>Property</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={selectedPropertyId ?? ""}
                                        onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                    >
                                        <option value="" disabled>Select Property</option>
                                        {!myPropertiesLoading &&
                                            myProperties?.properties?.map((property) => (
                                                <option key={property.id} value={property.id}>
                                                    {property.brand_name}
                                                </option>
                                            ))}
                                    </NativeSelect>
                                </div>
                            )}

                            <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6 [&>h3+*]:!mt-4">
                                <h3 className="text-sm font-semibold text-primary/90">
                                    Group Details
                                </h3>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Group Name *</Label>
                                    <Input
                                        className={cn("h-11 bg-background shadow-none", groupErrors.groupName ? "border-red-500" : "border-border/60")}
                                        value={groupName}
                                        placeholder="e.g. Starters"
                                        onChange={(e) => {
                                            setGroupName(e.target.value);
                                            if (e.target.value.trim()) {
                                                setGroupErrors(prev => {
                                                    const copy = { ...prev };
                                                    delete copy.groupName;
                                                    return copy;
                                                });
                                            }
                                        }}
                                    />
                                    {groupErrors.groupName && (
                                        <p className="text-[10px] text-red-500 font-bold mt-1">
                                            {groupErrors.groupName}
                                        </p>
                                    )}
                                </div>
                            </div>

                                </div>
                            </motion.div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3">
                            <Button variant="heroOutline" onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
                            <Button
                                variant="hero"
                                className="min-w-[140px]"
                                onClick={async () => {
                                    if (!selectedPropertyId) return;
                                    if (!groupName.trim()) {
                                        setGroupErrors({ groupName: "Group name is required" });
                                        return;
                                    }
                                    try {
                                        const payload = buildCreateGroupPayload(groupName, selectedPropertyId);
                                        await apiToast(
                                            createMenuItemGroup(payload).unwrap(),
                                            "Menu group created successfully"
                                        );
                                        setGroupName("");
                                        setCreateGroupOpen(false);
                                    } catch (err) {
                                        console.error("Group creation failed", err);
                                    }
                                }}
                            >
                                Create Group
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={viewGroupOpen} onOpenChange={setViewGroupOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 bg-background">
                    <SheetHeader className="px-6 py-4 border-b -mb-[2px] bg-background">
                        <SheetTitle className="text-xl font-bold">Menu Item Groups</SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto bg-background">
                        <div className="px-6 pb-3 pt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >

                        {(isSuperAdmin || isOwner) && (
                            <div className="w-full sm:w-64 space-y-1 sticky top-0 z-10 bg-background pb-2 mb-4">
                                <Label>Property</Label>
                                <NativeSelect
                                    className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                >
                                    <option value="" disabled>Select Property</option>
                                    {!myPropertiesLoading &&
                                        myProperties?.properties?.map((property) => (
                                            <option key={property.id} value={property.id}>
                                                {property.brand_name}
                                            </option>
                                        ))}
                                </NativeSelect>
                            </div>
                        )}

                    <div className="space-y-3">
                        {menuItemGroups && menuItemGroups?.data.map(group => {
                            const isEditing = editingGroupId === group.id;
                            return (
                                <div
                                    key={group.id}
                                    className="flex justify-between items-center border border-primary/50 rounded-[5px] px-4 py-3 bg-accent/5 transition-colors hover:bg-accent/10"
                                >
                                    {/* LEFT SIDE */}
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <div className="space-y-1">
                                                <Input
                                                    className={cn("h-9 text-xs shadow-none", groupErrors.editGroupName ? "border-red-500" : "border-border/60")}
                                                    value={editGroupName}
                                                    onChange={(e) => {
                                                        setEditGroupName(e.target.value);
                                                        if (e.target.value.trim()) {
                                                            setGroupErrors(prev => {
                                                                const copy = { ...prev };
                                                                delete copy.editGroupName;
                                                                return copy;
                                                            });
                                                        }
                                                    }}
                                                />
                                                {groupErrors.editGroupName && (
                                                    <p className="text-[10px] text-red-500 font-bold">
                                                        {groupErrors.editGroupName}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-sm text-foreground">
                                                    {group.name}
                                                </span>
                                                <GridBadge status={group.is_active ? "active" : "inactive"} statusType="toggle" className="h-6 text-[10px] font-bold">
                                                    {group.is_active ? "Active" : "Inactive"}
                                                </GridBadge>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT SIDE ACTIONS */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isEditing ? (
                                            <>
                                                <Switch
                                                    checked={
                                                        groupEditState[group.id]?.is_active ?? group.is_active
                                                    }
                                                    onCheckedChange={(val) =>
                                                        setGroupEditState(prev => ({
                                                            ...prev,
                                                            [group.id]: {
                                                                ...prev[group.id],
                                                                is_active: val
                                                            }
                                                        }))
                                                    }
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="hero"
                                                    className="h-8 text-xs px-3"
                                                    onClick={() => {
                                                        const errors: Record<string, string> = {};
                                                        if (!editGroupName.trim()) {
                                                            errors.editGroupName = "Group name required";
                                                        }
                                                        if (Object.keys(errors).length > 0) {
                                                            setGroupErrors(errors);
                                                            return;
                                                        }
                                                        setGroupErrors({});
                                                        const payload = {
                                                            id: group.id,
                                                            name: editGroupName,
                                                            is_active:
                                                                groupEditState[group.id]?.is_active ?? group.is_active
                                                        };
                                                        apiToast(
                                                            updateMenuItemGroup(payload).unwrap(),
                                                            "Menu item group updated successfully"
                                                        );
                                                        setEditingGroupId(null);
                                                    }}
                                                >
                                                    Update
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    className="h-8 text-xs px-3"
                                                    onClick={() => setEditingGroupId(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                className="h-8 text-xs px-3"
                                                onClick={() => {
                                                    setEditingGroupId(group.id);
                                                    setEditGroupName(group.name);
                                                }}
                                            >
                                                Edit Group
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                            </motion.div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3">
                            <Button variant="heroOutline" onClick={() => setViewGroupOpen(false)}>Close</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <MenuMasterBulkSheet
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                propertyId={Number(selectedPropertyId)}
                onPropertyChange={setSelectedPropertyId}
                menuGroups={menuGroupsLight || []}
                existingItems={menuLight || []}
                onSubmit={async (payload) => {
                    apiToast(
                        createMenuItemBulk(payload).unwrap(),
                        "Menu items created successfully"
                    );
                    setBulkOpen(false);
                }}
            />

            {/* Image Preview Dialog */}
            <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
                <DialogContent className="max-w-[90vw] lg:max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <DialogHeader className="hidden">
                        <DialogTitle>Item Image Preview</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20 backdrop-blur-md">
                        <img
                            src={selected ? `${import.meta.env.VITE_API_URL}/menu/${selected.id}/image` : ""}
                            alt={selected?.item_name}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/800x450?text=Preview+Unavailable"; }}
                        />
                        <div className="absolute top-4 left-4">
                            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                <p className="text-white text-xs font-bold tracking-widest">{selected?.item_name}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
