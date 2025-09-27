import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../../domain/entities/trip.entity';
import { ITripsRepository } from '../../domain/repositories/trips.repository.interface';

@Injectable()
export class TripsRepository implements ITripsRepository {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ) {}

  async create(tripData: Partial<Trip>): Promise<Trip> {
    const trip = this.tripRepository.create(tripData);
    const savedTrip = await this.tripRepository.save(trip);
    return Array.isArray(savedTrip) ? savedTrip[0] : savedTrip;
  }

  async findById(id: number): Promise<Trip | null> {
    return await this.tripRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  async findByUserId(userId: number): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: { createdBy: userId },
      relations: ['members', 'members.user'],
    });
  }

  async findPublicTrips(): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: { isPublic: true },
      relations: ['members', 'members.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, tripData: Partial<Trip>): Promise<Trip> {
    await this.tripRepository.update(id, tripData);
    const updatedTrip = await this.findById(id);
    if (!updatedTrip) {
      throw new Error(`Trip with id ${id} not found`);
    }
    return updatedTrip;
  }

  async delete(id: number): Promise<void> {
    await this.tripRepository.delete(id);
  }
}
