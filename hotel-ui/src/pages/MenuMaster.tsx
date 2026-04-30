import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateMenuItemBulkMutation, useCreateMenuItemGroupMutation, useCreateMenuItemMutation, useGetMenuItemGroupsLightQuery, useGetMenuItemGroupsQuery, useGetPropertyMenuLightQuery, useGetPropertyMenuQuery, useUpdateMenuItemGroupMutation, useUpdateMenuItemMutation } from "@/redux/services/hmsApi";
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
import { toast } from "react-toastify";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import PropertyViewSection from "@/components/PropertyViewSection";
import ViewField from "@/components/ViewField";

type MenuItem = {
    id: string;
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
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { 
        myProperties, 
        isInitializing, 
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: menuData, isLoading, isFetching, refetch } = useGetPropertyMenuQuery({ page: 1, limit: 1000, propertyId: selectedPropertyId }, {
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
        const groups = Array.from(
            new Set((menuData?.data ?? []).map((item: MenuItem) => item.menu_item_group).filter(Boolean))
        );

        return groups.sort((a, b) => String(a).localeCompare(String(b)));
    }, [menuData?.data]);

    const menuRows = useMemo(() => menuData?.data ?? [], [menuData?.data]);
    
    const cleanSearchQuery = useMemo(() => {
        if (!searchQuery) return "";
        const groupLabels = menuGroupOptions.map(g => String(g).toLowerCase());
        const typeLabels = ["veg", "non-veg"];
        const statusLabels = ["active", "inactive"];
        const filterKeywords = [...groupLabels, ...typeLabels, ...statusLabels];

        return filterKeywords
            .sort((left, right) => right.length - left.length)
            .reduce((query, keyword) => {
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return query.replace(new RegExp(`\\b${escapedKeyword}\\b`, "gi"), " ");
            }, searchQuery)
            .replace(/\s+/g, " ")
            .trim();
    }, [searchQuery, menuGroupOptions]);

    const filteredMenuItems = useMemo(() => {
        const rows = menuRows;
        const query = cleanSearchQuery.toLowerCase();

        return rows.filter((item: MenuItem) => {
            const matchesSearch = !query || [
                item.item_name,
                item.description || "",
                formatModuleDisplayId("menu", item.id)
            ].some(field => String(field).toLowerCase().includes(query));

            const matchesGroup = !groupFilter || item.menu_item_group === groupFilter;
            const matchesType = !typeFilter || (typeFilter === "veg" ? item.is_veg : !item.is_veg);
            const matchesStatus = !statusFilter || (statusFilter === "active" ? item.is_active : !item.is_active);

            return matchesSearch && matchesGroup && matchesType && matchesStatus;
        });
    }, [menuRows, cleanSearchQuery, groupFilter, typeFilter, statusFilter]);

    const totalRecords = filteredMenuItems.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const paginatedMenuItems = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredMenuItems.slice(start, start + limit);
    }, [filteredMenuItems, page, limit]);

    useEffect(() => {
        if (page > totalPages) {
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
            toast.error("Failed to refresh");
        }
    };

    const exportMenuItems = () => {
        if (!filteredMenuItems.length) {
            toast.info("No menu items to export");
            return;
        }

        const formatted = filteredMenuItems.map((item: MenuItem) => ({
            "Menu ID": formatModuleDisplayId("menu", item.id),
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
            <section className="p-6 lg:p-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between w-full">

                    {/* LEFT SIDE */}
                    <div className="shrink-0">
                        <h1 className="text-2xl font-bold">Menu Items</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage restaurant menu items
                        </p>
                    </div>


                    {/* RIGHT SIDE */}
                    <div className="flex flex-wrap items-center gap-2">

                        {(isSuperAdmin || isOwner) && (
                            <div className="flex items-center h-10 border border-border bg-background rounded-[3px] text-sm overflow-hidden shadow-sm min-w-[240px]">
                                <span className="px-3 bg-muted/50 text-muted-foreground whitespace-nowrap text-xs font-semibold h-full flex items-center border-r border-border uppercase">
                                    Property
                                </span>
                                <NativeSelect
                                    className="flex-1 bg-transparent px-2 focus:outline-none focus:ring-0 text-sm h-full truncate cursor-pointer"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) =>
                                        setSelectedPropertyId(Number(e.target.value) || null)
                                    }
                                >
                                    <option value="" disabled>Select property</option>
                                    {!myPropertiesLoading &&
                                        myProperties?.properties?.map((property) => (
                                            <option key={property.id} value={property.id}>
                                                {property.brand_name}
                                            </option>
                                        ))}
                                </NativeSelect>
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


                <div className="grid-header border border-border rounded-lg overflow-x-auto bg-background flex flex-col min-h-0 shadow-sm">
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
                                    headClassName: "text-center",
                                    cellClassName: "text-center font-medium min-w-[90px]",
                                    render: (item: MenuItem) => (
                                        <button
                                            type="button"
                                            className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                                            onClick={() => openView(item)}
                                            aria-label={`Open summary for menu item ${formatModuleDisplayId("menu", item.id)}`}
                                        >
                                            {formatModuleDisplayId("menu", item.id)}
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
            </section>


            {/* VIEW / EDIT / ADD SHEET */}
            <Sheet open={!!mode} onOpenChange={() => setMode(null)}>
                <SheetContent side="right" className="w-full lg:max-w-3xl sm:max-w-2xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader className="mb-6">
                            <div className="space-y-1">
                                <SheetTitle className="text-xl font-bold">
                                    {mode === "add" ? "Create Menu Item" : mode === "edit" ? `Update Menu Item [${selected?.id ? `#${formatModuleDisplayId("menu", selected.id)}` : "..."}]` : `Menu Item [${selected?.id ? `#${formatModuleDisplayId("menu", selected.id)}` : "..."}]`}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground font-medium tracking-wider">
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
                                        "px-4 py-2 text-[11px] font-bold tracking-wide transition-all border-b-2 -mb-[2px]",
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
                                        <PropertyViewSection title="Item Details" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                                            <ViewField label="Name" value={selected.item_name} />
                                            <ViewField label="Menu Group" value={selected.menu_item_group || "General"} />
                                            <ViewField label="Dietary Type" value={selected.is_veg ? "Veg" : "Non-Veg"} />
                                            <ViewField label="Price" value={`₹ ${selected.price}`} />
                                            <ViewField label="Prep Time" value={selected.prep_time ? `${selected.prep_time} mins` : "—"} />
                                            <ViewField label="Status" value={selected.is_active ? "Active" : "Inactive"} />
                                        </PropertyViewSection>

                                        <PropertyViewSection title="Description & Media" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground tracking-wide">Item Description</Label>
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
                                                                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                                                            >
                                                                {isDescExpanded ? "Show Less" : "Show More"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground tracking-wide">Item Image</Label>
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
                                            </div>
                                        </PropertyViewSection>
                                    </div>
                                )}

                                {sheetTab === "history" && (
                                    <div className="p-8 text-center rounded-lg border border-dashed border-border bg-muted/20">
                                        <p className="text-sm text-muted-foreground">No history logs available yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {(mode === "add" || mode === "edit") && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                                    {/* Basic Info Card */}
                                    <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3">
                                            Basic Information
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-muted-foreground tracking-wide">Item Name *</Label>
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
                                                <Label className="text-xs font-bold text-muted-foreground tracking-wide">Menu Group *</Label>
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
                                    </div>

                                    {/* Pricing Card */}
                                    <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3">
                                            Pricing & Status
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-muted-foreground tracking-wide">Price (₹) *</Label>
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
                                                    <Label className="text-xs font-bold text-muted-foreground tracking-wide">Prep Time (mins)</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 15"
                                                        className={cn("h-11 bg-background shadow-none", submitted && formErrors.prep_time ? "border-red-500" : "border-border/60")}
                                                        value={form.prep_time}
                                                        onChange={(e) => setForm({ ...form, prep_time: e.target.value === "" ? "" : Number(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8 pt-2">
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

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3">
                                    {/* Description Card */}
                                    <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3">
                                            Item Description
                                        </h3>
                                        <div className="space-y-2">
                                            <textarea
                                                className="w-full min-h-[140px] rounded-lg border border-border/60 px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary outline-none transition-all resize-none shadow-none"
                                                placeholder="Briefly describe the item's ingredients or preparation..."
                                                maxLength={255}
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            />
                                            <div className="text-[10px] font-bold text-muted-foreground/60 text-right">
                                                {form.description?.length || 0}/255
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Card */}
                                    <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-semibold text-primary/90 tracking-wider border-b border-primary/50 pb-2 mb-3">
                                            Item Image
                                        </h3>
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
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">No Image Preview</span>
                                                    </div>
                                                )}
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
                <SheetContent side="right" className="w-full lg:max-w-3xl sm:max-w-2xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader className="border-b border-border/50 pb-4 mb-4">
                            <SheetTitle className="text-xl font-bold">Create Menu Item Group</SheetTitle>
                        </SheetHeader>

                        <div className="space-y-6">
                            <div className="rounded-[5px] border border-primary/50 bg-background p-4 shadow-sm space-y-6">
                                <h3 className="text-[11px] font-semibold text-primary/90 uppercase tracking-[0.16em] border-b border-primary/50 pb-2 mb-3">
                                    Group Details
                                </h3>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Group Name *</Label>
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

                            <div className="flex justify-end gap-3">
                                <Button variant="heroOutline" onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
                                <Button
                                    variant="hero"
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
                    </motion.div>
                </SheetContent>
            </Sheet>

            <Sheet open={viewGroupOpen} onOpenChange={setViewGroupOpen}>
                <SheetContent side="right" className="w-full lg:max-w-3xl sm:max-w-2xl overflow-y-auto bg-background">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <SheetHeader className="border-b border-border/50 pb-4 mb-4">
                            <SheetTitle className="text-xl font-bold">Menu Item Groups</SheetTitle>
                        </SheetHeader>

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

                    <div className="flex justify-end pt-4 border-t border-border">
                        <Button variant="heroOutline" onClick={() => setViewGroupOpen(false)}>Close</Button>
                    </div>
                    </motion.div>
                </SheetContent>
            </Sheet>

            <MenuMasterBulkSheet
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                propertyId={Number(selectedPropertyId)}
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
                                <p className="text-white text-xs font-bold uppercase tracking-widest">{selected?.item_name}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
