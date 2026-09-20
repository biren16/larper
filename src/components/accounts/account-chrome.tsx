import { getCurrentAccountUser } from "@/backend/accounts/current-user";
import { mergeLocalFollowsAction, syncFollowAction } from "@/app/account/actions";
import { signOut } from "@/app/auth/actions";
import { PreferenceSync } from "@/components/preferences/preference-sync";
import { SiteHeader } from "@/components/shell/site-header";

export async function AccountChrome() {
  const user = await getCurrentAccountUser();
  return <>
    <SiteHeader account={user ? { label: user.displayName ?? user.email, canOpenStudio: user.role === "founder" || user.role === "editor" } : null} signOutAction={signOut} />
    {user && <PreferenceSync userId={user.id} merge={mergeLocalFollowsAction} syncFollow={syncFollowAction} />}
  </>;
}
