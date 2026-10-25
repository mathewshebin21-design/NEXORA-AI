"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/app/AuthLayout";
import { Btn, Field, Notice, inputCls } from "@/components/app/forms";
import { ApiError, api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/app";
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api<Me>("/auth/login", { method: "POST", json: { email, password } });
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Work email" htmlFor="email">
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </Field>
      <Btn type="submit" busy={busy} className="w-full py-2.5">Sign in</Btn>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout title="Sign in" subtitle="Welcome back to your agency workspace." footer={<>New to Nexora? <Link href="/signup" className="text-electric-soft hover:underline">Create an account</Link></>}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
