export function editorialIndexPath(): string {
  return "/content/guides/index.json";
}

export function editorialPagePath(slug: string): string {
  return `/content/guides/pages/${encodeURIComponent(slug)}.json`;
}
