import { formatAppDate } from "./dateFormat";

export function formatToDDMMYYYY(isoDate: string): string {
    return formatAppDate(isoDate, "");
}
