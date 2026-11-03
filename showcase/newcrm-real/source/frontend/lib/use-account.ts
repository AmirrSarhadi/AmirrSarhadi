"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {api, ApiError} from "./api";

export type Organization = {id: string; name: string; slug: string; role: string};
type CurrentOrganization = {organization_id: string; name: string; role: string};
type AccountData = {
  user: {user_id: number; username: string}; organizations: Organization[];
  current: CurrentOrganization | null; scope: string | null; operations: string[];
};
type Account = {phase: "loading"} | {phase: "anonymous"} | {phase: "error"; message: string} | {phase: "ready"; data: AccountData};

export function useAccount() {
  const [account, setAccount] = useState<Account>({phase: "loading"});
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setAccount({phase: "loading"});
    const options = {signal: ctrl.signal};
    try {
      const user = await api<AccountData["user"]>("auth/session/", options);
      const organizations = await api<{results: Organization[]}>("organizations/", options);
      let current: CurrentOrganization | null = null;
      let scope: string | null = null;
      let operations: string[] = [];
      try {
        current = await api<CurrentOrganization>("active-organization/", options);
        const access = await api<{member_scope: string; operations: string[]}>("access/", options);
        scope = access.member_scope;
        operations = Array.isArray(access.operations) ? access.operations : [];
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 403) throw error;
        current = null;
      }
      if (!ctrl.signal.aborted) setAccount({phase: "ready", data: {user, organizations: organizations.results, current, scope, operations}});
    } catch (error) {
      if (ctrl.signal.aborted) return;
      if (error instanceof ApiError && error.status === 403) setAccount({phase: "anonymous"});
      else setAccount({phase: "error", message: error instanceof Error ? error.message : "بارگذاری حساب انجام نشد."});
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) void refresh(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("newcrm-organization-updated", onFocus);
    window.addEventListener("pageshow", onPageShow);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("newcrm-account") : null;
    if (channel) channel.onmessage = onFocus;
    return () => {
      controller.current?.abort(); channel?.close();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("newcrm-organization-updated", onFocus); window.removeEventListener("pageshow", onPageShow);
    };
  }, [refresh]);
  return {account, refresh};
}
