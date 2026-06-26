import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET — Meta Webhook verification
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // TODO: verificar token contra whatsapp_sessions.verify_token
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "change_me";
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST — Receber mensagens do Meta
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb   = await createClient();

  try {
    // Iterar sobre entradas do webhook
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (change.field !== "messages") continue;

        for (const msg of value.messages ?? []) {
          // Buscar session pelo phone_number_id
          const { data: session } = await sb
            .from("whatsapp_sessions")
            .select("id, ministry_id")
            .eq("phone_number_id", value.metadata?.phone_number_id)
            .single();

          if (!session) continue;

          await sb.from("whatsapp_messages").insert({
            ministry_id: session.ministry_id,
            session_id:  session.id,
            telefone:    msg.from,
            direcao:     "ENTRADA",
            tipo:        msg.type === "text" ? "TEXTO" : "MIDIA",
            conteudo:    msg.text?.body ?? null,
            status:      "ENTREGUE",
            whatsapp_id: msg.id,
          });
        }
      }
    }
  } catch (e) {
    console.error("[WhatsApp Webhook]", e);
  }

  return NextResponse.json({ ok: true });
}
