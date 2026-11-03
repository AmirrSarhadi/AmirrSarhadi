import {AccountShell} from "../../../components/account-ui";
import {PasswordManager} from "../../../components/password-manager";
export const metadata = {title: "تغییر رمز عبور | NewCRM"};
export default function PasswordPage() { return <AccountShell step="امنیت حساب"><PasswordManager/></AccountShell>; }
