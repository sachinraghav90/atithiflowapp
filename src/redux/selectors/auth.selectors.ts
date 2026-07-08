import { RootState } from "../store";
import { hmsApi } from "../services/hmsApi";
import { hasFeaturePermission, type FeatureName, type UserRole } from "@/rbac/permission.utils";

export const selectMeResult =
    hmsApi.endpoints.getMe.select();

export const selectMe = (state: RootState) =>
    selectMeResult(state)?.data;

export const selectUserRoles = (state: RootState) =>
    selectMe(state)?.user?.roles ?? [];

export const selectRoleSet = (state: RootState) =>
    new Set(
        selectUserRoles(state).map(r => r.name.toUpperCase())
    );

export const selectIsSuperAdmin = (state: RootState) =>
    selectRoleSet(state).has("SUPER_ADMIN");

export const selectIsOwner = (state: RootState) =>
    selectRoleSet(state).has("OWNER");

export const selectIsAdmin = (state: RootState) =>
    selectRoleSet(state).has("ADMIN");

export const selectIsManager = (state: RootState) =>
    selectRoleSet(state).has("MANAGER");

export const selectIsReceptionist = (state: RootState) =>
    selectRoleSet(state).has("RECEPTIONIST");

export const selectCanAccessDeliveryFeatures = (state: RootState): boolean => {
    const userRoles = selectUserRoles(state).map(r => r.name.toUpperCase() as UserRole);
    return hasFeaturePermission(userRoles, "DELIVERY_MANAGEMENT");
};

/**
 * Check if user can create orders
 */
export const selectCanCreateOrders = (state: RootState): boolean => {
    const userRoles = selectUserRoles(state).map(r => r.name.toUpperCase() as UserRole);
    return hasFeaturePermission(userRoles, "ORDER_CREATION");
};

/**
 * Check if user can manage staff
 */
export const selectCanManageStaff = (state: RootState): boolean => {
    const userRoles = selectUserRoles(state).map(r => r.name.toUpperCase() as UserRole);
    return hasFeaturePermission(userRoles, "STAFF_MANAGEMENT");
};

/**
 * Check if user can manage property settings
 */
export const selectCanManagePropertySettings = (state: RootState): boolean => {
    const userRoles = selectUserRoles(state).map(r => r.name.toUpperCase() as UserRole);
    return hasFeaturePermission(userRoles, "PROPERTY_SETTINGS");
};

/**
 * Generic selector for checking any feature permission
 * @param feature - The feature name to check
 * @returns Selector function that checks permission for the given feature
 */
export const selectCanAccessFeature = (feature: FeatureName) => (state: RootState): boolean => {
    const userRoles = selectUserRoles(state).map(r => r.name.toUpperCase() as UserRole);
    return hasFeaturePermission(userRoles, feature);
};
