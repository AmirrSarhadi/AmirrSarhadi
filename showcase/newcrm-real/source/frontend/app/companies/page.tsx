import { AccountShell } from "../../components/account-ui";
import { CustomerWorkspace } from "../../components/customer-workspace";
export const metadata = { title: "مدیریت شرکت‌ها | NewCRM" };
export default function CompaniesPage() {
  return (
    <AccountShell workspace step="مدیریت شرکت‌ها">
      <CustomerWorkspace companiesOnly />
    </AccountShell>
  );
}
