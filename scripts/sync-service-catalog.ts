import 'dotenv/config';
import mongoose from 'mongoose';
import { Category, SubCategory, SubService, SubServiceCityPrice, City } from '../src/models/index.js';
import { categoryImageForSlug } from './service-images.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');

  const catalogMod = await import('../../client/src/lib/serviceCatalog.ts');
  const detailsMod = await import('../../client/src/lib/variantServiceDetails.ts');
  const svcDetailsMod = await import('../../client/src/lib/serviceDetails.ts');
  const arMod = await import('../../client/src/i18n/catalogAr.ts');
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

    const nameAr = arMod.resolveCategoryAr(slug, catDef.name);
    const description = `Professional ${catDef.name.toLowerCase()} services.`;
    const descriptionAr = `خدمات ${nameAr} احترافية.`;

    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.create({
        name: catDef.name,
        nameAr,
        slug,
        description,
        descriptionAr,
        imageUrl: categoryImageForSlug(slug) || '',
        sortOrder: categorySlugs.indexOf(slug) + 1,
        active: true,
      });
      console.log(`Created category: ${cat.name}`);
    } else {
      cat.name = catDef.name;
      cat.nameAr = nameAr;
      cat.description = description;
      cat.descriptionAr = descriptionAr;
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
    console.log(
      `Deactivated ${staleCategories.modifiedCount} obsolete categor${staleCategories.modifiedCount === 1 ? 'y' : 'ies'}.`
    );
  }

  const subCatIdByKey = new Map<string, mongoose.Types.ObjectId>();

  for (const def of subCatDefs) {
    const cat = await Category.findOne({ slug: def.categorySlug });
    if (!cat) continue;

    const famAr = arMod.resolveFamilyAr(def.slug, def.name, def.tagline);
    const description = `Professional ${def.name.toLowerCase()} services.`;
    const descriptionAr = famAr.cardDesc || `خدمات ${famAr.name} احترافية.`;

    let subCat = await SubCategory.findOne({ categoryId: cat._id, slug: def.slug });
    if (!subCat) {
      subCat = await SubCategory.create({
        categoryId: cat._id,
        name: def.name,
        nameAr: famAr.name,
        slug: def.slug,
        description,
        descriptionAr,
        imageUrl: def.image,
        tagline: def.tagline || '',
        taglineAr: famAr.tagline || '',
        sortOrder: def.sortOrder,
        active: true,
      });
      console.log(`Created sub-category: ${cat.slug} / ${subCat.name}`);
    } else {
      subCat.name = def.name;
      subCat.nameAr = famAr.name;
      subCat.description = description;
      subCat.descriptionAr = descriptionAr;
      subCat.imageUrl = def.image;
      subCat.tagline = def.tagline || '';
      subCat.taglineAr = famAr.tagline || '';
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
    const familyDetails = svcDetailsMod.getServiceDetails(item.subCategorySlug, item.subCategoryName);
    const description =
      detailsMod.getJustlifeCardDescription(
        item.slug,
        item.name,
        familyDetails.tagline || familyDetails.headline
      ) || `Professional ${item.name}`;
    const ar = arMod.resolveServiceAr(
      item.slug,
      item.name,
      description,
      item.subCategorySlug
    );
    const optionGroupAr = arMod.resolveOptionGroupAr(item.optionGroup || '');

    const payload = {
      name: item.name,
      nameAr: ar.name,
      description,
      descriptionAr: ar.description,
      optionGroup: item.optionGroup || '',
      optionGroupAr,
      optionGroupImage: item.optionGroupImage || '',
      durationMinutes: item.durationMinutes,
      sortOrder: item.sortOrder,
      originalPriceAed: item.originalPriceAed ?? null,
      pricedByHour: Boolean(item.pricedByHour),
      allowsQuantity: Boolean(item.allowsQuantity),
      subCategoryId: subCatId,
      imageUrl: imageUrl || undefined,
      active: true,
      steps: [
        {
          title: 'Inspection',
          titleAr: 'فحص',
          description: 'We assess the area and requirements.',
          descriptionAr: 'نقيّم المنطقة والمتطلبات.',
          order: 1,
        },
        {
          title: 'Service',
          titleAr: 'تنفيذ الخدمة',
          description: 'Our team performs the service using professional tools.',
          descriptionAr: 'ينفّذ فريقنا الخدمة بأدوات احترافية.',
          order: 2,
        },
        {
          title: 'Final check',
          titleAr: 'فحص نهائي',
          description: 'Quality check and customer walkthrough.',
          descriptionAr: 'فحص جودة وجولة مع العميل.',
          order: 3,
        },
      ],
    };

    if (!sub) {
      sub = await SubService.create({
        categoryId: cat._id,
        slug: item.slug,
        youtubeUrl: '',
        imageUrl: imageUrl || '',
        ...payload,
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
      Object.assign(sub, payload);
      if (imageUrl) sub.imageUrl = imageUrl;
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
