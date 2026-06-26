export const CANAIS = ["EMAIL","WHATSAPP","SMS","PUSH"] as const;
export const CANAL_LABELS: Record<string, string> = { EMAIL:"📧 E-mail", WHATSAPP:"💬 WhatsApp", SMS:"📱 SMS", PUSH:"🔔 Push" };
export const SEGMENTOS = ["TODOS","ATIVOS","ANIVERSARIANTES_MES","VISITANTES"] as const;
export const SEGMENTO_LABELS: Record<string, string> = { TODOS:"Todos os membros", ATIVOS:"Somente ativos", ANIVERSARIANTES_MES:"Aniversariantes do mês", VISITANTES:"Visitantes" };
