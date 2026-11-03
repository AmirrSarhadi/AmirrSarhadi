import {AccountShell} from "../../../components/account-ui";
import {InvitationAcceptance} from "../../../components/invitation-acceptance";
export const metadata = {title: "پذیرش دعوت سازمان | NewCRM"};
export default function InvitationPage() { return <AccountShell step="پذیرش دعوت"><InvitationAcceptance/></AccountShell>; }
