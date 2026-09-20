"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./header-menu.module.css";

function readHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

export function PrimaryNav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(readHash());

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname]);

  const yourLarpsIsActive = pathname === "/" && hash === "#your-larps";
  const discoveryIsActive =
    (pathname === "/" && !yourLarpsIsActive) ||
    pathname.startsWith("/discover/") ||
    pathname.startsWith("/niches/");

  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      <Link
        className={styles.navLink}
        data-active={discoveryIsActive || undefined}
        aria-current={discoveryIsActive ? "page" : undefined}
        href="/"
        onClick={() => {
          setHash("");
          onNavigate?.();
        }}
      >
        Discovery
      </Link>
      <Link
        className={styles.navLink}
        data-active={yourLarpsIsActive || undefined}
        aria-current={yourLarpsIsActive ? "page" : undefined}
        href={{ pathname: "/", hash: "your-larps" }}
        onClick={() => {
          setHash("#your-larps");
          onNavigate?.();
        }}
      >
        Your Larps
      </Link>
    </nav>
  );
}
