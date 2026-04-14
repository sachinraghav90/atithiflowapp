import { useEffect, useState } from "react";
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
import { useCreateInventoryMasterMutation, useGetInventoryQuery, useGetInventoryTypesQuery, useUpdateInventoryMasterMutation } from "@/redux/services/hmsApi";
import { useAutoPropertySelect } from "@/hooks/useAutoPropertySelect";
import { useAppSelector } from "@/redux/hook";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { usePermission } from "@/rbac/usePermission";
import { AppDataGrid, type ColumnDef } from "@/components/ui/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil } from "lucide-react";

type InventoryItem = {
    id: string;
    property_id: string;
    inventory_type_id: number;
    inventory_type?: string;
    use_type: string;
    name: string;
    is_active: boolean;
    created_on: string;
};

type InventoryForm = {
    inventory_type_id: number | null;
    use_type: string;
    name: string;
    is_active: boolean;
};

function buildCreateInventoryPayload(form: InventoryForm, propertyId: number) {
    return {
        property_id: propertyId,
        inventory_type_id: form.inventory_type_id,
        use_type: form.use_type,
        name: form.name,
    };
}

function buildUpdateInventoryPayload(form: Partial<InventoryForm>) {
    return {
        ...(form.inventory_type_id && { inventory_type_id: form.inventory_type_id }),
        ...(form.use_type && { use_type: form.use_type }),
        ...(form.name && { name: form.name }),
        is_active: form.is_active,
    };
}

