/** Optional local image overrides. Keep empty unless files exist in client/public/assets. */

export const localCategoryImages: Record<string, string> = {};

export const localServiceImages: Record<string, string> = {};

export function serviceImageForSlug(slug: string): string {
  return localServiceImages[slug] || '';
}

export function categoryImageForSlug(slug: string): string {
  return localCategoryImages[slug] || '';
}
