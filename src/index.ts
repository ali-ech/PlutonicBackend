import app, { logStartupServices } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }
  await connectDB(uri);
  logStartupServices();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WhatsApp webhook URL: http://localhost:${PORT}/api/whatsapp/webhook`);
  });
}

start().catch(console.error);
