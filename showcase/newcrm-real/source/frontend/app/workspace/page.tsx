import {AccountShell} from "../../components/account-ui";
import {WorkspaceAccount} from "../../components/workspace-account";
export const metadata = {title: "فضای کار سازمان | NewCRM"};
export default function WorkspacePage() { return <AccountShell step="حساب و دسترسی"><WorkspaceAccount/></AccountShell>; }
