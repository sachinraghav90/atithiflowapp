import { formatAppDate } from "./dateFormat";

export function formatToDDMMYY(isoDate: string | Date | null | undefined): string {
    return formatAppDate(isoDate, "");
}
