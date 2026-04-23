import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateMenuItemBulkMutation, useCreateMenuItemGroupMutation, useCreateMenuItemMutation, useGetMenuItemGroupsLightQuery, useGetMenuItemGroupsQuery, useGetPropertyMenuLightQuery, useGetPropertyMenuQuery, useUpdateMenuItemGroupMutation, useUpdateMenuItemMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeNumberInput } from "@/utils/normalizeTextInput";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { SheetContent, SheetHeader, SheetTitle, Sheet } from "@/components/ui/sheet";
import { apiToast } from "@/utils/apiToastPromise";
import { cn } from "@/lib/utils";
import MenuMasterBulkSheet from "@/components/MenuMasterBulkSheet";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FilterX, Plus, Pencil, RefreshCcw } from "lucide-react";
import { getStatusColor } from "@/constants/statusColors";
import { GridBadge } from "@/components/ui/grid-badge";
import { GridToolbar, GridToolbarActions, GridToolbarRow, GridToolbarSearch, GridToolbarSelect, GridToolbarSpacer } from "@/components/ui/grid-toolbar";
import { exportToExcel } from "@/utils/exportToExcel";
import { formatModuleDisplayId } from "@/utils/moduleDisplayId";
import { toast } from "react-toastify";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";

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

    if (form.image) {
        fd.append("image", form.image);
    }

    return fd;
}

