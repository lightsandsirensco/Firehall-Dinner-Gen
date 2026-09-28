/**
 * Minimal allowlist HTML sanitizer for Shop product descriptions.
 *
 * The admin never types or sees raw HTML — client/src/components/shop/
 * simple-rich-text-editor.tsx is a toolbar-driven contentEditable box
 * (Bold / Bullet list only) that happens to serialize as HTML under the
 * hood. This is the server-side backstop: whatever comes in, only a tiny
 * allowlist of block/inline tags survives, with every attribute stripped
 * (no href/style/on* handlers), before it's stored and later rendered on
 * the public storefront. Regex-based on purpose — no DOMPurify/jsdom
 * dependency for such a narrow, admin-authored surface.
 */
const ALLOWED_TAGS = new Set(["p", "div", "b", "strong", "ul", "ol", "li", "br"]);

export function sanitizeShopDescriptionHtml(input: string): string {
  if (!input) return "";

  // Drop script/style blocks (and their content) and HTML comments entirely.
  let out = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Strip every tag that isn't on the allowlist, and strip all attributes
  // from tags that are (so href/onclick/style/class/etc. never survive).
  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const isClosing = match.startsWith("</");
    const selfClosing = tag === "br";
    if (isClosing) return selfClosing ? "" : `</${tag}>`;
    void attrs; // intentionally discarded — no attributes ever pass through
    return selfClosing ? "<br>" : `<${tag}>`;
  });

  return out.trim().slice(0, 8000);
}
