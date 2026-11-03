"use client";

import { ReferenceDashboard } from "./reference-dashboard";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "../lib/use-account";
import { LoadingAccount, LoadFailure } from "./account-ui";

export function WorkspaceAccount() {
  const router = useRouter();
  const { account, refresh } = useAccount();
  useEffect(() => {
    if (account.phase === "anonymous") router.replace("/login");
    if (account.phase === "ready" && !account.data.current)
      router.replace("/organizations");
  }, [account, router]);
  if (account.phase === "error")
    return (
      <LoadFailure message={account.message} retry={() => void refresh()} />
    );
  if (account.phase !== "ready" || !account.data.current)
    return <LoadingAccount />;
  const { current, user } = account.data;
  return (
    <section className="organization-page crm-dashboard">
      {account.data.operations.includes("sale.view") && (
        <ReferenceDashboard
          key={`${user.user_id}:${current.organization_id}`}
          organizationId={current.organization_id}
          userId={user.user_id}
        />
      )}
    </section>
  );
}
