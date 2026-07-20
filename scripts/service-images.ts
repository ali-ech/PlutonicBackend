/** Local image paths synced from client/public/assets — used when updating MongoDB */
import { CATEGORY_IMAGES, CATALOG_IMAGES } from '../../client/src/lib/serviceCatalog.ts';

export const localCategoryImages: Record<string, string> = {
  'furniture-cleaning': CATEGORY_IMAGES['furniture-cleaning'],
  'home-cleaning': CATEGORY_IMAGES['home-cleaning'],
  'birds-control': CATEGORY_IMAGES['birds-control'],
  'pest-control': CATEGORY_IMAGES['pest-control'],
  painting: CATEGORY_IMAGES.painting,
  'water-tank-cleaning': CATEGORY_IMAGES['water-tank-cleaning'],
  'ac-cleaning-repair': CATEGORY_IMAGES['ac-cleaning-repair'],
  'handyman-maintenance': CATEGORY_IMAGES['handyman-maintenance'],
  'hourly-home-cleaning': CATEGORY_IMAGES['hourly-home-cleaning'],
};

export const localServiceImages: Record<string, string> = {
  // Sub-category family images map to service slugs via sync; key common slugs here
  'sofa-single-seat': CATALOG_IMAGES.sofa,
  'sofa-3-seater': CATALOG_IMAGES.sofa,
  'carpet-small': CATALOG_IMAGES.carpet,
  'deep-cleaning': CATALOG_IMAGES.deepClean,
  'move-in-out': CATALOG_IMAGES.moveIn,
  'bird-netting-metal': CATALOG_IMAGES.birdNet,
  'bird-spikes': CATALOG_IMAGES.birdSpike,
  'cockroaches-apartment-1br': CATALOG_IMAGES.cockroaches,
  'general-pest-apartment-1br': CATALOG_IMAGES.pest,
  'disinfection-apartment-1br': CATALOG_IMAGES.disinfection,
  'off-white-apartment-studio': CATALOG_IMAGES.paintingWhite,
  'color-painting-apartment-studio': CATALOG_IMAGES.paintingColor,
  'water-damage-bedroom': CATALOG_IMAGES.waterDamage,
  'water-tank-underground': CATALOG_IMAGES.waterTank,
  'ac-bestseller-basic-1': CATALOG_IMAGES.acCleaning,
  'ac-deep-1': CATALOG_IMAGES.acCleaning,
  'ac-full-1': CATALOG_IMAGES.acCleaning,
  'ac-hourly-technician': CATALOG_IMAGES.acCleaning,
  'duct-central-basic-1': CATALOG_IMAGES.acCleaning,
  'ac-bundle-deep-filter-duct': CATALOG_IMAGES.combo,
  'ac-split-cleaning': CATALOG_IMAGES.acCleaning,
  'ac-coil-1': CATALOG_IMAGES.acCleaning,
  'hm-hourly-handyman': CATALOG_IMAGES.handyman,
  'hm-handyman-90min': CATALOG_IMAGES.handyman,
  'hm-electrician-90min': CATALOG_IMAGES.electrician,
  'hm-plumber-90min': CATALOG_IMAGES.plumber,
};

export function serviceImageForSlug(slug: string): string {
  return localServiceImages[slug] || '';
}

export function categoryImageForSlug(slug: string): string {
  return localCategoryImages[slug] || '';
}
