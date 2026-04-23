import { useEffect } from "react";
import { useAppSelector } from "@/redux/hook";
import { selectIsOwner, selectIsSuperAdmin } from "@/redux/selectors/auth.selectors";
import { useGetMyPropertiesQuery, useGetPropertyAddressByUserQuery } from "@/redux/services/hmsApi";

/**
 * Custom hook to automatically select a property ID based on the user's role.
 * - For Super Admins/Owners: Selects the first property from their managed list.
 * - For Staff (Receptionists, Managers, etc.): Selects the property they are assigned to.
 * 
 * @param selectedPropertyId - Current selected property ID from component state
 * @param setSelectedPropertyId - Setter function for the property ID
 */
export function useAutoPropertySelect(
    selectedPropertyId: string | number | null | undefined,
    setSelectedPropertyId: (id: any) => void
) {
    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const isOwner = useAppSelector(selectIsOwner);

    // For multi-property users (Super Admin / Owner)
    const { data: myProperties, isLoading: myPropertiesLoading } = useGetMyPropertiesQuery(undefined, {
        skip: !isLoggedIn || (!isSuperAdmin && !isOwner)
    });

    // For single-property users (Receptionist / Manager / Hotel Admin)
    const { data: staffProperty, isLoading: staffPropertyLoading } = useGetPropertyAddressByUserQuery(undefined, {
        skip: !isLoggedIn || isOwner || isSuperAdmin
    });

    useEffect(() => {
        if (!selectedPropertyId && isLoggedIn) {
            // Priority 1: Multi-property selection (First one)
            if ((isSuperAdmin || isOwner) && myProperties?.properties?.length > 0) {
                const firstId = myProperties.properties[0].id;
                if (firstId && !isNaN(Number(firstId))) {
                    setSelectedPropertyId(Number(firstId));
                }
            } 
            // Priority 2: Staff property assignment
            else if (!isSuperAdmin && !isOwner && staffProperty?.id) {
                if (staffProperty.id && !isNaN(Number(staffProperty.id))) {
                    setSelectedPropertyId(Number(staffProperty.id));
                }
            }
        }
    }, [myProperties, staffProperty, selectedPropertyId, isSuperAdmin, isOwner, isLoggedIn, setSelectedPropertyId]);

    const isMultiLoading = (isSuperAdmin || isOwner) && myPropertiesLoading;
    const isStaffLoading = (!isSuperAdmin && !isOwner) && staffPropertyLoading;

    // We are "Initializing" if we are still fetching properties OR we have properties but haven't set the ID yet
    const isInitializing = 
        (isMultiLoading || isStaffLoading) || 
        (isLoggedIn && !selectedPropertyId);

    return {
        myProperties,
        staffProperty,
        isSuperAdmin,
        isOwner,
        isMultiProperty: isSuperAdmin || isOwner,
        isLoading: isMultiLoading || isStaffLoading,
        isInitializing // New: specifically for the "gap" before selectedPropertyId is set
    };
}
