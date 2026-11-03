import {AccountShell} from "../../components/account-ui";
import {LoginForm} from "../../components/login-form";
export const metadata = {title: "ورود به حساب | NewCRM"};
export default function LoginPage() { return <AccountShell step="ورود به حساب"><LoginForm/></AccountShell>; }
