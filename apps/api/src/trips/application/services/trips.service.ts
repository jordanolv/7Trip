import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../../domain/entities/trip.entity';
import { TripMember, TripMemberRole, TripMemberStatus } from '../../domain/entities/trip-member.entity';
import { CreateTripDto } from '../../infrastructure/dto/create-trip.dto';
import { ITripsRepository } from '../../domain/repositories/trips.repository.interface';

@Injectable()
export class TripsService {
  constructor(
    @Inject('ITripsRepository')
    private readonly tripsRepository: ITripsRepository,
    @InjectRepository(TripMember)
    private readonly tripMemberRepository: Repository<TripMember>,
  ) {}

  async create(createTripDto: CreateTripDto, userId: number): Promise<Trip> {
    // Créer le voyage
    const savedTrip = await this.tripsRepository.create({
      ...createTripDto,
      startDate: new Date(createTripDto.startDate),
      endDate: new Date(createTripDto.endDate),
      createdBy: userId,
    });

    // Créer le membre owner automatiquement
    const tripMember = this.tripMemberRepository.create({
      tripId: savedTrip.id,
      userId: userId,
      role: TripMemberRole.OWNER,
      status: TripMemberStatus.ACCEPTED,
      joinedAt: new Date(),
    });

    await this.tripMemberRepository.save(tripMember);

    return savedTrip;
  }

  async findPublicTrips(): Promise<Trip[]> {
    return await this.tripsRepository.findPublicTrips();
  }

  async findUserTrips(userId: number): Promise<Trip[]> {
    return await this.tripsRepository.findByUserId(userId);
  }
}
