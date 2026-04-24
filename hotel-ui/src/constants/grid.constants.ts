/**
 * Standardized Grid Configuration
 * 
 * Defines the behavior for search, filters, pagination, and export
 * across all management modules in the application.
 */

export const GRID_CONFIG = {
    search: {
        enabled: true,
        appliesToGrid: true,
        appliesToExport: false, // Rule: Search applies only to grid display result
        resetPageOnChange: true // Rule: When search changes, page should reset to 1
    },
    filters: {
        enabled: true,
        appliesToGrid: true,
        appliesToExport: false, // Rule: Filters apply to grid display result AND export
        resetPageOnChange: true // Rule: When filters change, page should reset to 1
    },
    pagination: {
        appliesToGrid: true,
        appliesToTotal: false, // Rule: Pagination should not affect totals
        appliesToExport: false  // Rule: Export should ignore pagination
    },
    total: {
        basedOnGridResult: true, // Rule: Record count should be based on current grid display result
        includeSearch: true,     // Rule: Grid count should include search
        includeFilters: true,    // Rule: Grid count should include filters
        includePagination: false // Rule: Grid count should exclude pagination
    },
    export: {
        mode: "filter_only" as const,
        includeFilters: true,
        includeSearch: false,   // Rule: Export should ignore search
        includePagination: false, // Rule: Export should ignore pagination
        includeCurrentPageOnly: false // Rule: Export should not export only visible rows
    }
};
