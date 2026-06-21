import app, { logStartupServices } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

logStartupServices();

let bootstrapped = false;

async function ensureReady() {
  if (bootstrapped) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDB(uri);
  bootstrapped = true;
}

export default async function handler(req: import('http').IncomingMessage, res: import('http').ServerResponse) {
  await ensureReady();
  return app(req, res);
}
