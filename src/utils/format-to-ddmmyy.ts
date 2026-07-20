import { formatAppDate } from "./date-format";

export function formatToDDMMYY(isoDate: string | Date | null | undefined): string {
    return formatAppDate(isoDate, "");
}
