"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { type PointerEvent, type SyntheticEvent, useEffect, useRef, useState } from "react";

import { ThemeSelector } from "@/components/theme/theme-toggle";

import { PrimaryNav } from "./primary-nav";
import styles from "./header-menu.module.css";

const MENU_ID = "site-menu";
const CLOSE_DURATION_MS = 180;

export function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  function openMenu() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setIsOpen(true);
    setIsClosing(false);
  }

  function finishClose() {
    const dialog = dialogRef.current;
    if (dialog) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    setIsOpen(false);
    setIsClosing(false);
    triggerRef.current?.focus();
  }

  function closeMenu() {
    if (!isOpen || isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(finishClose, CLOSE_DURATION_MS);
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    closeMenu();
  }

  function handleOverlayPointerDown(event: PointerEvent<HTMLDialogElement>) {
    const target = event.target;
    if (target instanceof Element && !target.closest("[data-menu-content]")) closeMenu();
  }

  return (
    <>
      <button
        aria-controls={MENU_ID}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className={styles.menuButton}
        data-open={isOpen || undefined}
        onClick={isOpen ? closeMenu : openMenu}
        ref={triggerRef}
        type="button"
      >
        <List aria-hidden="true" className={styles.openIcon} size={25} weight="light" />
        <X aria-hidden="true" className={styles.closeIcon} size={24} weight="light" />
      </button>

      <dialog
        aria-label="Site menu"
        className={styles.dialog}
        data-closing={isClosing || undefined}
        id={MENU_ID}
        onCancel={handleCancel}
        onPointerDown={handleOverlayPointerDown}
        ref={dialogRef}
      >
        <div className={styles.menuGrid}>
          <div className={styles.menuHeader}>
            <Link aria-label="larper home" className={styles.menuWordmark} data-menu-content href="/" onClick={closeMenu}>
              larper
            </Link>
            <button autoFocus aria-label="Close menu" className={styles.overlayClose} data-menu-content onClick={closeMenu} type="button">
              <X aria-hidden="true" size={25} weight="light" />
            </button>
          </div>

          <PrimaryNav onNavigate={closeMenu} />

          <div className={styles.appearance} data-menu-content>
            <ThemeSelector />
          </div>
        </div>
      </dialog>
    </>
  );
}
