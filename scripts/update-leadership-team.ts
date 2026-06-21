import 'dotenv/config';
import mongoose from 'mongoose';
import { TeamMember } from '../src/models';

const team = [
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
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');
  await mongoose.connect(uri);
  await TeamMember.deleteMany({});
  await TeamMember.insertMany(team);
  console.log('Updated leadership team:', team.length, 'members');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
