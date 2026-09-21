"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAviso } from "@/components/aviso/AvisoProvider";

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { aviso } = useAviso();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      aviso("Informe e-mail e senha para entrar.", "error", "Campos obrigatórios");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        aviso(data.erro ?? "E-mail ou senha inválidos.", "error", "Login não autorizado");
        return;
      }
      const proximo = searchParams.get("proximo") ?? "/";
      router.replace(proximo);
      router.refresh();
    } catch {
      aviso("Não consegui falar com o servidor. Tente novamente.", "error", "Falha de conexão");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-muted">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="voce@empresa.com"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-muted">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>
      <button
        type="submit"
        disabled={carregando}
        className="mt-1 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {carregando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function PaginaLogin() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: "radial-gradient(600px 260px at 50% -10%, var(--accent-soft), transparent)",
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow-elevated)]">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            L
          </div>
          <span className="text-[15px] font-semibold">lowcodeDUO</span>
        </div>

        <Suspense fallback={<div className="h-[164px]" />}>
          <FormularioLogin />
        </Suspense>

        <p className="mt-4 text-center text-xs text-text-faint">
          Sessão protegida por cookie httpOnly — sobrevive a F5 sem piscar pro login.
        </p>
      </div>
    </main>
  );
}
