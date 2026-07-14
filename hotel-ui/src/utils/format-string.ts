/**
 * Standardizes raw identifiers (e.g., HOUSE_KEEPING, CHECKED_OUT, usable) 
 * into readable labels (e.g., House Keeping, Checked Out, Usable).
 */
export function formatReadableLabel(label: string | null | undefined): string {
    if (!label || label === "All") return label || "";
    
    // Only format if it looks like a raw identifier (underscores, all caps, or all lower)
    const isLower = label === label.toLowerCase() && label !== label.toUpperCase();
    const isUpper = label === label.toUpperCase() && label !== label.toLowerCase();
    const hasUnderscore = label.includes("_");

    // Keep short acronyms as-is (e.g., UPI, ID, GST)
    if (isUpper && label.length <= 3) {
        return label;
    }
    
    if (isLower || isUpper || hasUnderscore) {
        return label
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    return label;
}
