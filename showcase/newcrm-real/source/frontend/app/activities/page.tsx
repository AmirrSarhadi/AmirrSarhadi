import { AccountShell } from "../../components/account-ui";
import { ActivityWorkspace } from "../../components/activity-workspace";
export const metadata = { title: "فعالیت‌ها و پیگیری | NewCRM" };
export default function ActivitiesPage() {
  return (
    <AccountShell step="فعالیت‌ها و پیگیری">
      <ActivityWorkspace />
    </AccountShell>
  );
}
