import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError, } from "@reduxjs/toolkit/query/react";
import { logout } from "../slices/isLoggedInSlice";
import { extractApiErrorMessage } from "@/utils/apiError";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
    },
});

export const baseQueryWithErrorHandler: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    
    if (result.error) {
        const status = result.error.status;
        const effectiveStatus =
            status === "PARSING_ERROR" ? result.error.originalStatus : status;
        const message = extractApiErrorMessage(result.error);

        switch (effectiveStatus) {
            case 401:
                console.warn("401 - Unauthorized", { message });
                api.dispatch(logout());
                break;

            case 403:
                console.warn("403 - Forbidden", { message });
                break;

            case 500:
                console.error("500 - Server error", {
                    message,
                    status: result.error.status,
                    originalStatus: result.error.originalStatus,
                });
                break;

            default:
                console.error("API Error:", {
                    message,
                    status: result.error.status,
                    originalStatus: result.error.originalStatus,
                });
        }
    }

    return result;
};
