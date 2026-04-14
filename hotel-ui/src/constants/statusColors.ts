const COLOR_TOKENS = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-100 text-gray-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-700",
} as const;

type StatusColorType =
    | "booking"
    | "enquiry"
    | "laundry"
    | "menuType"
    | "order"
    | "payment"
    | "staff"
    | "toggle"
    | "vendor";

const STATUS_COLORS: Record<StatusColorType, Record<string, string>> = {
    booking: {
        CONFIRMED: COLOR_TOKENS.blue,
        CHECKED_IN: COLOR_TOKENS.green,
        CHECKED_OUT: COLOR_TOKENS.gray,
        CANCELLED: COLOR_TOKENS.red,
        NO_SHOW: COLOR_TOKENS.yellow,
    },
    enquiry: {
        NEW: COLOR_TOKENS.blue,
        IN_PROGRESS: COLOR_TOKENS.yellow,
        QUALIFIED: COLOR_TOKENS.purple,
        WON: COLOR_TOKENS.green,
        CLOSED: COLOR_TOKENS.gray,
        LOST: COLOR_TOKENS.red,
    },
    laundry: {
        PENDING: COLOR_TOKENS.yellow,
        PICKED_UP: COLOR_TOKENS.blue,
        IN_PROCESS: COLOR_TOKENS.purple,
        DELIVERED: COLOR_TOKENS.green,
        CANCELLED: COLOR_TOKENS.red,
    },
    menuType: {
        VEG: COLOR_TOKENS.green,
        NON_VEG: COLOR_TOKENS.red,
    },
    order: {
        NEW: COLOR_TOKENS.blue,
        PREPARING: COLOR_TOKENS.yellow,
        READY: COLOR_TOKENS.green,
        DELIVERED: COLOR_TOKENS.green,
        SERVED: COLOR_TOKENS.green,
        CANCELLED: COLOR_TOKENS.red,
    },
    payment: {
        PENDING: COLOR_TOKENS.yellow,
        PAID: COLOR_TOKENS.green,
        FAILED: COLOR_TOKENS.red,
        REFUNDED: COLOR_TOKENS.gray,
    },
    staff: {
        ACTIVE: COLOR_TOKENS.green,
        INACTIVE: COLOR_TOKENS.red,
    },
    toggle: {
        ACTIVE: COLOR_TOKENS.green,
        INACTIVE: COLOR_TOKENS.red,
        ENABLED: COLOR_TOKENS.green,
        DISABLED: COLOR_TOKENS.gray,
    },
    vendor: {
        NOT_ALLOTTED: COLOR_TOKENS.gray,
        PICKED_UP: COLOR_TOKENS.blue,
        RECEIVED: COLOR_TOKENS.green,
    },
};

const normalizeStatusKey = (status?: string | null) =>
    (status ?? "")
        .trim()
        .replace(/[\s-]+/g, "_")
        .toUpperCase();

export const getStatusColor = (
    status: string | null | undefined,
    type: StatusColorType
) => {
    const normalizedStatus = normalizeStatusKey(status);
    return STATUS_COLORS[type][normalizedStatus] ?? COLOR_TOKENS.gray;
};
