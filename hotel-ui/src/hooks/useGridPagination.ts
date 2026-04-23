import { useEffect, useState } from "react";

type UseGridPaginationOptions = {
    initialPage?: number;
    initialLimit?: number;
    resetDeps?: ReadonlyArray<unknown>;
};

export function useGridPagination({
    initialPage = 1,
    initialLimit = 5,
    resetDeps = [],
}: UseGridPaginationOptions = {}) {
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);
    const resetDepsKey = JSON.stringify(resetDeps);

    useEffect(() => {
        setPage(initialPage);
    }, [initialPage, resetDepsKey]);

    const resetPage = () => {
        setPage(initialPage);
    };

    const handleLimitChange = (nextLimit: number) => {
        setLimit(nextLimit);
        setPage(initialPage);
    };

    return {
        page,
        limit,
        setPage,
        setLimit,
        resetPage,
        handleLimitChange,
    };
}
