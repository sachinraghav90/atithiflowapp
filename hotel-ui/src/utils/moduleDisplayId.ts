export const MODULE_ID_PREFIXES = {
    booking: "BO",
    order: "OR",
    enquiry: "EN",
    laundry: "LA",
    guest: "GU",
    inventory: "IN",
    kitchen: "KI",
    package: "PK",
    payment: "PY",
    property: "PR",
    staff: "ST",
    vendor: "VE",
    menu: "ME",
    room: "RM",
} as const;

type ModuleName = keyof typeof MODULE_ID_PREFIXES | string;

type FormatModuleDisplayIdOptions = {
    padLength?: number;
};

export function getModuleIdPrefix(moduleName: ModuleName): string {
    const normalizedModuleName = String(moduleName).trim().toLowerCase();

    if (normalizedModuleName in MODULE_ID_PREFIXES) {
        return MODULE_ID_PREFIXES[normalizedModuleName as keyof typeof MODULE_ID_PREFIXES];
    }

    const fallbackPrefix = normalizedModuleName
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 2)
        .toUpperCase();

    return fallbackPrefix || "ID";
}

export function formatModuleDisplayId(
    moduleName: ModuleName,
    rawId: string | number | null | undefined,
    options: FormatModuleDisplayIdOptions = {}
): string {
    if (rawId === null || rawId === undefined || rawId === "") {
        return "-";
    }

    const { padLength = 3 } = options;
    const normalizedRawId = String(rawId).trim();
    const numericId = Number(normalizedRawId);
    const prefix = getModuleIdPrefix(moduleName);

    if (Number.isInteger(numericId) && numericId >= 0) {
        return `${prefix}${String(numericId).padStart(padLength, "0")}`;
    }

    return `${prefix}${normalizedRawId}`;
}
