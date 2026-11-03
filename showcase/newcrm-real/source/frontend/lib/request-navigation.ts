"use client";

import { useEffect, useRef } from "react";

const navigationEvent = "newcrm-request-navigation";

/** Route account actions through the active workflow's existing draft guard. */
export function requestNavigation(action: () => void) {
  const event = new CustomEvent(navigationEvent, {
    cancelable: true,
    detail: action,
  });
  if (window.dispatchEvent(event)) action();
}

export function useNavigationRequest(navigate: (action: () => void) => void) {
  const latest = useRef(navigate);
  latest.current = navigate;
  useEffect(() => {
    const handle = (event: Event) => {
      event.preventDefault();
      latest.current((event as CustomEvent<() => void>).detail);
    };
    window.addEventListener(navigationEvent, handle);
    return () => window.removeEventListener(navigationEvent, handle);
  }, []);
}
