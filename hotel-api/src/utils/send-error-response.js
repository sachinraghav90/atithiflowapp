function sanitizeErrorMessage(error, fallbackMessage) {
    const message =
        error?.message && typeof error.message === "string"
            ? error.message.trim()
            : "";

    if (!message || message === "Internal Server Error") {
        return fallbackMessage;
    }

    return message;
}

export function sendErrorResponse(
    res,
    error,
    {
        status = 500,
        fallbackMessage = "Something went wrong. Please try again.",
        logLabel = "API error",
    } = {}
) {
    console.error(logLabel, error);

    return res.status(status).json({
        success: false,
        message: sanitizeErrorMessage(error, fallbackMessage),
    });
}
