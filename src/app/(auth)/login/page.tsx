"use client";

import { useState, useRef } from "react";
import { loginAction } from "./actions";

// ─── Usuários de teste (somente DEV) ────────────────────────────────────────
// Todos os usuários *.igrejasweb.test têm senha: Senha1234@
// Criados pela migration 004_test_users.sql
const DEV_USERS = [
  // ── N0 ──────────────────────────────────────────────────────
  {
    label: "Super Master",
    desc:  "N0 · Acessa todos os ministérios",
    icon:  "👑",
    email: "admin@igrejasweb.os",
    pass:  "Admin@123456!",
    color: "#ef4444",
  },
  // ── N1 ──────────────────────────────────────────────────────
  {
    label: "Admin Campo · Piracicaba",
    desc:  "N1 · Vê tudo de Piracicaba",
    icon:  "🏛️",
    email: "piracicaba@igrejasweb.os",
    pass:  "Piracicaba@123!",
    color: "#f97316",
  },
  {
    label: "Admin Campo · São Paulo",
    desc:  "N1 · Vê tudo de São Paulo",
    icon:  "🏢",
    email: "saopaulo@igrejasweb.os",
    pass:  "SaoPaulo@123!",
    color: "#f97316",
  },
  // ── N2 ──────────────────────────────────────────────────────
  {
    label: "Admin Sede · Piracicaba",
    desc:  "N2 · Igreja Sede Piracicaba",
    icon:  "🏠",
    email: "userN2_01@igrejasweb.test",
    pass:  "Senha1234@",
    color: "#4A7DB5",
  },
  // ── N3 ──────────────────────────────────────────────────────
  {
    label: "Admin Setor 01 · Piracicaba",
    desc:  "N3 · Setor 01 — vê só o setor",
    icon:  "📍",
    email: "userN3_01@igrejasweb.test",
    pass:  "Senha1234@",
    color: "#22c55e",
  },
  {
    label: "Admin Setor · São Paulo",
    desc:  "N3 · SP — testa isolamento entre ministérios",
    icon:  "📍",
    email: "userN3_sp@igrejasweb.test",
    pass:  "Senha1234@",
    color: "#22c55e",
  },
  // ── N4 ──────────────────────────────────────────────────────
  {
    label: "Usuário Local · Vila Rezende",
    desc:  "N4 · Vê só a Igreja Vila Rezende",
    icon:  "👤",
    email: "userN4_01@igrejasweb.test",
    pass:  "Senha1234@",
    color: "#8b5cf6",
  },
];

export default function LoginPage() {
  const [email,   setEmail]   = useState(DEV_USERS[0].email);
  const [pass,    setPass]    = useState(DEV_USERS[0].pass);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  function selectUser(u: typeof DEV_USERS[0]) {
    setEmail(u.email);
    setPass(u.pass);
    setError("");
    setOpen(false);
    setTimeout(() => emailRef.current?.blur(), 50);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", pass);
    const result = await loginAction(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const activeUser = DEV_USERS.find(u => u.email === email);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "var(--color-primary)",
            borderRadius: "var(--radius-xl)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-md)",
            marginBottom: 16,
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>IW</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            IgrejasWeb System OS
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
            Entre com suas credenciais de acesso
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-md)",
          padding: "32px",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Email com dropdown DEV */}
            <div style={{ position: "relative" }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: "var(--color-text-primary)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 6,
              }}>
                E-mail
              </label>
              <input
                ref={emailRef}
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="seu@email.com"
                autoComplete="off"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: `1.5px solid ${open ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: open ? "var(--radius-md) var(--radius-md) 0 0" : "var(--radius-md)",
                  fontSize: 14,
                  color: "var(--color-text-primary)",
                  background: "var(--color-bg-2)",
                  outline: "none",
                  transition: "border-color .15s",
                  boxSizing: "border-box",
                }}
              />

              {/* Dropdown DEV */}
              {open && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0, right: 0,
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-primary)",
                  borderTop: "none",
                  borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  zIndex: 50,
                  overflow: "hidden",
                }}>
                  {/* header */}
                  <div style={{
                    padding: "6px 14px",
                    fontSize: 10, fontWeight: 700,
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background: "var(--color-bg-2)",
                    borderBottom: "1px solid var(--color-border)",
                  }}>
                    🛠 DEV · Acesso rápido
                  </div>
                  {DEV_USERS.map(u => (
                    <button
                      key={u.email}
                      type="button"
                      onMouseDown={() => selectUser(u)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: email === u.email ? `${u.color}10` : "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--color-border)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => { if (email !== u.email) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-bg-2)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = email === u.email ? `${u.color}10` : "transparent"; }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{u.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 1 }}>
                          {u.label}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{u.desc}</p>
                      </div>
                      {email === u.email && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: u.color }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Senha */}
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: "var(--color-text-primary)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 6,
              }}>
                Senha
              </label>
              <input
                name="password"
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onFocus={() => setOpen(false)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 14,
                  color: "var(--color-text-primary)",
                  background: "var(--color-bg-2)",
                  outline: "none",
                  transition: "border-color .15s",
                }}
                onMouseEnter={e => (e.target as HTMLInputElement).style.borderColor = "var(--color-primary)"}
                onMouseLeave={e => (e.target as HTMLInputElement).style.borderColor = "var(--color-border)"}
              />
            </div>

            {/* Badge do usuário selecionado */}
            {activeUser && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: `${activeUser.color}10`,
                border: `1px solid ${activeUser.color}40`,
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}>
                <span>{activeUser.icon}</span>
                <span style={{ fontWeight: 700, color: activeUser.color }}>{activeUser.label}</span>
                <span style={{ color: "var(--color-text-muted)" }}>·</span>
                <span style={{ color: "var(--color-text-muted)" }}>{activeUser.desc}</span>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div style={{
                background: "var(--color-danger-bg)",
                border: "1px solid #F1948A",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--color-danger)",
                fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "var(--color-primary-muted)" : "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background .15s",
                letterSpacing: "0.02em",
              }}
            >
              {loading ? "Autenticando..." : "Entrar no Sistema"}
            </button>

          </form>
        </div>

        {/* Rodapé */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--color-text-muted)" }}>
          IgrejasWeb System OS · Acesso Restrito
        </p>

      </div>
    </div>
  );
}
