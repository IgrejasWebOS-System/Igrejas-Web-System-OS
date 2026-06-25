/**
 * sanitize.ts — Sanitização client-side (browser only)
 * Importado por Client Components. Não importa jsdom nem módulos Node.js.
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

let _purify: typeof import("dompurify").default | null = null;

async function getPurify() {
  if (typeof window === "undefined") return null;
  if (_purify) return _purify;
  _purify = (await import("dompurify")).default;
  return _purify;
}

export async function sanitizeHtmlClient(dirty: string): Promise<string> {
  const DOMPurify = await getPurify();
  if (!DOMPurify) return dirty;
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR, FORCE_BODY: true });
}
