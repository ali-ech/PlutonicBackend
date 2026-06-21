import '../src/config/env.js';
import mongoose from 'mongoose';
import { Testimonial } from '../src/models/index.js';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI required');
  process.exit(1);
}

const testimonials = [
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
];

await mongoose.connect(MONGODB_URI);
await Testimonial.deleteMany({});
await Testimonial.insertMany(testimonials);
console.log('Testimonials updated.');
await mongoose.disconnect();
