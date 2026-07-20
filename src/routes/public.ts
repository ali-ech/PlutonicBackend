import { Router } from 'express';
import {
  Emirate,
  City,
  Category,
  SubService,
  SubServiceCityPrice,
  Settings,
  TeamMember,
  Testimonial,
  ContentPage,
} from '../models/index.js';
import { getAvailableSlots, computeSlotEnd } from '../services/slotEngine.js';
import { getGoogleBusinessLive } from '../services/googlePlaces.js';

const router = Router();

const EMIRATE_AR: Record<string, string> = {
  dubai: 'دبي',
  sharjah: 'الشارقة',
  'abu dhabi': 'أبوظبي',
  ajman: 'عجمان',
  'umm al quwain': 'أم القيوين',
  'ras al khaimah': 'رأس الخيمة',
  fujairah: 'الفجيرة',
  'al ain': 'العين',
};

router.get('/locations', async (_req, res) => {
  const emirates = await Emirate.find({ active: true }).sort({ name: 1 });
  const cities = await City.find().sort({ name: 1 });
  res.json({
    emirates: emirates.map((e) => ({
      _id: String(e._id),
      name: e.name,
      nameAr: EMIRATE_AR[e.name.trim().toLowerCase()] || '',
    })),
    cities: cities.map((c) => ({
      _id: String(c._id),
      name: c.name,
      nameAr: '',
      emirateId: String(c.emirateId),
    })),
  });
});

router.get('/settings/public', async (_req, res) => {
  const settings = await Settings.findOne();
  if (!settings) {
    res.json({});
    return;
  }
  res.json({
    workStart: settings.workStart,
    workEnd: settings.workEnd,
    bufferMinutes: settings.bufferMinutes,
    customDiscountPercent: settings.customDiscountPercent,
    customDiscountMinServices: settings.customDiscountMinServices,
    businessInfo: settings.businessInfo,
    socialLinks: settings.socialLinks,
    googleBusiness: settings.googleBusiness,
  });
});

router.get('/google-business', async (_req, res) => {
  const data = await getGoogleBusinessLive();
  res.json(data);
});

router.get('/google-business/photo', async (req, res) => {
  const reference = req.query.reference as string;
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!reference || !key) {
    res.status(404).end();
    return;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(reference)}&key=${key}`;
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      res.status(502).end();
      return;
    }
    res.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    const buf = Buffer.from(await imgRes.arrayBuffer());
    res.send(buf);
  } catch {
    res.status(502).end();
  }
});

router.get('/categories', async (_req, res) => {
  const categories = await Category.find({ active: true }).sort({ sortOrder: 1 });
  res.json(categories);
});

router.get('/categories/:slug', async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, active: true });
  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const subServices = await SubService.find({ categoryId: category._id, active: true });
  res.json({ category, subServices });
});

router.get('/sub-services/with-prices', async (req, res) => {
  const cityId = req.query.cityId as string;
  if (!cityId) {
    res.status(400).json({ error: 'cityId required' });
    return;
  }
  const categories = await Category.find({ active: true }).sort({ sortOrder: 1 });
  const subServices = await SubService.find({ active: true });
  const prices = await SubServiceCityPrice.find({ cityId });
  const priceMap = new Map(prices.map((p) => [p.subServiceId.toString(), p.priceAed]));

  const result = categories.map((cat) => ({
    category: cat,
    subServices: subServices
      .filter((s) => s.categoryId.toString() === cat._id.toString())
      .map((s) => ({
        ...s.toObject(),
        priceAed: priceMap.get(s._id.toString()) ?? null,
      })),
  }));

  res.json(result);
});

router.get('/sub-services/:slug', async (req, res) => {
  const subService = await SubService.findOne({ slug: req.params.slug, active: true });
  if (!subService) {
    res.status(404).json({ error: 'Sub-service not found' });
    return;
  }
  const category = await Category.findById(subService.categoryId);
  res.json({ subService, category });
});

router.get('/prices', async (req, res) => {
  const cityId = req.query.cityId as string;
  if (!cityId) {
    res.status(400).json({ error: 'cityId required' });
    return;
  }
  const prices = await SubServiceCityPrice.find({ cityId });
  res.json(prices);
});

router.get('/slots', async (req, res) => {
  const date = req.query.date as string;
  const durationMinutes = Number(req.query.durationMinutes || 60);
  if (!date) {
    res.status(400).json({ error: 'date required' });
    return;
  }
  const settings = await Settings.findOne();
  const workStart = settings?.workStart || process.env.WORK_START || '08:00';
  const workEnd = settings?.workEnd || process.env.WORK_END || '18:00';
  const bufferMinutes = settings?.bufferMinutes || Number(process.env.BUFFER_MINUTES || 30);

  const slots = await getAvailableSlots({
    date,
    durationMinutes,
    workStart,
    workEnd,
    bufferMinutes,
  });

  res.json({
    slots,
    slotEnds: slots.map((s) => computeSlotEnd(s, durationMinutes)),
  });
});

router.get('/team', async (_req, res) => {
  const team = await TeamMember.find().sort({ sortOrder: 1 });
  res.json(team);
});

router.get('/testimonials', async (_req, res) => {
  const items = await Testimonial.find().limit(10);
  res.json(items);
});

router.get('/pages/:slug', async (req, res) => {
  const page = await ContentPage.findOne({ slug: req.params.slug });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  res.json(page);
});

export default router;
