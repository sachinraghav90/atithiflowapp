type ApiErrorLike = {
    status?: number | string;
    originalStatus?: number;
    data?: unknown;
    error?: unknown;
    message?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function readMessage(value: unknown): string | null {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed || null;
    }

    if (!isRecord(value)) {
        return null;
    }

    return (
        readMessage(value.message) ||
        readMessage(value.error) ||
        readMessage(value.details) ||
        null
    );
}

export function extractApiErrorMessage(
    error: ApiErrorLike,
    fallback = "Something went wrong. Please try again."
) {
    const parsedMessage =
        readMessage(error?.data) ||
        readMessage(error?.error) ||
        readMessage(error?.message);

    if (parsedMessage) {
        if (
            parsedMessage === "Internal Server Error" ||
            parsedMessage === "[object Object]"
        ) {
            return fallback;
        }

        return parsedMessage;
    }

    const effectiveStatus =
        error?.status === "PARSING_ERROR"
            ? error?.originalStatus
            : error?.status;

    if (effectiveStatus === 401) {
        return "Your session has expired. Please sign in again.";
    }

    if (effectiveStatus === 403) {
        return "You do not have permission to perform this action.";
    }

    if (effectiveStatus === 500) {
        return "The server encountered an error. This might be due to a service outage (e.g., Supabase maintenance). Please check the status page or try again in a few minutes.";
    }

    if (effectiveStatus === 503) {
        return "The service is temporarily unavailable due to a database outage (Supabase). We are working to restore access. Please try again later.";
    }

    if (error?.status === "FETCH_ERROR") {
        return "Connection failed. Please ensure the backend server is running and your internet is active.";
    }

    return fallback;
}
