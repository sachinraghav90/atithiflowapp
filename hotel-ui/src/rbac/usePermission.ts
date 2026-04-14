import { useEffect } from "react";
import { useAppSelector } from "@/redux/hook";
import { hmsApi } from "@/redux/services/hmsApi";
import { useNavigate } from "react-router-dom";

type Options = {
    autoRedirect?: boolean;
    redirectTo?: string;
};

export function usePermission(
    endpoint: string,
    options: Options = {}
) {
    const navigate = useNavigate();

    const {
        autoRedirect = true,
        redirectTo = "/login"
    } = options;

    const result = useAppSelector(hmsApi.endpoints.getSidebarLinks.select(undefined));

    const links = result?.data?.sidebarLinks;

    const permission = links?.find((l: any) => l.endpoint === endpoint) ?? null;

    const status = result?.status;

    const isUninitialized = status === "uninitialized";
    const isFetching = status === "pending";
    const isLoading = status === "pending";
    const isSuccess = status === "fulfilled";
    const isError = status === "rejected";

    useEffect(() => {
        if (!autoRedirect) return;
        if (isUninitialized || isFetching) return;

        if (!permission?.can_read) {
            navigate(redirectTo, {
                state: { endpoint }
            });
        }
    }, [permission, isUninitialized, isFetching, autoRedirect, redirectTo, endpoint]);

    return {
        permission: permission ?? {
            can_read: false,
            can_create: false,
            can_update: false,
            can_delete: false,
        },

        // states
        isUninitialized,
        isFetching,
        isLoading,
        isSuccess,
        isError,
        status,
        error: result?.error ?? null,
    };
}
