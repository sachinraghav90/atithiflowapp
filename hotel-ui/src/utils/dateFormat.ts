import { format, isValid } from "date-fns";

export const APP_DATE_DISPLAY_FORMAT = "dd/MM/yy";
export const APP_DATE_TIME_DISPLAY_FORMAT = "dd/MM/yy HH:mm";
export const APP_DATE_INPUT_PLACEHOLDER = "DD/MM/YY";
export const APP_DATE_TIME_INPUT_PLACEHOLDER = "DD/MM/YY HH:mm";

type DateValue = string | number | Date | null | undefined;

export function parseAppDate(value: DateValue): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
        return isValid(value) ? value : null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;

        const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            const parsed = new Date(Number(year), Number(month) - 1, Number(day));
            return isValid(parsed) ? parsed : null;
        }

        const parsed = new Date(trimmed);
        return isValid(parsed) ? parsed : null;
    }

    const parsed = new Date(value);
    return isValid(parsed) ? parsed : null;
}

export function formatAppDate(value: DateValue, fallback = "—") {
    const date = parseAppDate(value);
    return date ? format(date, APP_DATE_DISPLAY_FORMAT) : fallback;
}

export function formatAppDateTime(value: DateValue, fallback = "—") {
    const date = parseAppDate(value);
    return date ? format(date, APP_DATE_TIME_DISPLAY_FORMAT) : fallback;
}

export function toISODateOnly(date: Date | null | undefined) {
    if (!date || !isValid(date)) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function toDatetimeLocalValue(date: Date | null | undefined) {
    if (!date || !isValid(date)) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
