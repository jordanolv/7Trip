import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ApiErrorCode, distanceMeters, type PlaceDetails, type PlaceLocation, type PlaceSuggestion } from '@7trip/shared';
import { apiError } from '../common/api-error.js';
import { ENV, type Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

const PLACES_URL = 'https://places.googleapis.com/v1';
const TIMEOUT_MS = 4000;
/** Suggestions lean towards this radius around the trip's other places. */
const BIAS_RADIUS_M = 50_000;
/** A place looked up when picked is saved a moment later: kept that long, so it is not fetched twice. */
const DETAILS_CACHE_MS = 30 * 60_000;
/** Searches allowed per person and minute: typing a name sends one every few letters. */
const SEARCHES_PER_MINUTE = 60;

/** The place columns of an idea or an event, as stored. */
export interface PlaceColumns {
  place: string | null;
  placeId: string | null;
  placeAddress: string | null;
  placeLat: number | null;
  placeLng: number | null;
  placeRefreshedAt: Date | null;
}

/** For tests (PLACES_SOURCE=fixed). */
const FIXED_PLACES = [
  { placeId: 'fixed-plaza-espana', name: 'Plaza de España', address: 'Av. de Isabel la Católica, 41004 Séville, Espagne', lat: 37.3772, lng: -5.9869 },
  { placeId: 'fixed-alcazar', name: 'Real Alcázar de Séville', address: 'Patio de Banderas, 41004 Séville, Espagne', lat: 37.3831, lng: -5.9902 },
  { placeId: 'fixed-giralda', name: 'Cathédrale de Séville', address: 'Av. de la Constitución, 41004 Séville, Espagne', lat: 37.3858, lng: -5.9931 },
  { placeId: 'fixed-plaza-espana-cadiz', name: 'Plaza de España', address: 'Cadix, Espagne', lat: 36.5333, lng: -6.2956 },
];

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

class PlaceNotFound extends Error {}

/**
 * Places picked from Google (docs/decisions.md, "Lieux"), through the Places API (New): the search
 * while typing, and the address and position of the place picked. Searches of one session are only
 * billed with the lookup that ends them. Google's terms keep the place id for good, the rest as a
 * cache under 30 days (PlacesRefresher).
 */
@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly details = new Map<string, { value: PlaceDetails; until: number }>();
  private readonly searches = new Map<string, { count: number; since: number }>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  /** Suggestions for what is being typed, nearest the trip's other places first. */
  async search(who: string, tripId: string, query: string, session: string): Promise<PlaceSuggestion[]> {
    this.countSearch(who);
    const near = await this.tripCenter(tripId);
    if (this.env.PLACES_SOURCE === 'fixed') {
      return FIXED_PLACES.filter((place) => fold(place.name).includes(fold(query))).map((place) => ({
        placeId: place.placeId,
        name: place.name,
        detail: place.address,
        distanceMeters: near ? Math.round(distanceMeters(near, place)) : null,
      }));
    }
    const center = near && { latitude: near.lat, longitude: near.lng };
    const body = await this.call('places:autocomplete', {
      method: 'POST',
      body: JSON.stringify({
        input: query,
        sessionToken: session,
        languageCode: 'fr',
        ...(center && { locationBias: { circle: { center, radius: BIAS_RADIUS_M } }, origin: center }),
      }),
    });
    const suggestions = (body as { suggestions?: { placePrediction?: GooglePrediction }[] }).suggestions ?? [];
    return suggestions.flatMap(({ placePrediction: p }) =>
      p?.placeId
        ? [
            {
              placeId: p.placeId,
              name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
              detail: p.structuredFormat?.secondaryText?.text ?? null,
              distanceMeters: typeof p.distanceMeters === 'number' ? p.distanceMeters : null,
            },
          ]
        : [],
    );
  }

  /** The address and position of a place. 404 when Google does not know it. */
  async lookup(placeId: string, session?: string): Promise<PlaceDetails> {
    try {
      return await this.fetchDetails(placeId, session);
    } catch (error) {
      if (error instanceof PlaceNotFound) throw apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Lieu introuvable');
      throw error;
    }
  }

  /**
   * The columns to store for a place sent with an idea or an event: none when it is not part of the
   * request. A place typed freely drops the picked one. When Google cannot be reached, the place id
   * is kept without its position, which the refresher fills in later.
   */
  async columnsFor(input: { place?: string | null; placeId?: string | null }): Promise<Partial<PlaceColumns>> {
    if (input.place === undefined) {
      if (input.placeId) throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'Indique aussi le nom du lieu');
      return {};
    }
    const placeId = input.place ? (input.placeId ?? null) : null;
    if (!placeId) return { place: input.place, ...noLocation(null) };
    try {
      const found = await this.fetchDetails(placeId);
      return { place: input.place, ...locationColumns(found) };
    } catch (error) {
      if (error instanceof PlaceNotFound) throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'Lieu introuvable');
      return { place: input.place, ...noLocation(placeId) };
    }
  }

  /** For the refresher: the place as Google has it now, null when it is gone. Throws when Google cannot be reached. */
  async refreshed(placeId: string): Promise<PlaceDetails | null> {
    try {
      return await this.fetchDetails(placeId, undefined, { fresh: true });
    } catch (error) {
      if (error instanceof PlaceNotFound) return null;
      throw error;
    }
  }

  private async fetchDetails(placeId: string, session?: string, { fresh = false } = {}): Promise<PlaceDetails> {
    const cached = this.details.get(placeId);
    if (!fresh && cached && cached.until > Date.now()) return cached.value;
    let value: PlaceDetails;
    if (this.env.PLACES_SOURCE === 'fixed') {
      const place = FIXED_PLACES.find((candidate) => candidate.placeId === placeId);
      if (!place) throw new PlaceNotFound();
      value = { placeId: place.placeId, address: place.address, lat: place.lat, lng: place.lng };
    } else {
      const params = new URLSearchParams({ languageCode: 'fr', ...(session && { sessionToken: session }) });
      // Essentials fields only: the name is the one from the suggestion, already known.
      const body = (await this.call(`places/${encodeURIComponent(placeId)}?${params}`, {
        headers: { 'X-Goog-FieldMask': 'id,formattedAddress,location' },
      })) as { id?: string; formattedAddress?: string; location?: { latitude?: number; longitude?: number } };
      const { latitude, longitude } = body.location ?? {};
      if (typeof latitude !== 'number' || typeof longitude !== 'number') throw new PlaceNotFound();
      value = { placeId: body.id ?? placeId, address: body.formattedAddress ?? null, lat: latitude, lng: longitude };
    }
    this.details.set(placeId, { value, until: Date.now() + DETAILS_CACHE_MS });
    if (this.details.size > 5000) this.details.delete(this.details.keys().next().value!);
    return value;
  }

  private async call(path: string, init: { method?: string; body?: string; headers?: Record<string, string> }): Promise<unknown> {
    const key = this.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw unavailable();
    let response: Response;
    try {
      response = await fetch(`${PLACES_URL}/${path}`, {
        method: init.method ?? 'GET',
        body: init.body,
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Google Places unreachable: ${error instanceof Error ? error.message : String(error)}`);
      throw unavailable();
    }
    // An unknown or malformed id: Google answers 404, or 400 INVALID_ARGUMENT.
    if (response.status === 404 || (response.status === 400 && path.startsWith('places/'))) throw new PlaceNotFound();
    if (!response.ok) {
      this.logger.warn(`Google Places ${path.split('?')[0]}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
      throw unavailable();
    }
    return response.json();
  }

  /** Where the trip's picked places are, roughly: the middle of them. */
  private async tripCenter(tripId: string): Promise<{ lat: number; lng: number } | null> {
    const located = { tripId, placeLat: { not: null }, placeLng: { not: null } };
    const select = { placeLat: true, placeLng: true } as const;
    const [events, ideas] = await Promise.all([
      this.prisma.event.findMany({ where: located, select, take: 100 }),
      this.prisma.idea.findMany({ where: located, select, take: 100 }),
    ]);
    const points = [...events, ...ideas];
    if (points.length === 0) return null;
    return {
      lat: points.reduce((sum, point) => sum + point.placeLat!, 0) / points.length,
      lng: points.reduce((sum, point) => sum + point.placeLng!, 0) / points.length,
    };
  }

  private countSearch(who: string): void {
    const now = Date.now();
    const entry = this.searches.get(who);
    if (!entry || now - entry.since > 60_000) {
      this.searches.set(who, { count: 1, since: now });
      if (this.searches.size > 10_000) this.searches.clear();
      return;
    }
    entry.count += 1;
    if (entry.count > SEARCHES_PER_MINUTE) {
      throw apiError(HttpStatus.TOO_MANY_REQUESTS, ApiErrorCode.TooManyRequests, 'Trop de recherches, réessaie dans une minute');
    }
  }
}

interface GooglePrediction {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
  distanceMeters?: number;
}

const unavailable = () =>
  apiError(HttpStatus.SERVICE_UNAVAILABLE, ApiErrorCode.PlacesUnavailable, 'La recherche de lieux est indisponible pour le moment');

export function locationColumns(found: PlaceDetails): Omit<PlaceColumns, 'place'> {
  return { placeId: found.placeId, placeAddress: found.address, placeLat: found.lat, placeLng: found.lng, placeRefreshedAt: new Date() };
}

export function noLocation(placeId: string | null): Omit<PlaceColumns, 'place'> {
  return { placeId, placeAddress: null, placeLat: null, placeLng: null, placeRefreshedAt: null };
}

/** The stored cache as the apps get it. */
export function toPlaceLocation(row: Pick<PlaceColumns, 'placeAddress' | 'placeLat' | 'placeLng'>): PlaceLocation | null {
  return row.placeLat !== null && row.placeLng !== null ? { address: row.placeAddress, lat: row.placeLat, lng: row.placeLng } : null;
}
