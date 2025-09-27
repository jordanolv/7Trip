import { Trip } from '../entities/trip.entity';

export interface ITripsRepository {
  create(tripData: Partial<Trip>): Promise<Trip>;
  findById(id: number): Promise<Trip | null>;
  findByUserId(userId: number): Promise<Trip[]>;
  findPublicTrips(): Promise<Trip[]>;
  update(id: number, tripData: Partial<Trip>): Promise<Trip>;
  delete(id: number): Promise<void>;
}
