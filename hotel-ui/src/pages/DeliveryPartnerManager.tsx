import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useCreateDeliveryPartnerMutation, useGetDeliveryPartnersQuery, useUpdateDeliveryPartnerMutation } from "@/redux/services/hmsApi";
import { useAppSelector } from "@/redux/hook";
import { apiToast } from "@/utils/apiToastPromise";
import { usePermission } from "@/rbac/usePermission";
import { Switch } from "@/components/ui/switch";

/* ===========================
   TYPES
=========================== */

type DeliveryPartner = {
    id: number;
    name: string;
    is_active: boolean;
};

/* ===========================
   PAYLOAD BUILDERS (UPDATED)
=========================== */

function buildCreatePayload(name: string, propertyId: number) {
    return {
        property_id: propertyId,
        name: name.trim()
    };
}

function buildUpdatePayload(name: string, is_active: boolean) {
    return {
        name: name.trim(),
        is_active
    };
}


/* ===========================
   MAIN COMPONENT
=========================== */

export default function DeliveryPartnerManager({
    sheetOpen, setSheetOpen, createOpen, setCreateOpen, propertyId
}) {

    /* ---------- STATE ---------- */

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");

    const [createName, setCreateName] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [editActive, setEditActive] = useState<boolean>(true);

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);

    const { data: partners } = useGetDeliveryPartnersQuery({ propertyId }, {
        skip: !isLoggedIn || !propertyId
    })

    const [createDeliveryPartner] = useCreateDeliveryPartnerMutation()
    const [updateDeliveryPartner] = useUpdateDeliveryPartnerMutation()

    /* ===========================
       HANDLERS
    =========================== */

    const startEdit = (p: DeliveryPartner) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditActive(p.is_active);
    };

    const saveEdit = () => {

        const newErrors: Record<string, string> = {};

        if (!editName.trim()) {
            newErrors.editName = "Name is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        const payload = buildUpdatePayload(editName, editActive);

        apiToast(
            updateDeliveryPartner({ id: editingId, body: payload }).unwrap(),
            "Delivery Partner Updated Successfully"
        )

        setEditingId(null);
    };

    const createPartner = () => {

        const newErrors: Record<string, string> = {};

        if (!createName.trim()) {
            newErrors.createName = "Name is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!propertyId) return;

        setErrors({});

        const payload = buildCreatePayload(createName, propertyId);

        apiToast(
            createDeliveryPartner(payload).unwrap(),
            "Delivery Partner created successfully"
        )

        setCreateName("");
        setCreateOpen(false);
    };

    const { permission: vendorPermission } = usePermission("/vendors", {
        autoRedirect: false
    })

    /* ===========================
       UI
    =========================== */

    return (
        <>
            {/* ACTION BUTTONS */}


            {/* =======================
               VIEW / EDIT SHEET
            ======================== */}

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-lg">

                    <SheetHeader>
                        <SheetTitle>Delivery Partners</SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-2">

                        {partners && partners.map(partner => {

                            const isEditing = editingId === partner.id;

                            return (
                                <div
                                    key={partner.id}
                                    className="flex justify-between items-center border rounded-[4px] px-4 py-3 bg-card"
                                >

                                    {/* NAME / INPUT */}
                                    {!isEditing ? (
                                        <div className="flex items-center gap-2">

                                            <span className="font-medium">
                                                {partner.name}
                                            </span>

                                            <span
                                                className={`text-xs px-2 py-0.5 rounded font-medium ${partner.is_active
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {partner.is_active ? "Active" : "Inactive"}
                                            </span>

                                        </div>
                                    ) : (
                                        <>
                                            <Input
                                                value={editName}
                                                className={`max-w-[200px] ${errors.editName ? "border-red-500" : ""
                                                    }`}
                                                onChange={(e) => {

                                                    setEditName(e.target.value);

                                                    if (e.target.value.trim()) {
                                                        setErrors(prev => {
                                                            const copy = { ...prev };
                                                            delete copy.editName;
                                                            return copy;
                                                        });
                                                    }
                                                }}
                                            />

                                            {errors.editName && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {errors.editName}
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {/* ACTIONS */}
                                    {vendorPermission?.can_create && <div className="flex items-center gap-2 pt-1">

                                        {!isEditing ? (
                                            <Button
                                                size="sm"
                                                variant="heroOutline"
                                                onClick={() => startEdit(partner)}
                                            >
                                                Edit
                                            </Button>
                                        ) : (
                                            <>
                                                <Switch
                                                    checked={editActive}
                                                    onCheckedChange={(val) => setEditActive(val)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="heroOutline"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    Cancel
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="hero"
                                                    onClick={saveEdit}
                                                >
                                                    Save
                                                </Button>
                                            </>
                                        )}

                                    </div>}
                                </div>
                            );
                        })}

                    </div>

                </SheetContent>
            </Sheet>

            {/* =======================
               CREATE SHEET
            ======================== */}

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">

                    <SheetHeader>
                        <SheetTitle>Create delivery partner</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6 mt-6">

                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                                className={errors.createName ? "border-red-500" : ""}
                                value={createName}
                                onChange={(e) => {

                                    setCreateName(e.target.value);

                                    if (e.target.value.trim()) {
                                        setErrors(prev => {
                                            const copy = { ...prev };
                                            delete copy.createName;
                                            return copy;
                                        });
                                    }
                                }}
                            />

                            {errors.createName && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.createName}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="heroOutline"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="hero"
                                onClick={createPartner}
                            >
                                Create
                            </Button>
                        </div>

                    </div>

                </SheetContent>
            </Sheet>

        </>
    );
}
