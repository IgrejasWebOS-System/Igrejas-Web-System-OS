/**
 * sanitize-server.ts — Sanitização server-side (Node.js only)
 * Importado APENAS por Route Handlers e Server Components.
 * NUNCA importe este arquivo em Client Components.
 */

const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span", "section",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "img", "a",
];

const ALLOWED_ATTR = [
  "style", "class", "id",
  "src", "alt", "width", "height",
  "href", "target", "rel",
  "colspan", "rowspan",
  "align", "valign",
];

export async function sanitizeHtmlServer(dirty: string): Promise<string> {
  const { JSDOM } = await import("jsdom");
  const DOMPurify = (await import("dompurify")).default;
  const window = new JSDOM("").window as unknown as Window;
  const purify = DOMPurify(window);
  return purify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR, FORCE_BODY: true });
}
