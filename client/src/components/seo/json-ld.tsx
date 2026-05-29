/** Inline JSON-LD for static SSR-adjacent blocks (prefer usePageSeo for route-level schema). */

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
