/** HD image paths for categories and sub-services (served from client/public) */

export const localCategoryImages: Record<string, string> = {
  cleaning: '/assets/categories/cleaning.png',
  'birds-control': '/assets/categories/birds-control.png',
  'pets-control': '/assets/categories/pets-control.png',
};

export const localServiceImages: Record<string, string> = {
  'deep-cleaning': '/assets/services/deep-cleaning.png',
  'sofa-cleaning': '/assets/services/sofa-cleaning.png',
  'carpet-cleaning': '/assets/services/carpet-cleaning.png',
  'move-in-out': '/assets/services/move-in-out.png',
  'bird-netting': '/assets/services/bird-netting.png',
  'pigeon-control': '/assets/services/pigeon-control.png',
  'pest-control': '/assets/services/pest-control.png',
  'rodent-control': '/assets/services/rodent-control.png',
};

export function serviceImageForSlug(slug: string): string {
  return localServiceImages[slug] || '';
}

export function categoryImageForSlug(slug: string): string {
  return localCategoryImages[slug] || '';
}