export default function InventoryMaster() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [mode, setMode] = useState<"view" | "edit" | "add" | null>(null);
    const [selected, setSelected] = useState<InventoryItem | null>(null);

    const [form, setForm] = useState<InventoryForm>({
        inventory_type_id: null,
        use_type: "fix",
        name: "",
        is_active: true,
    });

    const [submitted, setSubmitted] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [selectedPropertyId, setSelectedPropertyId] = useState("")

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)
    const {
        myProperties,
        isMultiProperty,
        isSuperAdmin,
        isOwner,
        isLoading: myPropertiesLoading
    } = useAutoPropertySelect(selectedPropertyId, setSelectedPropertyId);

    const { data: inventoryTypes } = useGetInventoryTypesQuery(undefined, {
        skip: !isLoggedIn
    })

    const {
        data: inventoryMaster,
        isLoading: inventoryLoading,
        isFetching: inventoryFetching
    } = useGetInventoryQuery({ propertyId: selectedPropertyId, page, limit }, {
        skip: !isLoggedIn || !selectedPropertyId
    })

    const [createInventoryMaster] = useCreateInventoryMasterMutation()
    const [updateInventoryMaster] = useUpdateInventoryMasterMutation()

    // Hook handles all initialization logic now


    function validate(form: InventoryForm) {
        const errors: Record<string, string> = {};

        if (!form.inventory_type_id)
            errors.inventory_type_id = "Required";

        if (!form.name.trim())
            errors.name = "Name required";

        if (!form.use_type.trim())
            errors.use_type = "Use type required";

        return errors;
    }

    function handleForm() {

        setSubmitted(true);

        const errors = validate(form);
        setFormErrors(errors);

        if (Object.keys(errors).length) return;

        if (mode === "add") {
            const payload = buildCreateInventoryPayload(form, +selectedPropertyId);
            const promise = createInventoryMaster(payload).unwrap()
            toast.promise(promise, {
                error: "Error creating inventory",
                pending: "Creating please wait",
                success: "Created successfully"
            })
        }

        if (mode === "edit" && selected) {
            const payload = buildUpdateInventoryPayload(form);
            const promise = updateInventoryMaster({ body: payload, id: selected.id }).unwrap()
            toast.promise(promise, {
                error: "Error updating inventory",
                pending: "Updating please wait",
                success: "Updated successfully"
            })
        }

        setMode(null);
    }

    const openView = (item: InventoryItem) => {
        setSelected(item);
        setMode("view");
    };

    const openEdit = (item: InventoryItem) => {
        setSelected(item);

        setForm({
            inventory_type_id: item.inventory_type_id,
            use_type: item.use_type,
            name: item.name,
            is_active: item.is_active,
        });

        setMode("edit");
    };


    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    const inventoryRows = inventoryMaster?.data ?? [];
    const totalPages = inventoryMaster?.pagination?.totalPages ?? 1;

    useEffect(() => {
        setPage(1);
    }, [selectedPropertyId]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <section className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Inventory Master</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage inventory items
                    </p>
                </div>

                {(isSuperAdmin || isOwner) && (
                    <div className="w-64 flex flex-col justify-end">
                        <Label className="text-[11px] text-muted-foreground mb-1">
                            Property
                        </Label>
                        <NativeSelect
                            className="w-full h-10 rounded-[3px] border border-border bg-background px-3 text-sm"
                            value={selectedPropertyId ?? ""}
                            onChange={(e) => {
                                setSelectedPropertyId((e.target.value) || null)
                            }}
                            disabled={!(isSuperAdmin || isOwner)}
                        >
                            <option value="">All properties</option>
                            {!myPropertiesLoading &&
                                myProperties?.properties?.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.brand_name}
                                    </option>
                                ))}
                        </NativeSelect>
                    </div>
                )}

                {permission?.can_create && <Button
                    variant="hero"
                    onClick={() => {
                        setForm({
                            inventory_type_id: null,
                            use_type: "fix",
                            name: "",
                            is_active: true,
                        });
                        setMode("add");
                    }}
                >
                    Add Inventory
                </Button>}
            </div>

            <div className="grid-header border rounded-[5px] overflow-hidden px-4 py-2 bg-muted/20 flex flex-col min-h-0">

                <AppDataGrid
                    columns={[
                        {
                            label: "Name",
                            key: "name",
                            cellClassName: "font-medium",
                        },
                        {
                            label: "Inventory Type",
                            key: "inventory_type",
                            cellClassName: "text-muted-foreground",
                        },
                        {
                            label: "Use Type",
                            key: "use_type",
                            cellClassName: "capitalize",
                        },
                        {
                            label: "Created",
                            render: (item: InventoryItem) => (
                                <span className="text-muted-foreground">
                                    {new Date(item.created_on).toLocaleDateString()}
                                </span>
                            ),
                        },
                    ] as ColumnDef[]}
                    data={inventoryRows}
                    loading={inventoryLoading}
                    emptyText="No inventory items found"
                    minWidth="600px"
                    enablePagination
                    paginationProps={{
                        page,
                        totalPages,
                        setPage,
                        totalRecords: inventoryMaster?.pagination?.total ?? inventoryRows.length,
                        limit,
                        onLimitChange: (value) => {
                            setLimit(value);
                            setPage(1);
                        },
                        disabled: inventoryLoading || inventoryFetching,
                    }}
                    actionLabel=""
                    actionClassName="text-center w-[72px]"
                    actions={
                        permission?.can_create
                            ? (item: InventoryItem) => (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 bg-primary hover:bg-primary/80 text-white transition-all focus-visible:ring-2 rounded-[3px] shadow-md"
                                            onClick={() => openEdit(item)}
                                            aria-label={`View and edit details for inventory ${item.name}`}
                                        >
                                            <Pencil className="w-4 h-4 mx-auto" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View / Edit Details</TooltipContent>
                                </Tooltip>
                            )
                            : undefined
                    }
                />


                {/* MODAL */}
                <Dialog open={!!mode} onOpenChange={() => setMode(null)}>
                    <DialogContent className="max-w-xl">

                        <DialogHeader>
                            <DialogTitle>
                                {mode === "view" ? "View Inventory" :
                                    mode === "edit" ? "Edit Inventory" :
                                        "Add Inventory"}
                            </DialogTitle>
                        </DialogHeader>

                        {mode === "view" && selected && (

                            <div className="space-y-4 text-sm">

                                <div>
                                    <Label>Name</Label>
                                    <p className="font-medium">{selected.name}</p>
                                </div>

                                <div>
                                    <Label>Inventory Type</Label>
                                    <p>{selected.inventory_type}</p>
                                </div>

                                <div>
                                    <Label>Use Type</Label>
                                    <p className="capitalize">{selected.use_type}</p>
                                </div>

                            </div>

                        )}


                        {(mode === "edit" || mode === "add") && (

                            <div className="space-y-4">

                                <div className="grid grid-cols-2 gap-4">

                                    {/* TYPE */}
                                    <div>
                                        <Label htmlFor="inventory-type">Inventory Type*</Label>
                                        <NativeSelect
                                            id="inventory-type"
                                            name="inventory_type_id"
                                            className={submitted && formErrors.inventory_type_id ? "w-full h-10 border rounded px-3 border-red-500" : "w-full h-10 border rounded px-3"}
                                            value={form.inventory_type_id ?? ""}
                                            onChange={(e) => {
                                                setForm({ ...form, inventory_type_id: Number(e.target.value) })
                                                setFormErrors(e => ({ ...e, inventory_type_id: "" }))
                                            }}
                                        >
                                            <option value="">-- Please Select --</option>
                                            {inventoryTypes.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.type}
                                                </option>
                                            ))}
                                        </NativeSelect>
                                    </div>

                                    {/* USE TYPE */}
                                    <div>
                                        <Label htmlFor="inventory-use-type">Use Type*</Label>
                                        <NativeSelect
                                            id="inventory-use-type"
                                            name="inventory_use_type"
                                            className={submitted && formErrors.use_type ? "w-full h-10 border rounded px-3 border-red-500" : "w-full h-10 border rounded px-3"}
                                            value={form.use_type ?? ""}
                                            onChange={(e) => {
                                                setForm({ ...form, use_type: e.target.value })
                                                setFormErrors(e => ({ ...e, use_type: "" }))
                                            }}
                                        >
                                            <option value="fix">Fix</option>
                                            <option value="usable">Usable</option>
                                        </NativeSelect>
                                    </div>

                                    {/* NAME */}
                                    <div className="col-span-2">
                                        <Label htmlFor="inventory-name">Name*</Label>
                                        <Input
                                            id="inventory-name"
                                            name="inventory_name"
                                            value={form.name}
                                            className={submitted && formErrors.name ? "border-red-500" : ""}
                                            onChange={(e) => {
                                                setForm({ ...form, name: normalizeTextInput(e.target.value) })
                                                setFormErrors(e => ({ ...e, name: "" }))
                                            }}
                                        />
                                    </div>
                                    {<div className="flex items-center gap-2">
                                        <Switch
                                            checked={form?.is_active}
                                            onCheckedChange={(v) =>
                                                setForm({ ...form, is_active: v })
                                            }
                                        />
                                        <Label>Active</Label>
                                    </div>}
                                </div>

                                <Button
                                    variant="hero"
                                    className="w-full"
                                    onClick={handleForm}
                                >
                                    {mode === "add" ? "Create Inventory" : "Save Changes"}
                                </Button>

                            </div>

                        )}

                    </DialogContent>
                </Dialog>
            </div>
            </section>
        </div >
    );
}

