"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border-t-4 border-brand bg-white p-8 shadow-[0_24px_70px_rgba(20,20,25,0.14)]"
      >
        <div className="mb-2 flex justify-center">
          <Logo size={46} />
        </div>
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-ink">MERIK</h1>
        <p className="mb-6 text-center text-sm text-muted">Workforce Suite</p>

        <div className="space-y-3">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-brand-dark">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-5 w-full">
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
