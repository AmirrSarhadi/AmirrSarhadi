import { AccountShell } from "../../components/account-ui";
import { SettingsWorkspace } from "../../components/settings-workspace";
export const metadata = { title: "تنظیمات سیستم | NewCRM" };
export default function SettingsPage() {
  return (
    <AccountShell workspace step="تنظیمات سیستم">
      <SettingsWorkspace />
    </AccountShell>
  );
}
