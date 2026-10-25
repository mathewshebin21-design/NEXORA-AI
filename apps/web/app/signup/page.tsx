"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/app/AuthLayout";
import { Btn, Field, Notice, inputCls } from "@/components/app/forms";
import { ApiError, api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", org_name: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api<Me>("/auth/signup", { method: "POST", json: form });
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your agency" subtitle="You’ll start with a demo client workspace of synthetic data." footer={<>Already have an account? <Link href="/login" className="text-electric-soft hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Your name" htmlFor="name"><input id="name" autoComplete="name" required value={form.name} onChange={set("name")} className={inputCls} /></Field>
        <Field label="Work email" htmlFor="email"><input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} className={inputCls} /></Field>
        <Field label="Agency / organisation name" htmlFor="org"><input id="org" autoComplete="organization" required value={form.org_name} onChange={set("org_name")} className={inputCls} /></Field>
        <Field label="Password" htmlFor="password" hint="At least 12 characters. A passphrase works well.">
          <input id="password" type="password" autoComplete="new-password" required minLength={12} value={form.password} onChange={set("password")} className={inputCls} />
        </Field>
        <Btn type="submit" busy={busy} className="w-full py-2.5">Create account</Btn>
        <p className="text-[11px] text-mist">By continuing you create an organisation where you are the owner. Email verification and SSO arrive in a later phase.</p>
      </form>
    </AuthLayout>
  );
}
