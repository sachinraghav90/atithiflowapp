export function formatToDDMMYY(isoDate: string | Date | null | undefined): string {
    if (!isoDate) return "";

    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
    
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
}
