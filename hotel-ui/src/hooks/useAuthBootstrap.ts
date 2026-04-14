import { useEffect } from "react";
import { useLazyGetMeQuery } from "@/redux/services/hmsApi";
import { logout, setApiLoaded, setMeLoaded } from "@/redux/slices/isLoggedInSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hook";

export function useAuthBootstrap() {
    const dispatch = useAppDispatch();

    const isLoggedIn = useAppSelector(state => state.isLoggedIn.value);
    const meLoaded = useAppSelector(state => state.isLoggedIn.meLoaded);

    const [getMe] = useLazyGetMeQuery();

    useEffect(() => {
        if (!isLoggedIn || meLoaded) {
            dispatch(setApiLoaded(true));
            return;
        }

        (async () => {
            try {
                await getMe().unwrap();
                dispatch(setMeLoaded());
            } catch (err) {
                dispatch(logout());
            } finally {
                dispatch(setApiLoaded(true));
            }
        })();
    }, [isLoggedIn, meLoaded]);
}
