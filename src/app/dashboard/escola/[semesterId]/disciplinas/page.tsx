import { redirect } from "next/navigation";

// Este segmento existe apenas para que o Next.js reconheça "disciplinas" como
// rota estática dentro de [semesterId], evitando conflito com o parâmetro dinâmico.
// Acesso direto à lista de disciplinas é feito pela página do semestre.
export default function DisciplinasIndexPage() {
  redirect("/dashboard/escola");
}
