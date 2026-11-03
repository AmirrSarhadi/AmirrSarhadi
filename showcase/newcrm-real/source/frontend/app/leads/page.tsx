import { AccountShell } from "../../components/account-ui";
import { LeadWorkspace } from "../../components/lead-workspace";
export const metadata = { title: "سرنخ‌ها | NewCRM" };
export default function LeadsPage() {
  return (
    <AccountShell step="مدیریت سرنخ‌ها">
      <LeadWorkspace />
    </AccountShell>
  );
}