export default function MenuMaster() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(5);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
    const [selected, setSelected] = useState<MenuItem | null>(null);

    const [form, setForm] = useState<MenuForm>({
        item_name: "",
        menuItemGroupId: "",
        price: "",
        is_active: true,
        is_veg: true,
        prep_time: "",
        image: null,
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
    const [bulkOpen, setBulkOpen] = useState(false)

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
    const isOwner = useAppSelector(selectIsOwner)

    const { 
        myProperties, 
        isMultiProperty, 
        isInitializing, 
        isLoading: myPropertiesLoading 
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data, isLoading, isFetching, refetch } = useGetPropertyMenuQuery({ page, limit, propertyId: selectedPropertyId }, {
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
            new Set((data?.data ?? []).map((item: MenuItem) => item.menu_item_group).filter(Boolean))
        );

        return groups.sort((a, b) => String(a).localeCompare(String(b)));
    }, [data?.data]);

    const filteredMenuItems = useMemo(() => {
        const rows = data?.data ?? [];
        const query = searchQuery.trim().toLowerCase();

        return rows.filter((item: MenuItem) =>
            (!query ||
                [
                    item.item_name,
                    item.menu_item_group,
                    item.price,
                    item.is_veg ? "veg" : "non-veg",
                    item.is_active ? "active" : "inactive",
                    item.prep_time ? `${item.prep_time}` : "",
                ].some((field) => String(field ?? "").toLowerCase().includes(query))) &&
            (!groupFilter || item.menu_item_group === groupFilter) &&
            (!typeFilter || (typeFilter === "veg" ? item.is_veg : !item.is_veg)) &&
            (!statusFilter || (statusFilter === "active" ? item.is_active : !item.is_active))
        );
    }, [data?.data, searchQuery, groupFilter, typeFilter, statusFilter]);

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
        setMode("view");
    };

    const openEdit = (item: MenuItem) => {
        setSelected(item);
        setForm({
            item_name: item.item_name,
            menuItemGroupId: item.menu_item_group_id,
            price: item.price,
            is_active: item.is_active,
            is_veg: item.is_veg,
            prep_time: item.prep_time ?? "",
            image: null,
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
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between w-full">

                    {/* LEFT SIDE */}
                    <div className="shrink-0">
                        <h1 className="text-2xl font-bold">Menu Items</h1>
                        <p className="text-sm text-muted-foreground">
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
                                    });
                                    // setMode("add");
                                    setBulkOpen(true)
                                }}
                            >
                                 <Plus className="h-4 w-4 mr-none"/>Add Menu Item
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
                            data={filteredMenuItems}
                            loading={isLoading || isFetching || isInitializing}
                            emptyText="No menu items found"
                            minWidth="980px"
                            enablePagination={!!data?.pagination}
                            paginationProps={{
                                page,
                                totalPages: data?.pagination?.totalPages ?? 1,
                                setPage,
                                totalRecords: data?.pagination?.totalItems ?? data?.pagination?.total ?? data?.data?.length ?? 0,
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
                                                    className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                                    onClick={() => openEdit(item)}
                                                    aria-label={`View and edit details for menu item ${item.item_name}`}
                                                >
                                                    <Pencil className="w-4 h-4 mx-auto" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View / Edit Details</TooltipContent>
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        />
                    </div>
                </div>
            </section>

            {/* VIEW / EDIT / ADD */}
            <Dialog open={!!mode} onOpenChange={() => setMode(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {mode === "view"
                                ? "View Menu Item"
                                : mode === "edit"
                                    ? "Edit Menu Item"
                                    : "Add Menu Item"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* VIEW MODE */}
                    {mode === "view" && selected && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">

                            {/* LEFT: DETAILS */}
                            <div className="space-y-3">
                                <div>
                                    <Label>Name</Label>
                                    <p className="font-medium">{selected.item_name}</p>
                                </div>

                                <div>
                                    <Label>Group</Label>
                                    <p>{selected.menu_item_group}</p>
                                </div>

                                <div>
                                    <Label>Price</Label>
                                    <p>₹{selected.price}</p>
                                </div>

                                <div>
                                    <Label>Type</Label>
                                    <p>{selected.is_veg ? "Veg" : "Non-Veg"}</p>
                                </div>

                                <div>
                                    <Label>Preparation Time</Label>
                                    <p>{selected.prep_time} minutes</p>
                                </div>
                            </div>

                            {/* RIGHT: IMAGE */}
                            <div className="flex justify-center items-start">
                                <img
                                    src={`${import.meta.env.VITE_API_URL}/menu/${selected.id}/image`}
                                    alt={selected.item_name}
                                    className="h-48 w-48 rounded-[3px] object-cover border"
                                    onError={(e) => {
                                        e.currentTarget.src =
                                            "https://placehold.co/200x200?text=No+Image";
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* EDIT / ADD MODE */}
                    {(mode === "edit" || mode === "add") && (
                        <div className="space-y-4">

                            {/* FORM GRID */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Name</Label>
                                    <Input
                                        className={submitted && formErrors.item_name ? "border-red-500" : ""}
                                        value={form.item_name}
                                        onChange={(e) => {
                                            setForm({ ...form, item_name: e.target.value });
                                            setFormErrors(p => ({ ...p, item_name: "" }));
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Group</Label>
                                    <NativeSelect
                                        className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                                        value={form.menuItemGroupId}
                                        onChange={(e) =>
                                            setForm({ ...form, menuItemGroupId: e.target.value })
                                        }
                                    >
                                        <option value="" disabled>-- Please Select --</option>
                                        {menuGroupsLight &&
                                            menuGroupsLight?.map((group) => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                    </NativeSelect>
                                </div>

                                <div>
                                    <Label>Price*</Label>
                                    <Input
                                        type="text"
                                        className={submitted && formErrors.price ? "border-red-500" : ""}
                                        value={form.price}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                price: normalizeNumberInput(e.target.value).toString(),
                                            });
                                            setFormErrors(p => ({ ...p, price: "" }));
                                        }}
                                    />

                                </div>

                                <div>
                                    <Label>Prep Time (min)</Label>
                                    <Input
                                        type="text"
                                        className={submitted && formErrors.prep_time ? "border-red-500" : ""}
                                        value={form.prep_time}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                prep_time: normalizeNumberInput(e.target.value),
                                            });
                                            setFormErrors(p => ({ ...p, prep_time: "" }));
                                        }}
                                    />

                                </div>
                            </div>

                            {/* SWITCHES */}
                            <div className="flex gap-6">
                                {mode === "edit" && <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(v) =>
                                            setForm({ ...form, is_active: v })
                                        }
                                    />
                                    <Label>Active</Label>
                                </div>}

                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={form.is_veg}
                                        onCheckedChange={(v) =>
                                            setForm({ ...form, is_veg: v })
                                        }
                                    />
                                    <Label>Veg</Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                                {/* LEFT: IMAGE INPUT */}
                                <div className="space-y-2">
                                    <Label>Image</Label>

                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                image: e.target.files?.[0] ?? null,
                                            })
                                        }
                                    />
                                </div>

                                {/* RIGHT: IMAGE PREVIEW */}
                                <div className="flex justify-center">
                                    {/* Existing image (edit mode, no new image selected) */}
                                    {mode === "edit" && selected && !form.image && (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/menu/${selected.id}/image`}
                                            alt="Current"
                                            className="h-40 w-40 rounded-[3px] object-cover border"
                                            onError={(e) => {
                                                e.currentTarget.src =
                                                    "https://placehold.co/160x160?text=No+Image";
                                            }}
                                        />
                                    )}

                                    {/* New image preview */}
                                    {form.image && (
                                        <img
                                            src={URL.createObjectURL(form.image)}
                                            alt="Preview"
                                            className="h-40 w-40 rounded-[3px] object-cover border"
                                        />
                                    )}
                                </div>
                            </div>

                            {mode === "view" ? (
                                <Button
                                    variant="heroOutline"
                                    className="w-full"
                                    onClick={() => setMode(null)}
                                >
                                    Close
                                </Button>
                            ) : (
                                <Button
                                    variant="hero"
                                    className="w-full"
                                    onClick={handleForm}
                                >
                                    {mode === "add" ? "Create Item" : "Save Changes"}
                                </Button>
                            )}
                        </div>

                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogContent className="sm:max-w-md">

                    <DialogHeader>
                        <DialogTitle>Create Menu Group</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">

                        <div>
                            <Label>Group Name*</Label>

                            <Input
                                className={groupErrors.groupName ? "border-red-500" : ""}
                                value={groupName}
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
                                <p className="text-xs text-red-500 mt-1">
                                    {groupErrors.groupName}
                                </p>
                            )}
                        </div>

                        <Button
                            variant="hero"
                            className="w-full"
                            onClick={() => {

                                const errors: Record<string, string> = {};

                                if (!groupName.trim()) {
                                    errors.groupName = "Group name is required";
                                }

                                if (Object.keys(errors).length > 0) {
                                    setGroupErrors(errors);
                                    return;
                                }

                                setGroupErrors({});

                                const payload = buildCreateGroupPayload(
                                    groupName,
                                    selectedPropertyId
                                );

                                apiToast(
                                    createMenuItemGroup(payload).unwrap(),
                                    "Menu item group created successfully"
                                );

                                setGroupName("");
                                setCreateGroupOpen(false);
                            }}
                        >
                            Create Group
                        </Button>

                    </div>

                </DialogContent>
            </Dialog>

            <Sheet open={viewGroupOpen} onOpenChange={setViewGroupOpen}>
                <SheetContent side="right" className="w-full sm:max-w-lg">

                    <SheetHeader>
                        <SheetTitle>Menu Item Groups</SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-2">

                        {menuItemGroups && menuItemGroups?.data.map(group => {

                            const isEditing = editingGroupId === group.id;

                            return (
                                <div
                                    key={group.id}
                                    className="flex justify-between items-center border rounded-[4px] px-4 py-3 bg-card"
                                >

                                    {/* LEFT SIDE */}
                                    {isEditing ? (
                                        <>
                                            <Input
                                                className={groupErrors.editGroupName ? "border-red-500" : ""}
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
                                                <p className="text-xs text-red-500 mt-1">
                                                    {groupErrors.editGroupName}
                                                </p>
                                            )}</>


                                    ) : (

                                        <div className="flex items-center gap-2">

                                            <span className="font-medium">
                                                {group.name}
                                            </span>

                                            <span
                                                className={cn(
                                                    "text-xs px-2 py-0.5 rounded font-medium",
                                                    getStatusColor(group.is_active ? "active" : "inactive", "toggle")
                                                )}
                                            >
                                                {group.is_active ? "Active" : "Inactive"}
                                            </span>

                                        </div>


                                    )}

                                    {/* RIGHT SIDE ACTIONS */}
                                    <div className="flex items-center gap-2">

                                        {isEditing ? (
                                            <>
                                                <Switch
                                                    className="mx-1"
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
                                                    className="ms-2"
                                                    variant="hero"
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
                                                    Save
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    onClick={() => {
                                                        setEditingGroupId(null);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={() => {
                                                    setEditingGroupId(group.id);
                                                    setEditGroupName(group.name);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        )}

                                    </div>

                                </div>
                            );
                        })}

                    </div>

                </SheetContent>
            </Sheet>

            <MenuMasterBulkSheet
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                propertyId={selectedPropertyId!}
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


        </div >
    );
}

