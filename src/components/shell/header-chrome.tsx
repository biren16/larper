"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HeaderMenu } from "./header-menu";
import type { HeaderAccount } from "./header-types";
import styles from "./site-header.module.css";

type HeaderChromeProps = {
  account?: HeaderAccount | null;
  signOutAction?: () => Promise<void>;
};

export function HeaderChrome({ account, signOutAction }: HeaderChromeProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const isStudioRoute = pathname === "/studio" || pathname.startsWith("/studio/");

  return (
    <>
      <div className={styles.context}>
        {isStudioRoute && (
          <Link aria-current="page" className={styles.contextLink} href="/studio">
            Studio
          </Link>
        )}
      </div>
      <div className={styles.actions}>
        {account === null && !isAuthRoute && !isStudioRoute && (
          <Link className={styles.signInLink} href="/auth">
            Sign in
          </Link>
        )}
        <HeaderMenu account={account} signOutAction={signOutAction} />
      </div>
    </>
  );
}
