const COLOR_TOKENS = {
    blue: "border-primary/20 bg-primary/10 text-primary",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    gray: "border-slate-300/80 bg-slate-100/90 text-slate-700",
    red: "border-red-500/20 bg-red-500/10 text-red-700",
    yellow: "border-amber-500/20 bg-amber-500/12 text-amber-700",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-700",
} as const;

export type StatusColorType =
    | "booking"
    | "enquiry"
    | "laundry"
    | "menuType"
    | "order"
    | "payment"
    | "restaurantTable"
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
        OPEN: COLOR_TOKENS.blue,
        FOLLOW_UP: COLOR_TOKENS.yellow,
        RESERVED: COLOR_TOKENS.purple,
        BOOKED: COLOR_TOKENS.green,
        CLOSED: COLOR_TOKENS.gray,
        CANCELLED: COLOR_TOKENS.red,
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
        PARTIAL: COLOR_TOKENS.yellow,
    },
    restaurantTable: {
        AVAILABLE: COLOR_TOKENS.green,
        OCCUPIED: COLOR_TOKENS.blue,
        RESERVED: COLOR_TOKENS.purple,
        OUT_OF_SERVICE: COLOR_TOKENS.gray,
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
