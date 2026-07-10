import 'dotenv/config';
import mongoose from 'mongoose';
import { Category, SubCategory, SubService, SubServiceCityPrice, City } from '../src/models/index.js';
import { categoryImageForSlug } from './service-images.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');

  const catalogMod = await import('../../client/src/lib/serviceCatalog.ts');
  const items = catalogMod.flattenCatalog();
  const subCatDefs = catalogMod.flattenSubCategories();

  await mongoose.connect(uri);
  console.log(`Syncing ${subCatDefs.length} sub-categories and ${items.length} services…`);

  const cities = await City.find();
  const categorySlugs = [...new Set(items.map((i) => i.categorySlug))];
  const catalogSlugs = new Set(items.map((i) => i.slug));
  const catalogSubCatKeys = new Set(subCatDefs.map((s) => `${s.categorySlug}::${s.slug}`));

  for (const slug of categorySlugs) {
    const catDef = catalogMod.SERVICE_CATALOG.find((c) => c.slug === slug);
    if (!catDef) continue;

    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.create({
        name: catDef.name,
        slug,
        description: `Professional ${catDef.name.toLowerCase()} services.`,
        imageUrl: categoryImageForSlug(slug) || '',
        sortOrder: categorySlugs.indexOf(slug) + 1,
        active: true,
      });
      console.log(`Created category: ${cat.name}`);
    } else {
      cat.name = catDef.name;
      cat.imageUrl = categoryImageForSlug(slug) || cat.imageUrl;
      cat.active = true;
      cat.sortOrder = categorySlugs.indexOf(slug) + 1;
      await cat.save();
    }
  }

  const staleCategories = await Category.updateMany(
    { slug: { $nin: categorySlugs }, active: true },
    { $set: { active: false } }
  );
  if (staleCategories.modifiedCount > 0) {
    console.log(`Deactivated ${staleCategories.modifiedCount} obsolete categor${staleCategories.modifiedCount === 1 ? 'y' : 'ies'}.`);
  }

  const subCatIdByKey = new Map<string, mongoose.Types.ObjectId>();

  for (const def of subCatDefs) {
    const cat = await Category.findOne({ slug: def.categorySlug });
    if (!cat) continue;

    let subCat = await SubCategory.findOne({ categoryId: cat._id, slug: def.slug });
    if (!subCat) {
      subCat = await SubCategory.create({
        categoryId: cat._id,
        name: def.name,
        slug: def.slug,
        description: `Professional ${def.name.toLowerCase()} services.`,
        imageUrl: def.image,
        tagline: def.tagline || '',
        sortOrder: def.sortOrder,
        active: true,
      });
      console.log(`Created sub-category: ${cat.slug} / ${subCat.name}`);
    } else {
      subCat.name = def.name;
      subCat.imageUrl = def.image;
      subCat.tagline = def.tagline || '';
      subCat.sortOrder = def.sortOrder;
      subCat.active = true;
      await subCat.save();
    }
    subCatIdByKey.set(`${def.categorySlug}::${def.slug}`, subCat._id);
  }

  const allSubCats = await SubCategory.find({ active: true });
  for (const sc of allSubCats) {
    const cat = await Category.findById(sc.categoryId);
    if (!cat) continue;
    const key = `${cat.slug}::${sc.slug}`;
    if (!catalogSubCatKeys.has(key)) {
      sc.active = false;
      await sc.save();
    }
  }

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const cat = await Category.findOne({ slug: item.categorySlug });
    if (!cat) continue;

    const subCatId = subCatIdByKey.get(`${item.categorySlug}::${item.subCategorySlug}`);
    const imageUrl = catalogMod.getCatalogImageForSlug(item.slug) || '';

    let sub = await SubService.findOne({ categoryId: cat._id, slug: item.slug });
    if (!sub) {
      sub = await SubService.create({
        categoryId: cat._id,
        subCategoryId: subCatId,
        name: item.name,
        slug: item.slug,
        description: `Professional ${item.name} — trained team, quality equipment.`,
        imageUrl,
        durationMinutes: item.durationMinutes,
        optionGroup: item.optionGroup || '',
        optionGroupImage: item.optionGroupImage || '',
        sortOrder: item.sortOrder,
        youtubeUrl: '',
        steps: [
          { title: 'Inspection', description: 'We assess the area and requirements.', order: 1 },
          { title: 'Service', description: 'Our team performs the service using professional tools.', order: 2 },
          { title: 'Final check', description: 'Quality check and customer walkthrough.', order: 3 },
        ],
        active: true,
      });
      created++;

      const seedPrice = item.priceAed ?? 79 + Math.floor(Math.random() * 320);
      for (const city of cities) {
        await SubServiceCityPrice.findOneAndUpdate(
          { subServiceId: sub._id, cityId: city._id },
          { priceAed: seedPrice },
          { upsert: true }
        );
      }
    } else {
      sub.name = item.name;
      sub.subCategoryId = subCatId;
      sub.durationMinutes = item.durationMinutes;
      sub.imageUrl = imageUrl || sub.imageUrl;
      sub.optionGroup = item.optionGroup || '';
      sub.optionGroupImage = item.optionGroupImage || '';
      sub.sortOrder = item.sortOrder;
      sub.active = true;
      await sub.save();
      updated++;

      if (item.priceAed != null) {
        for (const city of cities) {
          await SubServiceCityPrice.findOneAndUpdate(
            { subServiceId: sub._id, cityId: city._id },
            { priceAed: item.priceAed },
            { upsert: true }
          );
        }
      }
    }
  }

  const deactivated = await SubService.updateMany(
    { slug: { $nin: [...catalogSlugs] }, active: true },
    { $set: { active: false } }
  );

  console.log(
    `Done. Sub-categories: ${subCatDefs.length}, services created ${created}, updated ${updated}, deactivated ${deactivated.modifiedCount}.`
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
