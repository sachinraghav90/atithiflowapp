export function filterGridRowsByQuery<T>(
    rows: T[],
    query: string,
    accessors: Array<(row: T) => unknown>
) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return rows;
    }

    return rows.filter((row) =>
        accessors.some((accessor) => {
            const value = accessor(row);

            if (value == null) {
                return false;
            }

            return String(value).toLowerCase().includes(normalizedQuery);
        })
    );
}
