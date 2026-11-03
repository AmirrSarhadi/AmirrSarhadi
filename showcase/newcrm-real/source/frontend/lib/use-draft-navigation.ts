"use client";
import { useNavigationRequest } from "./request-navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Shared document-exit guard and app-owned confirmation for business drafts. */
export function useDraftNavigation(
  dirty: boolean,
  busy: boolean,
  discard: () => void,
) {
  const [action, setAction] = useState<(() => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const latest = useRef({ dirty, busy, discard });
  latest.current = { dirty, busy, discard };
  const navigate = useCallback((next: () => void) => {
    if (latest.current.busy) return;
    if (!latest.current.dirty) {
      next();
      return;
    }
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setAction(() => next);
  }, []);
  useNavigationRequest(navigate);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (latest.current.dirty || latest.current.busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        (!latest.current.dirty && !latest.current.busy) ||
        !link ||
        link.target === "_blank" ||
        link.getAttribute("href")?.startsWith("#") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      navigate(() => window.location.assign(link.href));
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [navigate]);
  return {
    navigate,
    confirming: !!action,
    cancel: () => {
      setAction(null);
      requestAnimationFrame(() => trigger.current?.focus());
    },
    confirm: () => {
      if (latest.current.busy || !action) return;
      latest.current.discard();
      setAction(null);
      action();
    },
    reset: () => setAction(null),
  };
}
