import { AccountShell } from "../../components/account-ui";
import { ProductWorkspace } from "../../components/product-workspace";
export const metadata = { title: "مدیریت محصولات | NewCRM" };
export default function ProductsPage() {
  return (
    <AccountShell workspace step="مدیریت محصولات">
      <ProductWorkspace />
    </AccountShell>
  );
}
