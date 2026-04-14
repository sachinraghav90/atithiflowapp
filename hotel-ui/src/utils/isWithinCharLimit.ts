export function isWithinCharLimit(
    value: string,
    max: number
): boolean {
    if (!value) return true;

    // Type-safe feature detection
    const Segmenter = (Intl as any).Segmenter;

    if (typeof Segmenter === "function") {
        const segmenter = new Segmenter("en", {
            granularity: "grapheme",
        });

        let count = 0;
        for (const _ of segmenter.segment(value)) {
            count++;
            if (count > max) return false;
        }
        return true;
    }

    // Fallback (emoji-safe)
    return [...value].length <= max;
}
