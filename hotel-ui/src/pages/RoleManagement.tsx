import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    DialogTrigger,
} from "@/components/ui/sheet";
import { Pencil, Plus } from "lucide-react";
import { useCreateRoleMutation, useGetSidebarPermissionQuery, useLazyGetAllRolesQuery, useLazyGetAllSidebarLinksQuery, usePostRoleSidebarLinkMutation, useUpdateRoleNameMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { toast } from "react-toastify";
import { selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { usePermission } from "@/rbac/usePermission";
import { useLocation } from "react-router-dom";
import { apiToast } from "@/utils/apiToastPromise";

const PERMISSION_ACTIONS = [
    { key: "read", label: "read", field: "can_read" },
    { key: "create", label: "write", field: "can_create" },
    { key: "delete", label: "delete", field: "can_delete" },
] as const;

type SidebarPermissionPayload = {
    roleId: string;
    permissions: {
        [sidebarLinkId: string]: {
            can_read: boolean;
            can_create: boolean;
            can_update: boolean;
            can_delete: boolean;
        };
    };
};

function buildPermissionState(action: "deny" | "read" | "write" | "delete") {
    if (action === "deny") {
        return {
            can_read: false,
            can_create: false,
            can_update: false,
            can_delete: false,
        };
    }

    if (action === "read") {
        return {
            can_read: true,
            can_create: false,
            can_update: false,
            can_delete: false,
        };
    }

    if (action === "write") {
        return {
            can_read: true,
            can_create: true,
            can_update: true,
            can_delete: false,
        };
    }

    if (action === "delete") {
        return {
            can_read: true,
            can_create: true,
            can_update: true,
            can_delete: true,
        };
    }

    return {
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
    };
}

function getPermissionLabel(action: any) {
    switch (action) {
        case "read":
            return "Viewer";
        case "write":
            return "Editor";
        case "delete":
            return "Administrator";
        default:
            return action;
    }
}

export default function RoleManagement() {
    const [newRoleName, setNewRoleName] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [selectedRoleName, setSelectedRoleName] = useState("")
    const [sidebarPermissionPayload, setSidebarPermissionPayload] =
        useState<SidebarPermissionPayload>({
            roleId: "",
            permissions: {}
        });
    const [originalPermissions, setOriginalPermissions] = useState<Record<number, any>>({});
    const [newRolePermissions, setNewRolePermissions] = useState<
        Record<number, {
            can_read: boolean;
            can_create: boolean;
            can_update: boolean;
            can_delete: boolean;
        }>
    >({});
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [isEditingRoleName, setIsEditingRoleName] = useState(false);
    const [editedRoleName, setEditedRoleName] = useState("");

    const [getALlRoles, { data: allRolesData, isLoading: allRolesLoading, isUninitialized: allRolesUninitialized, isError: allRolesError }] = useLazyGetAllRolesQuery()
    const [getAllSidebarLinks, { data: allSidebarLinksData, isLoading: allSidebarLinksLoading, isUninitialized: allSidebarLinksUninitialized, isError: allSidebarLinksError }] = useLazyGetAllSidebarLinksQuery()
    const [updateRole] = useUpdateRoleNameMutation()

    const {
        data: sidebarPermissionData,
    } = useGetSidebarPermissionQuery(
        selectedRoleId,
        { skip: !selectedRoleId }
    );

    const [postRoleSidebarLink] = usePostRoleSidebarLinkMutation()

    const [createRole] = useCreateRoleMutation()

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

    const isSuperAdmin = useAppSelector(selectIsSuperAdmin)

    useEffect(() => {
        if (!isLoggedIn) return
        getALlRoles("allRoles")
        getAllSidebarLinks("allSidebarLinks")
    }, [isLoggedIn])

    useEffect(() => {
        if (!allSidebarLinksData?.roles) return;

        const initial: Record<number, any> = {};

        allSidebarLinksData.roles.forEach((m) => {
            initial[m.id] = {
                can_read: false,
                can_create: false,
                can_update: false,
                can_delete: false,
            };
        });

        setNewRolePermissions(initial);
    }, [allSidebarLinksData]);

    function onNewRolePermissionChange(
        moduleId: number,
        field: "can_read" | "can_create" | "can_update" | "can_delete",
        checked: boolean
    ) {
        setNewRolePermissions(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId],
                [field]: checked,
            }
        }));
    }

    async function addRole() {
        if (!newRoleName.trim()) return;

        try {
            const role = await createRole({
                roleName: newRoleName,
            }).unwrap();

            const roleId = role.roleId;

            const permissionPayloads = Object.entries(newRolePermissions).map(
                ([sidebarLinkId, perms]) => ({
                    role_id: roleId,
                    sidebar_link_id: Number(sidebarLinkId),
                    ...perms,
                })
            );

            const promise = Promise.all(
                permissionPayloads.map(p =>
                    postRoleSidebarLink(p).unwrap()
                )
            );

            toast.promise(promise, {
                pending: 'Creating role & adding sidebar permissions...',
                success: 'Role Creation & Sidebar permissions addition success',
                error: 'Some error occurred',
            })

            setSelectedRoleId(roleId);
            setSelectedRoleName(newRoleName);
            setNewRoleName("");
            setNewRolePermissions({});
            setIsCreateRoleOpen(false)
        } catch (err) {
            toast.error("Failed to create role");
        }
    }

    function isChecked(
        moduleId: number,
        field: "can_read" | "can_create" | "can_delete"
    ) {
        return (
            sidebarPermissionPayload.permissions[moduleId]?.[field] ?? false
        );
    }

    function onPermissionRadioChange(
        moduleId: number,
        action: "deny" | "read" | "write" | "delete"
    ) {
        const perms = buildPermissionState(action);

        setSidebarPermissionPayload(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: perms
            }
        }));
    }

    useEffect(() => {
        if (!selectedRoleId || !sidebarPermissionData?.permission) return;

        const permissions: Record<number, any> = {};

        sidebarPermissionData.permission.forEach(p => {
            permissions[p.sidebar_link_id] = {
                can_read: p.can_read,
                can_create: p.can_create,
                can_update: p.can_update,
                can_delete: p.can_delete,
            };
        });

        setSidebarPermissionPayload({
            roleId: selectedRoleId,
            permissions,
        });

        setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
    }, [selectedRoleId, sidebarPermissionData]);

    const isDirty = selectedRoleId
        ? JSON.stringify(originalPermissions) !==
        JSON.stringify(sidebarPermissionPayload.permissions)
        : false;

    async function sidebarPermissionUpdate(): Promise<void> {
        if (!isDirty) return;
        const { roleId, permissions } = sidebarPermissionPayload;

        const payloads = Object.entries(permissions).map(
            ([sidebarLinkId, perms]) => ({
                role_id: Number(roleId),
                sidebar_link_id: Number(sidebarLinkId),
                ...perms
            })
        );
        const updatePromise = Promise.all(
            payloads.map(p => postRoleSidebarLink(p).unwrap())
        )

        toast.promise(updatePromise, {
            pending: 'Updating sidebar permissions...',
            success: 'Sidebar permissions updated successfully',
            error: 'Failed to update sidebar permissions',
        })

    }

    function resetPermissions() {
        setSidebarPermissionPayload(prev => ({
            ...prev,
            permissions: JSON.parse(JSON.stringify(originalPermissions)),
        }));
    }

    const updateRoleName = async () => {

        if (!editedRoleName.trim()) {
            toast.error("Role name required");
            return;
        }

        await apiToast(
            updateRole({ id: selectedRoleId, roleName: editedRoleName }).unwrap(),
            "Role updated successfully"
        )

        setSelectedRoleName(editedRoleName);
        setIsEditingRoleName(false);

    };


    const pathname = useLocation().pathname
    const { permission } = usePermission(pathname)

    return (
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] flex-1">
            <section className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Roles</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage roles available in your organization.
                        </p>
                    </div>

                    <Sheet open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                        {permission?.can_create && (
                            <Button variant="hero" onClick={() => setIsCreateRoleOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Add Role
                            </Button>
                        )}
                        <SheetContent side="right" className="w-full lg:max-w-5xl sm:max-w-4xl overflow-y-auto bg-background">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-1"
                            >
                                <SheetHeader>
                                    <div className="space-y-1">
                                        <SheetTitle>Create New Role</SheetTitle>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                            Define access levels and module permissions
                                        </p>
                                    </div>
                                </SheetHeader>
                                <div className="space-y-5 mt-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role Name</Label>
                                        <Input
                                            className="h-9"
                                            value={newRoleName}
                                            onChange={(e) => setNewRoleName(normalizeTextInput(e.target.value))}
                                            placeholder="e.g. Front Desk Manager"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Default Module Access</Label>

                                        <div className="space-y-1 max-h-[400px] overflow-y-auto border border-border rounded-[3px] p-2 bg-muted/10">
                                            {allSidebarLinksData?.roles.map((module) => (
                                                <div
                                                    key={module.id}
                                                    className="flex items-center justify-between p-2 hover:bg-background rounded transition-colors border-b border-border/50 last:border-b-0"
                                                >
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {module.link_name}
                                                    </span>

                                                    <div className="flex gap-3">
                                                        {PERMISSION_ACTIONS.map((action) => (
                                                            <div
                                                                key={action.key}
                                                                className="flex items-center gap-1.5"
                                                            >
                                                                <Checkbox
                                                                    id={`new-perm-${module.id}-${action.key}`}
                                                                    className="h-4 w-4"
                                                                    checked={
                                                                        newRolePermissions[module.id]?.[action.field]
                                                                    }
                                                                    onCheckedChange={(checked) =>
                                                                        onNewRolePermissionChange(
                                                                            module.id,
                                                                            action.field,
                                                                            Boolean(checked)
                                                                        )
                                                                    }
                                                                />
                                                                <Label htmlFor={`new-perm-${module.id}-${action.key}`} className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer">
                                                                    {action.label}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t flex justify-end gap-3 mt-6">
                                        <Button
                                            variant="heroOutline"
                                            onClick={() => setIsCreateRoleOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={addRole} variant="hero">
                                            Create Role
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="bg-card rounded-[5px] border border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!allRolesLoading && !allRolesUninitialized && !allRolesError && allRolesData?.roles.map((role: any) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">{role.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="heroOutline"
                                            onClick={() => {
                                                setSelectedRoleId(role.id);
                                                setSelectedRoleName(role.name);
                                                setEditedRoleName(role.name);
                                                setIsEditingRoleName(false);
                                            }}
                                        >
                                            Manage
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </section>
            <section className="p-6 lg:p-8 bg-muted/20">
                {selectedRoleId ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-[5px] border border-border shadow-sm p-6"
                    >
                        <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                            <div className="flex items-center gap-3">

                                {!isEditingRoleName ? (
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Managing Access For</p>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold text-primary">
                                                {selectedRoleName}
                                            </h2>

                                        {permission?.can_create && !(selectedRoleName === "SUPER_ADMIN" || selectedRoleName === "ADMIN" || selectedRoleName === "OWNER") && (
                                            <Pencil
                                                className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                                                onClick={() => setIsEditingRoleName(true)}
                                            />
                                        )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">

                                        <Input
                                            className="h-8 w-40"
                                            value={editedRoleName}
                                            onChange={(e) =>
                                                setEditedRoleName(normalizeTextInput(e.target.value))
                                            }
                                        />

                                        <Button size="sm" variant="ghost" onClick={updateRoleName}>
                                            Save
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setIsEditingRoleName(false);
                                                setEditedRoleName(selectedRoleName);
                                            }}
                                        >
                                            Cancel
                                        </Button>

                                    </div>
                                )}

                            </div>

                            <div className="flex gap-2">
                                {!isEditingRoleName && permission?.can_create && <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={!isDirty}
                                    onClick={resetPermissions}
                                >
                                    Reset
                                </Button>}

                                {!isEditingRoleName && permission?.can_create && <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={!isDirty}
                                    onClick={sidebarPermissionUpdate}
                                >
                                    Update
                                </Button>}
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                            {!allSidebarLinksLoading &&
                                !allSidebarLinksError &&
                                allSidebarLinksData.roles.map((module) => (
                                    <div
                                        key={module.id}
                                        className="flex items-center justify-between border border-border/50 rounded-[3px] p-3 bg-muted/5 hover:bg-muted/10 transition-colors"
                                    >
                                        <span className="font-semibold text-sm text-foreground">
                                            {module.link_name}
                                        </span>

                                        <div className="flex items-center gap-4">
                                            {["deny", "read", "write", "delete"].map((action) => {
                                                const perms = sidebarPermissionPayload.permissions[module.id] || { can_delete: false, can_update: false, can_create: false, can_read: false };

                                                let selected: "deny" | "read" | "write" | "delete" | null = null;

                                                if (!perms.can_read && !perms.can_create && !perms.can_update && !perms.can_delete) {
                                                    selected = "deny";
                                                }
                                                else if (perms.can_delete) selected = "delete";
                                                else if (perms.can_update && perms.can_create) selected = "write";
                                                else if (perms.can_read) selected = "read";

                                                const isRadioSelected = selected === action;
                                                const radioId = `perm-${module.id}-${action}`;

                                                return (
                                                    <label
                                                        key={action}
                                                        htmlFor={radioId}
                                                        className={cn(
                                                            "flex items-center gap-2 cursor-pointer px-2 py-1 rounded-[3px] transition-all border border-transparent",
                                                            isRadioSelected ? "bg-primary/10 border-primary/20" : "hover:bg-muted/30"
                                                        )}
                                                    >
                                                        <div className="relative flex items-center justify-center">
                                                            <input
                                                                id={radioId}
                                                                disabled={!permission?.can_create || (module.link_name === "Roles" && selectedRoleName === "SUPER_ADMIN") || (module.link_name === "Roles" && (action === "delete" || action === "write"))}
                                                                type="radio"
                                                                name={`perm-${module.id}`}
                                                                className="w-3.5 h-3.5 cursor-pointer accent-primary"
                                                                checked={isRadioSelected}
                                                                onChange={() => permission?.can_create &&
                                                                    onPermissionRadioChange(module.id, action as any)
                                                                }
                                                            />
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase tracking-tight",
                                                            isRadioSelected ? "text-primary" : "text-muted-foreground"
                                                        )}>
                                                            {getPermissionLabel(action)}
                                                        </span>

                                                    </label>
                                                );
                                            })}

                                        </div>
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">
                                No role selected
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Select a role from the left to manage its permissions.
                            </p>
                        </div>
                    </div>
                )}
            </section>
        </section>
    );
}
