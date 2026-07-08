/**
 * Permission Utility Functions
 * Reusable functions for checking role-based access to features
 */

import { FEATURE_PERMISSIONS, type FeatureName, type UserRole } from "./permissions";

export type { FeatureName, UserRole } from "./permissions";

/**
 * Check if a single role has permission for a feature
 * @param role - The role to check
 * @param feature - The feature name
 * @returns true if role has access to feature
 */
export function hasPermission(role: UserRole, feature: FeatureName): boolean {
  const allowedRoles = FEATURE_PERMISSIONS[feature];
  return allowedRoles.includes(role);
}

/**
 * Check if any of the user's roles have permission for a feature
 * @param roles - Array of user roles
 * @param feature - The feature name
 * @returns true if at least one role has access to feature
 */
export function hasFeaturePermission(roles: UserRole[], feature: FeatureName): boolean {
  return roles.some(role => hasPermission(role, feature));
}

/**
 * Check if a role has ALL specified features
 * @param role - The role to check
 * @param features - Array of feature names
 * @returns true if role has access to all features
 */
export function hasAllPermissions(role: UserRole, features: FeatureName[]): boolean {
  return features.every(feature => hasPermission(role, feature));
}

/**
 * Check if a role has ANY of the specified features
 * @param role - The role to check
 * @param features - Array of feature names
 * @returns true if role has access to at least one feature
 */
export function hasAnyPermission(role: UserRole, features: FeatureName[]): boolean {
  return features.some(feature => hasPermission(role, feature));
}

/**
 * Get all features a role can access
 * @param role - The role to check
 * @returns Array of accessible feature names
 */
export function getRolePermissions(role: UserRole): FeatureName[] {
  return Object.entries(FEATURE_PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(role))
    .map(([feature]) => feature as FeatureName);
}

/**
 * Debug utility: Log all permissions for a role
 * @param role - The role to debug
 */
export function debugRolePermissions(role: UserRole): void {
  const permissions = getRolePermissions(role);
  console.log(`Permissions for role "${role}":`, permissions);
}
