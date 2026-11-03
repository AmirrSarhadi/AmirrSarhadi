import { useEffect, useRef, useCallback } from "react";
import { useBlocker } from "react-router-dom";

export default function useUnsavedGuard(dirty, unloadDirty = dirty) {
    const allowed = useRef(false);
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            !allowed.current &&
            dirty &&
            currentLocation.pathname + currentLocation.search !==
                nextLocation.pathname + nextLocation.search,
    );
    const allowNavigation = useCallback(() => {
        allowed.current = true;
    }, []);
    useEffect(() => {
        if (!unloadDirty) return;
        const unload = (event) => {
            if (!allowed.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", unload);
        return () => window.removeEventListener("beforeunload", unload);
    }, [unloadDirty]);
    return { blocker, allowNavigation };
}
