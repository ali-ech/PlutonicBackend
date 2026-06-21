import { Settings } from '../models/index.js';
import {
  OFFICE_LOCATION,
  buildDirectionsUrl,
  buildDirectionsUrlForPlaceId,
  buildMapsEmbedUrl,
  buildMapsUrl,
} from '../config/officeLocation.js';

const CACHE_TTL_MS = Number(process.env.GOOGLE_PLACES_CACHE_MS) || 60 * 60 * 1000; // 1 hour

export interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTime?: string;
  profilePhotoUrl?: string;
}

export interface GoogleBusinessLive {
  live: boolean;
  name?: string;
  rating?: number;
  reviewCount?: number;
  reviewsUrl?: string;
  mapsUrl?: string;
  directionsUrl?: string;
  formattedAddress?: string;
  website?: string;
  category?: string;
  buildingName?: string;
  reviews?: GoogleReview[];
  photoUrl?: string;
  exteriorPhotoUrl?: string;
  mapsEmbedUrl?: string;
  lat?: number;
  lng?: number;
  photoReference?: string;
  exteriorPhotoReference?: string;
  cachedAt?: string;
  message?: string;
}

interface CacheEntry {
  data: GoogleBusinessLive;
  expiresAt: number;
}

let cache: CacheEntry | null = null;

function apiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || undefined;
}

async function placesGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/${path}?${qs}`);
  const json = await res.json();
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(json.error_message || json.status || 'Google Places API error');
  }
  return json as T;
}

async function resolvePlaceId(): Promise<string | undefined> {
  const fromEnv = process.env.GOOGLE_PLACE_ID?.trim();
  if (fromEnv) return fromEnv;

  const settings = await Settings.findOne();
  const fromSettings = settings?.googleBusiness?.placeId?.trim();
  if (fromSettings) return fromSettings;

  const searchQuery =
    settings?.googleBusiness?.searchQuery?.trim() ||
    'Plutonic Cleaning Services Marina Plaza Dubai';

  const data = await placesGet<{
    candidates?: { place_id?: string }[];
  }>('findplacefromtext/json', {
    input: searchQuery,
    inputtype: 'textquery',
    fields: 'place_id',
  });

  return data.candidates?.[0]?.place_id;
}

function proxyPhotoUrl(photoReference: string): string {
  return `/api/google-business/photo?reference=${encodeURIComponent(photoReference)}`;
}

function fallbackFromSettings(settings: Awaited<ReturnType<typeof Settings.findOne>>): GoogleBusinessLive {
  const gb = settings?.googleBusiness;
  const biz = settings?.businessInfo;
  return {
    live: false,
    name: biz?.companyName?.replace(' L.L.C', '') || 'Plutonic Cleaning Services',
    rating: gb?.rating,
    reviewCount: gb?.reviewCount,
    reviewsUrl: gb?.reviewsUrl || buildMapsUrl(),
    mapsUrl: gb?.mapsUrl || buildMapsUrl(),
    directionsUrl: gb?.directionsUrl || buildDirectionsUrl(),
    formattedAddress: biz?.address || OFFICE_LOCATION.address,
    website: biz?.website,
    category: gb?.category,
    buildingName: gb?.buildingName || OFFICE_LOCATION.buildingName,
    photoUrl: gb?.photoUrl,
    exteriorPhotoUrl: gb?.exteriorPhotoUrl,
    mapsEmbedUrl: buildMapsEmbedUrl(),
    lat: OFFICE_LOCATION.lat,
    lng: OFFICE_LOCATION.lng,
  };
}

export async function getGoogleBusinessLive(): Promise<GoogleBusinessLive> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const settings = await Settings.findOne();

  if (!apiKey()) {
    const data = fallbackFromSettings(settings);
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  }

  try {
    const placeId = await resolvePlaceId();
    if (!placeId) {
      const data: GoogleBusinessLive = {
        ...fallbackFromSettings(settings),
        message: 'Google place not found. Set GOOGLE_PLACE_ID or googleBusiness.searchQuery in settings.',
      };
      cache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
      return data;
    }

    const details = await placesGet<{
      result?: {
        name?: string;
        rating?: number;
        user_ratings_total?: number;
        url?: string;
        website?: string;
        formatted_address?: string;
        reviews?: {
          author_name?: string;
          rating?: number;
          text?: string;
          relative_time_description?: string;
          profile_photo_url?: string;
        }[];
        photos?: { photo_reference?: string }[];
        geometry?: { location?: { lat?: number; lng?: number } };
      };
    }>('details/json', {
      place_id: placeId,
      fields: [
        'name',
        'rating',
        'user_ratings_total',
        'url',
        'website',
        'formatted_address',
        'reviews',
        'photos',
        'geometry',
      ].join(','),
    });

    const result = details.result;
    if (!result) {
      throw new Error('No place details returned');
    }

    const gb = settings?.googleBusiness;
    const photos = result.photos || [];
    const mainRef = photos[0]?.photo_reference;
    const exteriorRef = photos[1]?.photo_reference;
    const lat = result.geometry?.location?.lat ?? OFFICE_LOCATION.lat;
    const lng = result.geometry?.location?.lng ?? OFFICE_LOCATION.lng;

    const data: GoogleBusinessLive = {
      live: true,
      name: result.name,
      rating: result.rating,
      reviewCount: result.user_ratings_total,
      reviewsUrl: result.url || gb?.reviewsUrl || buildMapsUrl(),
      mapsUrl: result.url || gb?.mapsUrl || buildMapsUrl(),
      directionsUrl: buildDirectionsUrlForPlaceId(placeId),
      formattedAddress: result.formatted_address || settings?.businessInfo?.address || OFFICE_LOCATION.address,
      website: result.website || settings?.businessInfo?.website,
      category: gb?.category,
      buildingName: gb?.buildingName || OFFICE_LOCATION.buildingName,
      lat,
      lng,
      photoReference: mainRef,
      exteriorPhotoReference: exteriorRef,
      photoUrl: mainRef ? proxyPhotoUrl(mainRef) : gb?.photoUrl,
      exteriorPhotoUrl: exteriorRef ? proxyPhotoUrl(exteriorRef) : gb?.exteriorPhotoUrl,
      mapsEmbedUrl: gb?.mapsEmbedUrl || buildMapsEmbedUrl(lat, lng),
      reviews: (result.reviews || []).map((r) => ({
        authorName: r.author_name || 'Google user',
        rating: r.rating ?? 5,
        text: r.text || '',
        relativeTime: r.relative_time_description,
        profilePhotoUrl: r.profile_photo_url,
      })),
      cachedAt: new Date().toISOString(),
    };

    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  } catch (err) {
    const data: GoogleBusinessLive = {
      ...fallbackFromSettings(settings),
      message: (err as Error).message,
    };
    cache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
    return data;
  }
}
