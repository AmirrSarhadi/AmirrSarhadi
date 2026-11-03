import { AccountShell } from "../../components/account-ui";
import { ReportsWorkspace } from "../../components/reports-workspace";
export const metadata = { title: "گزارش‌ها و آنالیتیکس | NewCRM" };
export default function ReportsPage() {
  return (
    <AccountShell workspace step="گزارش‌ها و آنالیتیکس">
      <ReportsWorkspace />
    </AccountShell>
  );
}
