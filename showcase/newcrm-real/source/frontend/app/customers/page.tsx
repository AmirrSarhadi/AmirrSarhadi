import { AccountShell } from "../../components/account-ui";
import { CustomerWorkspace } from "../../components/customer-workspace";
export const metadata = { title: "اشخاص و شرکت‌ها | NewCRM" };
export default function CustomersPage() {
  return (
    <AccountShell step="پرونده‌های مشتری">
      <CustomerWorkspace />
    </AccountShell>
  );
}
