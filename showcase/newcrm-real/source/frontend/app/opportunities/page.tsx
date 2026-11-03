import { AccountShell } from "../../components/account-ui";
import { SalesWorkspace } from "../../components/sales-workspace";
export const metadata = { title: "فرصت‌ها و قیف فروش | NewCRM" };
export default function OpportunitiesPage() {
  return (
    <AccountShell step="فرصت‌ها و قیف فروش">
      <SalesWorkspace />
    </AccountShell>
  );
}
