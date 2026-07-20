import { formatAppDate } from "./date-format";

export function formatToDDMMYYYY(isoDate: string): string {
    return formatAppDate(isoDate, "");
}
