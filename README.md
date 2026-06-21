# Plutonic Backend

Express + MongoDB API for **Plutonic Cleaning & Technical Services**.

Repository: [PlutonicBackend](https://github.com/mali14655/PlutonicBackend)

> Deploy the **frontend** on [Vercel](https://vercel.com). Deploy this **backend** on [Render](https://render.com), Railway, or Fly.io (Node.js server — not Vercel serverless).

## Local development

```bash
npm install
cp .env.example .env   # fill in values
npm run dev
```

API runs at `http://localhost:5000`. Health check: `GET /api/health`

## Required environment variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for admin JWT |
| `CLIENT_URL` | Frontend URL (Vercel app, e.g. `https://plutonic.vercel.app`) |
| `PUBLIC_URL` | Public URL for WhatsApp links (usually same as `CLIENT_URL`) |

## Optional integrations

| Variable | Description |
|----------|-------------|
| `ULTRAMSG_INSTANCE_ID` / `ULTRAMSG_TOKEN` | WhatsApp via UltraMsg |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | Meta WhatsApp Cloud API fallback |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Card payments |
| `GOOGLE_PLACES_API_KEY` / `GOOGLE_PLACE_ID` | Live Google reviews |
| `FIREBASE_PROJECT_ID` + service account file **or** `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | Admin push notifications |

See `.env.example` for the full list.

## Deploy on Render (recommended)

1. New **Web Service** → connect [PlutonicBackend](https://github.com/mali14655/PlutonicBackend)
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Add all env vars from `.env.example`
5. For Firebase on Render, use env vars instead of a file:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (paste key with `\n` for newlines)

After deploy, set `CLIENT_URL` to your Vercel frontend URL and update Vercel `VITE_API_URL` to this Render URL.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Production server |
| `npm run seed` | Seed database (dev only) |
