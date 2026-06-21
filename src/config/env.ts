import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always load server/.env (works when npm runs from monorepo root or server folder)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback: .env in current working directory
dotenv.config();

export function logGooglePlacesStatus(): void {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (key) {
    console.log('Google Places API key loaded');
  } else {
    console.warn('GOOGLE_PLACES_API_KEY not set — live Google reviews disabled');
  }
}
