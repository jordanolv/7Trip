import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import {
  notificationPrefsRequestSchema,
  pushTokenRequestSchema,
  removePushTokenRequestSchema,
  resolveNotificationPrefs,
  type NotificationPrefs,
} from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { userActor } from '../trips/actor.js';
import { TripsService } from '../trips/trips.service.js';

/**
 * Notifications go to accounts: a guest has no phone registered, so no preferences either.
 * Preferences are per trip (CDC §10.1).
 */
@Controller()
@UseGuards(AccessTokenGuard)
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  @Get('trips/:tripId/notification-prefs')
  async prefs(@CurrentUserId() userId: string, @Param('tripId') tripId: string): Promise<NotificationPrefs> {
    const me = await this.trips.member(userActor(userId), tripId);
    return resolveNotificationPrefs(me.notifPrefs);
  }

  /** Only the topics sent change. */
  @Put('trips/:tripId/notification-prefs')
  async setPrefs(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(notificationPrefsRequestSchema)) body: z.output<typeof notificationPrefsRequestSchema>,
  ): Promise<NotificationPrefs> {
    const me = await this.trips.member(userActor(userId), tripId);
    const prefs = { ...resolveNotificationPrefs(me.notifPrefs), ...body };
    await this.prisma.participant.update({ where: { id: me.id }, data: { notifPrefs: prefs } });
    return prefs;
  }

  /** This phone now receives the account's notifications (taken from the account signed in before, if any). */
  @Put('me/push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@CurrentUserId() userId: string, @Body(new ZodValidationPipe(pushTokenRequestSchema)) body: z.output<typeof pushTokenRequestSchema>): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: body.token },
      create: { userId, token: body.token, timeZone: body.timeZone },
      update: { userId, timeZone: body.timeZone },
    });
  }

  /** On sign-out: the phone stops receiving them. */
  @Delete('me/push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(@CurrentUserId() userId: string, @Body(new ZodValidationPipe(removePushTokenRequestSchema)) body: z.output<typeof removePushTokenRequestSchema>): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token: body.token, userId } });
  }
}
