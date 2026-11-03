import { AccountShell } from "../../components/account-ui";
import { OrderWorkspace } from "../../components/order-workspace";
export const metadata = { title: "مدیریت فروش | NewCRM" };
export default function SalesPage() {
  return (
    <AccountShell step="مدیریت فروش">
      <OrderWorkspace />
    </AccountShell>
  );
}
