export function normalizeTextInput(value: string) {
    return value
        .replace(/^\s+/, "")
        .replace(/\s{2,}/g, " ");
}

export function normalizeNumberInput(value: string): number | "" {
    if (value === "") return "";

    const normalized = value.replace(/^0+(?=\d)/, "");
    const num = Number(normalized);

    return isNaN(num) ? "" : num;
}

export function normalizeSignedNumberInput(value: string): number | "" {

    if (value === "") return "";

    // Reject decimal input immediately
    if (value.includes(".")) return "";

    // Allow only optional leading "-" and digits
    if (!/^-?\d*$/.test(value)) return "";

    // Remove leading zeros but preserve negative sign
    const normalized = value.replace(
        /^-?0+(?=\d)/,
        (match) => (match.startsWith("-") ? "-" : "")
    );

    const num = Number(normalized);

    return Number.isNaN(num) ? "" : num;
}
