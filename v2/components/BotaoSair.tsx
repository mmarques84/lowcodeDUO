"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      disabled={saindo}
      className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-3 disabled:opacity-60"
    >
      {saindo ? "Saindo..." : "Sair"}
    </button>
  );
}
