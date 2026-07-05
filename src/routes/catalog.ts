import { Router } from 'express';
import {
  Category,
  SubCategory,
  SubService,
  SubServiceCityPrice,
} from '../models/index.js';

const router = Router();

/** Nested catalog: Category → SubCategory → Option groups → Services (with city prices) */
router.get('/with-prices', async (req, res) => {
  const cityId = req.query.cityId as string;
  if (!cityId) {
    res.status(400).json({ error: 'cityId required' });
    return;
  }

  const categories = await Category.find({ active: true }).sort({ sortOrder: 1 });
  const subCategories = await SubCategory.find({ active: true }).sort({ sortOrder: 1 });
  const subServices = await SubService.find({ active: true }).sort({ sortOrder: 1 });
  const prices = await SubServiceCityPrice.find({ cityId });
  const priceMap = new Map(prices.map((p) => [p.subServiceId.toString(), p.priceAed]));

  const result = categories.map((cat) => {
    const catSubCats = subCategories.filter((sc) => sc.categoryId.toString() === cat._id.toString());

    return {
      category: {
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        sortOrder: cat.sortOrder,
      },
      subCategories: catSubCats.map((sc) => {
        const services = subServices
          .filter(
            (s) =>
              s.categoryId.toString() === cat._id.toString() &&
              s.subCategoryId?.toString() === sc._id.toString()
          )
          .map((s) => ({
            _id: s._id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            imageUrl: s.imageUrl,
            durationMinutes: s.durationMinutes,
            optionGroup: s.optionGroup || '',
            optionGroupImage: s.optionGroupImage || '',
            sortOrder: s.sortOrder,
            priceAed: priceMap.get(s._id.toString()) ?? null,
          }));

        const groupMap = new Map<
          string,
          { name: string; imageUrl: string; services: typeof services }
        >();
        const ungrouped: typeof services = [];

        for (const svc of services) {
          if (svc.optionGroup) {
            const g = groupMap.get(svc.optionGroup) ?? {
              name: svc.optionGroup,
              imageUrl: svc.optionGroupImage || sc.imageUrl,
              services: [],
            };
            g.services.push(svc);
            groupMap.set(svc.optionGroup, g);
          } else {
            ungrouped.push(svc);
          }
        }

        const optionGroups = [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name));

        return {
          subCategory: {
            _id: sc._id,
            name: sc.name,
            slug: sc.slug,
            description: sc.description,
            imageUrl: sc.imageUrl,
            tagline: sc.tagline,
            sortOrder: sc.sortOrder,
          },
          optionGroups,
          services: ungrouped,
        };
      }),
    };
  });

  res.json(result);
});

export default router;
