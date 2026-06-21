import 'dotenv/config';
import mongoose from 'mongoose';
import { Category, SubService } from '../src/models/index.js';
import { categoryImageForSlug, serviceImageForSlug } from './service-images.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');

  await mongoose.connect(uri);

  const categories = await Category.find();
  for (const cat of categories) {
    const imageUrl = categoryImageForSlug(cat.slug);
    if (imageUrl) {
      cat.imageUrl = imageUrl;
      await cat.save();
      console.log(`Category ${cat.slug} → ${imageUrl}`);
    }
  }

  const subServices = await SubService.find();
  for (const sub of subServices) {
    const imageUrl = serviceImageForSlug(sub.slug);
    if (imageUrl) {
      sub.imageUrl = imageUrl;
      await sub.save();
      console.log(`Service ${sub.slug} → ${imageUrl}`);
    }
  }

  console.log('Service images updated.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
