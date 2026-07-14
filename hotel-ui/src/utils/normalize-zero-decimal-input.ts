function normalizeZeroDecimalInput(prevValue, nextValue) {
    // Normalize to string
    const prev = String(prevValue ?? "");
    const next = String(nextValue ?? "");

    // Special case: only when previous was zero
    if (prev === "0" || prev === "0.00") {
        /**
         * Example:
         * prev: "0.00"
         * next: "0.001"  → user typed "1"
         */
        if (/^0(\.0*)?\d$/.test(next)) {
            // Extract the last digit typed
            return next.slice(-1);
        }
    }

    // Default behavior
    return next;
}
