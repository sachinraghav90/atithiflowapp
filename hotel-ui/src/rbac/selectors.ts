import { hmsApi } from "@/redux/services/hmsApi";

/**
 * Select permission object by endpoint from RTK Query cache
 */
export const selectPermissionByEndpoint = (endpoint: string) => (state: any) => {
    const result = hmsApi.endpoints.getSidebarLinks.select(undefined)(state);

    const links = result?.data?.sidebarLinks;

    if (!links || !Array.isArray(links)) return null;

    return links.find((l: any) => l.endpoint === endpoint) || null;
};
