import './config/env.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  Emirate,
  City,
  Category,
  SubService,
  SubServiceCityPrice,
  Settings,
  AdminUser,
  TeamMember,
  Testimonial,
  ContentPage,
} from '../src/models/index.js';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI required');
  process.exit(1);
}

import { categoryImageForSlug, serviceImageForSlug } from './service-images.js';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected for seed...');

  await Promise.all([
    Emirate.deleteMany({}),
    City.deleteMany({}),
    Category.deleteMany({}),
    SubService.deleteMany({}),
    SubServiceCityPrice.deleteMany({}),
    Settings.deleteMany({}),
    AdminUser.deleteMany({}),
    TeamMember.deleteMany({}),
    Testimonial.deleteMany({}),
    ContentPage.deleteMany({}),
  ]);

  const dubai = await Emirate.create({ name: 'Dubai' });
  const sharjah = await Emirate.create({ name: 'Sharjah' });
  const abuDhabi = await Emirate.create({ name: 'Abu Dhabi' });

  const cities = await City.insertMany([
    { emirateId: dubai._id, name: 'Dubai Marina' },
    { emirateId: dubai._id, name: 'JLT' },
    { emirateId: dubai._id, name: 'Downtown Dubai' },
    { emirateId: sharjah._id, name: 'Al Nahda' },
    { emirateId: sharjah._id, name: 'Muwaileh' },
    { emirateId: abuDhabi._id, name: 'Al Reem Island' },
  ]);

  const categories = await Category.insertMany([
    {
      name: 'Cleaning',
      slug: 'cleaning',
      description: 'Professional residential and commercial cleaning across UAE.',
      imageUrl: categoryImageForSlug('cleaning'),
      sortOrder: 1,
    },
    {
      name: 'Birds Control',
      slug: 'birds-control',
      description: 'Safe and effective bird control solutions.',
      imageUrl: categoryImageForSlug('birds-control'),
      sortOrder: 2,
    },
    {
      name: 'Pest Control',
      slug: 'pest-control',
      description: 'Professional pest and rodent control for homes and offices.',
      imageUrl: categoryImageForSlug('pest-control'),
      sortOrder: 3,
    },
  ]);

  const cleaning = categories[0];
  const birds = categories[1];
  const pest = categories[2];

  const subServiceData = [
    { categoryId: cleaning._id, name: 'Deep Cleaning', slug: 'deep-cleaning', durationMinutes: 120, imageUrl: serviceImageForSlug('deep-cleaning'), youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { categoryId: cleaning._id, name: 'Sofa Cleaning', slug: 'sofa-cleaning', durationMinutes: 90, imageUrl: serviceImageForSlug('sofa-cleaning') },
    { categoryId: cleaning._id, name: 'Carpet Cleaning', slug: 'carpet-cleaning', durationMinutes: 90, imageUrl: serviceImageForSlug('carpet-cleaning') },
    { categoryId: cleaning._id, name: 'Move In / Out Cleaning', slug: 'move-in-out', durationMinutes: 180, imageUrl: serviceImageForSlug('move-in-out') },
    { categoryId: birds._id, name: 'Bird Netting', slug: 'bird-netting', durationMinutes: 120, imageUrl: serviceImageForSlug('bird-netting') },
    { categoryId: birds._id, name: 'Pigeon Control', slug: 'pigeon-control', durationMinutes: 90, imageUrl: serviceImageForSlug('pigeon-control') },
    { categoryId: pest._id, name: 'General Pest Control', slug: 'pest-control', durationMinutes: 60, imageUrl: serviceImageForSlug('pest-control') },
    { categoryId: pest._id, name: 'Rodent Control', slug: 'rodent-control', durationMinutes: 90, imageUrl: serviceImageForSlug('rodent-control') },
  ];

  const subServices = await SubService.insertMany(
    subServiceData.map((s) => ({
      ...s,
      description: `Professional ${s.name} service with trained staff and quality equipment.`,
      youtubeUrl: (s as { youtubeUrl?: string }).youtubeUrl || '',
      steps: [
        { title: 'Inspection', description: 'We assess the area and requirements.', order: 1 },
        { title: 'Service', description: 'Our team performs the service using professional tools.', order: 2 },
        { title: 'Final check', description: 'Quality check and customer walkthrough.', order: 3 },
      ],
      active: true,
    }))
  );

  const priceRows: { subServiceId: typeof subServices[0]['_id']; cityId: typeof cities[0]['_id']; priceAed: number }[] = [];
  for (const sub of subServices) {
    for (const city of cities) {
      priceRows.push({
        subServiceId: sub._id,
        cityId: city._id,
        priceAed: 150 + Math.floor(Math.random() * 350),
      });
    }
  }
  await SubServiceCityPrice.insertMany(priceRows);

  await Settings.create({
    workStart: '08:00',
    workEnd: '18:00',
    bufferMinutes: 30,
    customDiscountPercent: 10,
    customDiscountMinServices: 2,
    businessInfo: {
      companyName: 'Plutonic Cleaning & Technical Services L.L.C',
      address: 'Office #411, Marina Plaza, Dubai Marina, Dubai, UAE',
      phone: '+971 56 1615616',
      phoneAlt: '+971 55 3914339',
      whatsapp: '+971561615616',
      email: 'info@plutoniccleaningandtech.com',
      website: 'https://plutoniccleaningandtech.com',
      iban: 'AE00 0000 0000 0000 0000 000',
      bankName: 'Emirates NBD',
      accountName: 'Plutonic Cleaning & Technical Services L.L.C',
    },
    socialLinks: {
      facebook: 'https://www.facebook.com/Plutonic.Sofa.Carpet.Deep.Cleaning.Services/',
      instagram: 'https://www.instagram.com/Cleaning_Services_Dubai/',
      twitter: 'https://x.com/Cleaning_Dubai',
      linkedin: 'https://www.linkedin.com/in/ali-ali-00a572132',
      pinterest: 'https://www.pinterest.com/CleaningDubai/',
    },
    googleBusiness: {
      searchQuery: 'Plutonic Cleaning Services Marina Plaza Dubai',
      reviewsUrl: 'https://www.google.com/maps/search/?api=1&query=Office+411+Marina+Plaza+Dubai+Marina+Dubai+UAE',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Office+411+Marina+Plaza+Dubai+Marina+Dubai+UAE',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=25.077064,55.139724&travelmode=driving',
      mapsEmbedUrl: 'https://maps.google.com/maps?q=25.077064,55.139724&hl=en&z=18&output=embed',
      category: 'Cleaning service in Dubai, United Arab Emirates',
      buildingName: 'Marina Plaza',
      photoUrl: '/assets/services/deep-cleaning.png',
      exteriorPhotoUrl:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80&auto=format&fit=crop',
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await AdminUser.create({
    email: 'admin@plutonic.com',
    passwordHash,
    name: 'Admin',
  });

  await TeamMember.insertMany([
    {
      name: 'Sarah Ahmed',
      role: 'Director of Operations',
      bio:
        'Sarah oversees daily service delivery across Dubai and the Northern Emirates — managing schedules, supervising field teams, and ensuring every residential and commercial job meets Plutonic\'s quality checklist before sign-off.',
      photoUrl: '/assets/team/team-1.webp',
      sortOrder: 1,
    },
    {
      name: 'Mohammed Ali',
      role: 'Head of Technical Services',
      bio:
        'Mohammed leads our technical division specialising in deep cleaning, upholstery care, plumbing, and AC maintenance. He trains technicians on modern methods and safe handling of equipment and materials.',
      photoUrl: '/assets/team/team-2.webp',
      sortOrder: 2,
    },
    {
      name: 'Priya Nair',
      role: 'Customer Experience Manager',
      bio:
        'Priya manages client communications, booking coordination, and follow-up after every service. She works to keep pricing transparent and ensure each customer receives clear updates from confirmation through completion.',
      photoUrl: '',
      sortOrder: 3,
    },
  ]);

  await Testimonial.insertMany([
    {
      name: 'Sarah Mitchell',
      text: 'Plutonic completed a full deep cleaning of our apartment in Dubai Marina. The team was punctual, professional, and left every room immaculate. We have since booked them for regular maintenance — highly recommended.',
      rating: 5,
    },
    {
      name: 'Khalid Al-Rashidi',
      text: 'We use Plutonic for our office in JLT. Their staff is well-trained, pricing is transparent, and the quality is consistently excellent. They understand commercial standards and always finish on schedule.',
      rating: 5,
    },
    {
      name: 'Joelle Thomas',
      text: 'Outstanding service on a weekend booking — they accommodated our schedule and delivered a spotless result. Professional communication from start to finish.',
      rating: 5,
    },
    {
      name: 'Ahmed Hassan',
      text: 'Fair prices, reliable teams, and excellent carpet and sofa cleaning. Plutonic has become our go-to provider for home services in Sharjah.',
      rating: 5,
    },
  ]);

  await ContentPage.insertMany([
    {
      slug: 'about',
      title: 'About Plutonic',
      body: '<p>Plutonic Cleaning & Technical Services serves residential and commercial clients across the UAE with cleaning, birds control, and pest control solutions.</p>',
    },
    {
      slug: 'terms',
      title: 'Terms & Conditions',
      body: '<p>Placeholder terms and conditions. Update via admin CMS.</p>',
    },
    {
      slug: 'privacy',
      title: 'Privacy Policy',
      body: '<p>Placeholder privacy policy. Update via admin CMS.</p>',
    },
  ]);

  console.log('Seed complete!');
  console.log('Admin login: admin@plutonic.com / admin123');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
