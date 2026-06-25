"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprovarPreCadastroAction, cancelarPreCadastroAction } from "../actions";

type Props = { id: string; nome: string };

export default function AprovarCancelarButtons({ id, nome }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<"aprovar" | "cancelar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const result = modal === "aprovar"
        ? await aprovarPreCadastroAction(id)
        : await cancelarPreCadastroAction(id, motivo);
      if (result.error) { setError(result.error); return; }
      setModal(null);
      router.push("/dashboard/secretaria/pre-cadastros");
    });
  }

  return (
    <>
      <div style={{
        display: "flex", gap: 10,
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "16px 20px",
      }}>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)", flex: 1, alignSelf: "center" }}>
          Pré-cadastro pendente — aguardando aprovação
        </span>
        <button onClick={() => setModal("cancelar")} style={{
          padding: "9px 16px", borderRadius: 8, border: "1px solid #fca5a5",
          background: "#fef2f2", color: "#dc2626",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          Cancelar
        </button>
        <button onClick={() => setModal("aprovar")} style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          background: "#16a34a", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          Aprovar e criar membro
        </button>
      </div>

      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px",
            width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>
              {modal === "aprovar" ? "Confirmar aprovação" : "Cancelar pré-cadastro"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 14 }}>
              {modal === "aprovar"
                ? <><strong>{nome}</strong> será criado como membro ativo. Você poderá completar os dados na ficha do membro.</>
                : <>Cancelar o pré-cadastro de <strong>{nome}</strong>?</>
              }
            </p>
            {modal === "cancelar" && (
              <textarea
                value={motivo} onChange={e => setMotivo(e.target.value)}
                rows={2} placeholder="Motivo (opcional)"
                style={{
                  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, outline: "none",
                  background: "var(--color-bg)", marginBottom: 12, boxSizing: "border-box",
                }}
              />
            )}
            {error && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setModal(null); setError(null); }} style={{
                padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-border)",
                background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Voltar
              </button>
              <button onClick={confirmar} disabled={pending} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: modal === "aprovar" ? "#16a34a" : "#dc2626",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending ? 0.6 : 1,
              }}>
                {pending ? "Aguarde…" : modal === "aprovar" ? "Confirmar" : "Cancelar cadastro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
