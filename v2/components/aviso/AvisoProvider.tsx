"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type TipoAviso = "info" | "success" | "error";

type EstadoModal = {
  aberto: boolean;
  tipo: TipoAviso;
  titulo: string;
  mensagem: string;
  textoOk: string;
  mostrarCancelar: boolean;
  onConfirmar?: () => void;
};

type ContextoAviso = {
  aviso: (mensagem: string, tipo?: TipoAviso, titulo?: string) => void;
  confirmar: (
    mensagem: string,
    titulo: string,
    onConfirmar: () => void,
    textoOk?: string
  ) => void;
};

const ESTADO_INICIAL: EstadoModal = {
  aberto: false,
  tipo: "info",
  titulo: "",
  mensagem: "",
  textoOk: "OK",
  mostrarCancelar: false,
};

const Contexto = createContext<ContextoAviso | null>(null);

const ICONE: Record<TipoAviso, string> = { info: "i", success: "✓", error: "!" };
const CLASSE_ICONE: Record<TipoAviso, string> = {
  info: "bg-accent-soft text-accent",
  success: "bg-live-soft text-live",
  error: "bg-danger-soft text-danger",
};

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoModal>(ESTADO_INICIAL);

  const fechar = useCallback(() => setEstado(ESTADO_INICIAL), []);

  const aviso = useCallback<ContextoAviso["aviso"]>((mensagem, tipo = "info", titulo) => {
    setEstado({
      aberto: true,
      tipo,
      titulo: titulo ?? (tipo === "error" ? "Erro" : tipo === "success" ? "Sucesso" : "Aviso"),
      mensagem,
      textoOk: "OK",
      mostrarCancelar: false,
    });
  }, []);

  const confirmar = useCallback<ContextoAviso["confirmar"]>(
    (mensagem, titulo, onConfirmar, textoOk = "Confirmar") => {
      setEstado({
        aberto: true,
        tipo: "error",
        titulo,
        mensagem,
        textoOk,
        mostrarCancelar: true,
        onConfirmar,
      });
    },
    []
  );

  return (
    <Contexto.Provider value={{ aviso, confirmar }}>
      {children}
      {estado.aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,21,28,0.38)] p-4"
          onClick={fechar}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${CLASSE_ICONE[estado.tipo]}`}
            >
              {ICONE[estado.tipo]}
            </div>
            <h3 className="mb-2 text-xl font-semibold">{estado.titulo}</h3>
            <p className="mb-6 text-[15px] leading-relaxed text-text-muted">{estado.mensagem}</p>
            <div className="flex justify-center gap-2">
              {estado.mostrarCancelar && (
                <button
                  onClick={fechar}
                  className="min-w-[110px] rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-[15px] font-semibold text-text hover:bg-surface-3"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  const cb = estado.onConfirmar;
                  fechar();
                  cb?.();
                }}
                className="min-w-[110px] rounded-lg bg-accent px-4 py-2.5 text-[15px] font-semibold text-white hover:brightness-110"
              >
                {estado.textoOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </Contexto.Provider>
  );
}

export function useAviso(): ContextoAviso {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useAviso precisa estar dentro de <AvisoProvider>");
  return ctx;
}
