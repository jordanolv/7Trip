import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { TripsService } from '../../application/services/trips.service';
import { CreateTripDto } from '../../infrastructure/dto/create-trip.dto';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createTripDto: CreateTripDto, @Request() req: any) {
    return this.tripsService.create(createTripDto, req.user.id);
  }

  @Get('public')
  async getPublicTrips() {
    return this.tripsService.findPublicTrips();
  }

  @Get('my-trips')
  @UseGuards(JwtAuthGuard)
  async getUserTrips(@Request() req: any) {
    return this.tripsService.findUserTrips(req.user.id);
  }
}
