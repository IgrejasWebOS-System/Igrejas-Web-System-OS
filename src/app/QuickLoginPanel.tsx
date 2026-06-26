"use client";

import { useState } from "react";
import { loginAction } from "./(auth)/login/actions";

const DEV_USERS = [
  { label: "Super Master",           desc: "N0 · Todos os ministérios", icon: "👑", email: "admin@igrejasweb.os",         pass: "Admin@123456!",    color: "#ef4444" },
  { label: "Admin Campo · Piracicaba", desc: "N1 · Piracicaba",         icon: "🏛️", email: "piracicaba@igrejasweb.os",    pass: "Piracicaba@123!", color: "#f97316" },
  { label: "Admin Campo · São Paulo",  desc: "N1 · São Paulo",          icon: "🏢", email: "saopaulo@igrejasweb.os",      pass: "SaoPaulo@123!",  color: "#f97316" },
  { label: "Admin Sede",              desc: "N2 · Igreja Sede",         icon: "🏠", email: "userN2_01@igrejasweb.test",   pass: "Senha1234@",     color: "#4A7DB5" },
  { label: "Admin Setor",             desc: "N3 · Setor 01",            icon: "📍", email: "userN3_01@igrejasweb.test",   pass: "Senha1234@",     color: "#22c55e" },
  { label: "Usuário Local",           desc: "N4 · Vila Rezende",        icon: "👤", email: "userN4_01@igrejasweb.test",   pass: "Senha1234@",     color: "#8b5cf6" },
];

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border)",
  fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-bg-2)",
  outline: "none", boxSizing: "border-box",
};

export default function QuickLoginPanel() {
  const [email,   setEmail]   = useState(DEV_USERS[0].email);
  const [pass,    setPass]    = useState(DEV_USERS[0].pass);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  const active = DEV_USERS.find(u => u.email === email);

  function pick(u: typeof DEV_USERS[0]) {
    setEmail(u.email);
    setPass(u.pass);
    setError("");
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", pass);
    const res = await loginAction(fd);
    if (res?.error) { setError(res.error); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* Badge do usuário selecionado */}
      {active && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 11px", marginBottom: 12,
          background: active.color + "12",
          border: `1px solid ${active.color}40`,
          borderRadius: 8, fontSize: 12,
        }}>
          <span style={{ fontSize: 16 }}>{active.icon}</span>
          <div>
            <span style={{ fontWeight: 700, color: active.color }}>{active.label}</span>
            <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>{active.desc}</span>
          </div>
        </div>
      )}

      {/* E-mail com dropdown */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          E-mail
        </label>
        <input
          type="email" value={email} required
          onChange={e => setEmail(e.target.value)}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          style={{ ...inp, borderColor: open ? "var(--color-primary)" : "var(--color-border)", borderRadius: open ? "8px 8px 0 0" : 8 }}
        />
        {open && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
            background: "var(--color-surface)",
            border: "1px solid var(--color-primary)", borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: "var(--shadow-md)", overflow: "hidden",
          }}>
            <div style={{ padding: "4px 12px", fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--color-bg-2)", borderBottom: "1px solid var(--color-border)" }}>
              🛠 DEV · Acesso rápido
            </div>
            {DEV_USERS.map(u => (
              <button
                key={u.email} type="button"
                onMouseDown={() => pick(u)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", border: "none", cursor: "pointer",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                  background: email === u.email ? u.color + "10" : "transparent",
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{u.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{u.label}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{u.desc}</div>
                </div>
                {email === u.email && <span style={{ fontSize: 11, fontWeight: 700, color: u.color }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Senha */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          Senha
        </label>
        <input
          type="password" value={pass} required
          onChange={e => setPass(e.target.value)}
          onFocus={() => setOpen(false)}
          style={inp}
        />
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: "var(--color-danger-bg)", border: "1px solid #F1948A", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--color-danger)", fontWeight: 600, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {/* Botão */}
      <button
        type="submit" disabled={loading}
        onClick={() => setOpen(false)}
        style={{
          width: "100%", padding: "10px", borderRadius: 8,
          background: loading ? "var(--color-primary-muted)" : "var(--color-primary)",
          color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Autenticando..." : "Entrar no Sistema →"}
      </button>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <a href="/login" style={{ fontSize: 11, color: "var(--color-text-muted)", textDecoration: "none" }}>
          Tela de login completa →
        </a>
      </div>
    </form>
  );
}
