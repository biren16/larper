"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel: string;
  intentField?: string;
  intentValue?: string;
};

export function PendingButton({ children, pendingLabel, intentField = "intent", intentValue, disabled, ...props }: PendingButtonProps) {
  const status = useFormStatus();
  const isActiveIntent = status.pending && (!intentValue || status.data?.get(intentField) === intentValue);

  return (
    <button {...props} disabled={disabled || status.pending} aria-busy={isActiveIntent || undefined}>
      {isActiveIntent ? pendingLabel : children}
    </button>
  );
}
