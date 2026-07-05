import { Router } from 'express';
import {
  Category,
  SubCategory,
  SubService,
  SubServiceCityPrice,
  Emirate,
  City,
  Settings,
  ContentPage,
  TeamMember,
  Testimonial,
} from '../models/index.js';

const router = Router();

router.get('/categories', async (_req, res) => {
  const items = await Category.find().sort({ sortOrder: 1 });
  res.json(items);
});

router.post('/categories', async (req, res) => {
  const cat = await Category.create(req.body);
  res.status(201).json(cat);
});

router.patch('/categories/:id', async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(cat);
});

router.delete('/categories/:id', async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.get('/sub-categories', async (req, res) => {
  const categoryId = req.query.categoryId as string | undefined;
  const filter = categoryId ? { categoryId } : {};
  const items = await SubCategory.find(filter).sort({ sortOrder: 1 }).lean();
  res.json(
    items.map((item) => ({
      ...item,
      categoryId: String(item.categoryId),
    }))
  );
});

router.post('/sub-categories', async (req, res) => {
  const item = await SubCategory.create(req.body);
  res.status(201).json(item);
});

router.patch('/sub-categories/:id', async (req, res) => {
  const item = await SubCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

router.delete('/sub-categories/:id', async (req, res) => {
  await SubCategory.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.get('/sub-services', async (req, res) => {
  const categoryId = req.query.categoryId as string | undefined;
  const subCategoryId = req.query.subCategoryId as string | undefined;
  const filter: Record<string, string> = {};
  if (categoryId) filter.categoryId = categoryId;
  if (subCategoryId) filter.subCategoryId = subCategoryId;
  const items = await SubService.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  res.json(
    items.map((item) => ({
      ...item,
      categoryId: String(item.categoryId),
      subCategoryId: item.subCategoryId ? String(item.subCategoryId) : undefined,
    }))
  );
});

router.post('/sub-services', async (req, res) => {
  const item = await SubService.create(req.body);
  res.status(201).json(item);
});

router.patch('/sub-services/:id', async (req, res) => {
  const item = await SubService.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

router.delete('/sub-services/:id', async (req, res) => {
  await SubService.findByIdAndDelete(req.params.id);
  await SubServiceCityPrice.deleteMany({ subServiceId: req.params.id });
  res.json({ success: true });
});

router.get('/prices', async (req, res) => {
  const cityId = req.query.cityId as string | undefined;
  const filter = cityId ? { cityId } : {};
  const prices = await SubServiceCityPrice.find(filter);
  res.json(prices);
});

router.put('/prices', async (req, res) => {
  const { subServiceId, cityId, priceAed } = req.body;
  const price = await SubServiceCityPrice.findOneAndUpdate(
    { subServiceId, cityId },
    { priceAed },
    { upsert: true, new: true }
  );
  res.json(price);
});

router.get('/locations', async (_req, res) => {
  const emirates = await Emirate.find().sort({ name: 1 });
  const cities = await City.find().sort({ name: 1 });
  res.json({ emirates, cities });
});

router.post('/cities', async (req, res) => {
  const city = await City.create(req.body);
  res.status(201).json(city);
});

router.patch('/settings', async (req, res) => {
  const settings = await Settings.findOneAndUpdate({}, req.body, { upsert: true, new: true });
  res.json(settings);
});

router.get('/content-pages', async (_req, res) => {
  const pages = await ContentPage.find();
  res.json(pages);
});

router.patch('/content-pages/:slug', async (req, res) => {
  const page = await ContentPage.findOneAndUpdate(
    { slug: req.params.slug },
    req.body,
    { upsert: true, new: true }
  );
  res.json(page);
});

router.get('/team', async (_req, res) => {
  const team = await TeamMember.find().sort({ sortOrder: 1 });
  res.json(team);
});

router.post('/team', async (req, res) => {
  const member = await TeamMember.create(req.body);
  res.status(201).json(member);
});

router.patch('/team/:id', async (req, res) => {
  const member = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(member);
});

router.delete('/team/:id', async (req, res) => {
  await TeamMember.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.get('/testimonials', async (_req, res) => {
  const items = await Testimonial.find();
  res.json(items);
});

router.post('/testimonials', async (req, res) => {
  const item = await Testimonial.create(req.body);
  res.status(201).json(item);
});

router.delete('/testimonials/:id', async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
