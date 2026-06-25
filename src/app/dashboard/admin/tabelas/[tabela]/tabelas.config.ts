// Arquivo sem "use server" — pode exportar objetos normalmente
export type TabelaKey = "cargos" | "funcoes" | "departamentos";

export type TabelaConfig = {
  dbTable:  string;
  label:    string;
  temOrdem: boolean;
  temSigla: boolean;
};

export const TABELAS_CONFIG: Record<TabelaKey, TabelaConfig> = {
  cargos:        { dbTable: "member_cargos",         label: "Títulos Eclesiásticos", temOrdem: true,  temSigla: false },
  funcoes:       { dbTable: "member_funcoes_lookup",  label: "Funções",               temOrdem: false, temSigla: false },
  departamentos: { dbTable: "departments",            label: "Departamentos",         temOrdem: false, temSigla: true  },
};
