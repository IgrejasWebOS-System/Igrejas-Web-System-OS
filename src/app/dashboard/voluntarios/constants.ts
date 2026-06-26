export const AREAS = ["MUSICA","RECEPCAO","MIDIA","INFANTIL","LIMPEZA","SEGURANCA","INTERCESSAO","OUTRO"] as const;
export const AREA_LABELS: Record<string, string> = {
  MUSICA:"🎵 Música", RECEPCAO:"🤝 Recepção", MIDIA:"📸 Mídia", INFANTIL:"👶 Infantil",
  LIMPEZA:"🧹 Limpeza", SEGURANCA:"🛡️ Segurança", INTERCESSAO:"🙏 Intercessão", OUTRO:"⚙️ Outro",
};
export const TURNOS = ["MANHA","TARDE","NOITE","INTEGRAL"] as const;
export const TURNO_LABELS: Record<string, string> = { MANHA:"Manhã", TARDE:"Tarde", NOITE:"Noite", INTEGRAL:"Integral" };
