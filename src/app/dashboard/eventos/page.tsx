import { listarEventosAction } from "./actions";
import EventosClient from "./EventosClient";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const eventos = await listarEventosAction().catch(() => []);
  return <EventosClient eventos={eventos} />;
}
