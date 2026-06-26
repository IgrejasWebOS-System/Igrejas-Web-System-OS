import { NextResponse } from "next/server";

const openapi = {
  openapi: "3.0.3",
  info: { title: "Igrejas Web System API", version: "1.0.0", description: "API pública para integração com o sistema de gestão de igrejas." },
  servers: [{ url: "/api/v1", description: "Produção" }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
    schemas: {
      Membro: {
        type: "object",
        properties: {
          id:             { type: "string", format: "uuid" },
          full_name:      { type: "string" },
          email:          { type: "string", format: "email", nullable: true },
          telefone:       { type: "string", nullable: true },
          status:         { type: "string", enum: ["ATIVO","INATIVO","VISITANTE","TRANSFERIDO","FALECIDO"] },
          data_ingresso:  { type: "string", format: "date", nullable: true },
          created_at:     { type: "string", format: "date-time" },
        },
      },
      Evento: {
        type: "object",
        properties: {
          id:          { type: "string", format: "uuid" },
          titulo:      { type: "string" },
          descricao:   { type: "string", nullable: true },
          categoria:   { type: "string" },
          data_inicio: { type: "string", format: "date-time" },
          local:       { type: "string", nullable: true },
          vagas:       { type: "integer", nullable: true },
        },
      },
      ListResponse: {
        type: "object",
        properties: { data: { type: "array" }, count: { type: "integer" }, limit: { type: "integer" }, offset: { type: "integer" } },
      },
    },
  },
  paths: {
    "/membros": {
      get: {
        summary: "Listar membros",
        operationId: "listMembros",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "limit",  in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Lista de membros", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ListResponse" }, { properties: { data: { type: "array", items: { $ref: "#/components/schemas/Membro" } } } }] } } } } },
      },
    },
    "/eventos": {
      get: {
        summary: "Listar eventos públicos",
        operationId: "listEventos",
        parameters: [
          { name: "de",    in: "query", schema: { type: "string", format: "date" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: { "200": { description: "Lista de eventos", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ListResponse" }, { properties: { data: { type: "array", items: { $ref: "#/components/schemas/Evento" } } } }] } } } } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openapi);
}
