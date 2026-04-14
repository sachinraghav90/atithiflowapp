/**
 * RBAC Permissions Configuration
 * Defines which features require which roles
 * This is the single source of truth for feature-level access control
 */

export type UserRole = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "MANAGER" | "RECEPTIONIST";

export type FeatureName = 
  | "DELIVERY_MANAGEMENT"
  | "ORDER_CREATION"
  | "STAFF_MANAGEMENT"
  | "PROPERTY_SETTINGS"
  | "FINANCIAL_REPORTS";

/**
 * Feature-to-Role mapping
 * Defines which roles can access each feature
 * Only listed roles get access - others are denied
 */
export const FEATURE_PERMISSIONS: Record<FeatureName, UserRole[]> = {
  // Delivery & Order Management
  DELIVERY_MANAGEMENT: ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER"],
  ORDER_CREATION: ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "RECEPTIONIST"],

  // Staff Management
  STAFF_MANAGEMENT: ["SUPER_ADMIN", "OWNER", "ADMIN"],

  // Property Settings
  PROPERTY_SETTINGS: ["SUPER_ADMIN", "OWNER"],

  // Financial Reports
  FINANCIAL_REPORTS: ["SUPER_ADMIN", "OWNER", "ADMIN"],
};

/**
 * Default deny list (roles explicitly excluded from features)
 * Useful for documentation and explicit blocking
 */
// export const ROLE_EXCLUSIONS: Partial<Record<FeatureName, UserRole[]>> = {
//   DELIVERY_MANAGEMENT: ["RECEPTIONIST"],
//   // ORDER_CREATION: ["RECEPTIONIST"],
// };
