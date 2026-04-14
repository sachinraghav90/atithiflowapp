import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { logout, setApiLoaded } from "@/redux/slices/isLoggedInSlice";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type UseAutoLogoutOptions = {
    timeoutMs?: number; // default 30 minutes
};

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 mins

export function useAutoLogout(options?: UseAutoLogoutOptions) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const isLoggedIn = useAppSelector(
        (state) => state.isLoggedIn.value
    );

    const timerRef = useRef<number | null>(null);

    const logoutFn = () => {
        dispatch(logout())
        navigate("/login", { replace: true });
        dispatch(setApiLoaded(false))
    };

    const resetTimer = () => {
        if (!isLoggedIn) return;

        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(logoutFn, timeoutMs);
    };

    useEffect(() => {
        if (!isLoggedIn) {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
            return;
        }

        const events: (keyof WindowEventMap)[] = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
        ];

        events.forEach((event) =>
            window.addEventListener(event, resetTimer)
        );

        // Start inactivity timer immediately after login
        resetTimer();

        return () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }

            events.forEach((event) =>
                window.removeEventListener(event, resetTimer)
            );
        };
    }, [isLoggedIn, timeoutMs]);

    return null;
}
