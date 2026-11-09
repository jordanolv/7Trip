import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { locationColumns, noLocation, PlacesService } from './places.service.js';

const TICK_MS = 6 * 3600_000;
const DAY_MS = 24 * 3600_000;
/** Google's terms: an address or position is kept 30 days at most. Refreshed a little before. */
const REFRESH_AFTER_DAYS = 25;
/** Once a trip is over by this much, its places keep only their id. */
const DROP_AFTER_TRIP_DAYS = 7;
const BATCH = 200;

type Table = 'event' | 'idea';

/**
 * Keeps the cached addresses and positions of picked places within Google's 30 days: refreshed while
 * the trip is coming or under way, dropped once it is over (the place id stays, docs/decisions.md).
 */
@Injectable()
export class PlacesRefresher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PlacesRefresher.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly places: PlacesService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.env.PLACES_WORKER) return;
    setTimeout(() => void this.tick(), 60_000).unref();
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** One pass. Tests call it by hand, with the time they need. */
  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const table of ['event', 'idea'] as const) {
        await this.drop(table, now);
        await this.refresh(table, now);
      }
    } catch (error) {
      this.logger.error(`Refreshing places failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async drop(table: Table, now: Date): Promise<void> {
    const where = {
      placeLat: { not: null },
      trip: { endDate: { lt: new Date(now.getTime() - DROP_AFTER_TRIP_DAYS * DAY_MS) } },
    };
    const data = { placeAddress: null, placeLat: null, placeLng: null, placeRefreshedAt: null };
    const { count } = table === 'event' ? await this.prisma.event.updateMany({ where, data }) : await this.prisma.idea.updateMany({ where, data });
    if (count) this.logger.log(`Dropped the cached position of ${count} ${table}(s) of finished trips`);
  }

  private async refresh(table: Table, now: Date): Promise<void> {
    const where = {
      placeId: { not: null },
      OR: [{ placeRefreshedAt: null }, { placeRefreshedAt: { lt: new Date(now.getTime() - REFRESH_AFTER_DAYS * DAY_MS) } }],
      trip: { OR: [{ endDate: null }, { endDate: { gte: new Date(now.getTime() - DROP_AFTER_TRIP_DAYS * DAY_MS) } }] },
    };
    const select = { id: true, placeId: true } as const;
    const rows =
      table === 'event'
        ? await this.prisma.event.findMany({ where, select, take: BATCH, orderBy: { placeRefreshedAt: { sort: 'asc', nulls: 'first' } } })
        : await this.prisma.idea.findMany({ where, select, take: BATCH, orderBy: { placeRefreshedAt: { sort: 'asc', nulls: 'first' } } });
    for (const row of rows) {
      let data;
      try {
        const found = await this.places.refreshed(row.placeId!);
        // Gone from Google: the name stays, without a position; tried again in 25 days.
        data = found ? locationColumns(found) : { ...noLocation(row.placeId), placeRefreshedAt: now };
      } catch {
        // Google unreachable: next pass.
        return;
      }
      // Only if it is still the same place: someone may have picked another meanwhile.
      const match = { id: row.id, placeId: row.placeId };
      if (table === 'event') await this.prisma.event.updateMany({ where: match, data });
      else await this.prisma.idea.updateMany({ where: match, data });
    }
  }
}
