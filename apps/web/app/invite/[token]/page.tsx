"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/app/AuthLayout";
import { Btn, Field, Notice, Spinner, inputCls } from "@/components/app/forms";
import { ApiError, api } from "@/lib/api/client";
import type { InvitationLookup, Me } from "@/lib/api/types";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InvitationLookup | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<InvitationLookup>(`/invitations/lookup?token=${encodeURIComponent(token)}`).then(setInvite).catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load invitation."));
    api<Me>("/auth/me").then(setMe).catch(() => setMe(null));
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/invitations/accept", { method: "POST", json: me ? { token } : { token, ...form } });
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not accept the invitation.");
      setBusy(false);
    }
  };

  const signedInAsOther = me && invite && me.user.email.toLowerCase() !== invite.email.toLowerCase();

  return (
    <AuthLayout title={invite ? `Join ${invite.org_name}` : "Invitation"} subtitle={invite ? `Invited as ${invite.org_role} · ${invite.email}` : undefined}>
      {loadError ? (
        <Notice tone="error">{loadError} <Link className="underline" href="/login">Go to sign in</Link></Notice>
      ) : !invite || me === undefined ? (
        <Spinner />
      ) : invite.status !== "pending" ? (
        <Notice tone="warn">This invitation is {invite.status}. Ask an admin to send a new one.</Notice>
      ) : signedInAsOther ? (
        <Notice tone="warn">You’re signed in as {me!.user.email}, but this invitation is for {invite.email}. Sign out and open the link again.</Notice>
      ) : (
        <form onSubmit={accept} className="space-y-4" noValidate>
          {error && <Notice tone="error">{error}</Notice>}
          {me ? (
            <p className="text-sm text-mist">Signed in as <span className="text-white">{me.user.email}</span>.</p>
          ) : (
            <>
              <Field label="Your name" htmlFor="name"><input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
              <Field label="Choose a password" htmlFor="password" hint="At least 12 characters."><input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} /></Field>
              <p className="text-[11px] text-mist">Already have an account? <Link href={`/login?next=/invite/${token}`} className="text-electric-soft hover:underline">Sign in first</Link>.</p>
            </>
          )}
          <Btn type="submit" busy={busy} className="w-full py-2.5">Accept invitation</Btn>
        </form>
      )}
    </AuthLayout>
  );
}
