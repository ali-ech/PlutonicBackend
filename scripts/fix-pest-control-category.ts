import 'dotenv/config';
import mongoose from 'mongoose';
import { Category } from '../src/models/index.js';
import { categoryImageForSlug } from './service-images.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');

  await mongoose.connect(uri);

  const cat =
    (await Category.findOne({ slug: 'pets-control' })) ||
    (await Category.findOne({ slug: 'pest-control', name: /pets/i }));

  if (!cat) {
    console.log('No pets-control category found — nothing to update.');
    await mongoose.disconnect();
    return;
  }

  cat.name = 'Pest Control';
  cat.slug = 'pest-control';
  cat.description = 'Professional pest and rodent control for homes and offices.';
  cat.imageUrl = categoryImageForSlug('pest-control') || cat.imageUrl;

  await cat.save();
  console.log(`Updated category → name: ${cat.name}, slug: ${cat.slug}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
