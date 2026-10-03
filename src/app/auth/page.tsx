import { getAuthProviders } from "@/backend/accounts/providers";
import { Suspense } from "react";
import { safeNextPath } from "@/backend/accounts/redirect";
import { AuthForm } from "./auth-form";
import styles from "./page.module.css";

async function AuthContent({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const values = await searchParams;
  const providers = await getAuthProviders();
  return <AuthForm next={safeNextPath(values.next)} error={values.error} providers={providers} />;
}

export default function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return <main id="main-content" className={styles.main}><Suspense fallback={<p>Opening account access…</p>}><AuthContent searchParams={searchParams} /></Suspense></main>;
}
