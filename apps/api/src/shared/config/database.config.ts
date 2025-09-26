import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../../users/domain/entities/user.entity';
import { Trip, TripMember, Day, Activity, Category } from '../../trips/domain/entities';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_DATABASE || '7trip_dev',
  entities: [User, Trip, TripMember, Day, Activity, Category],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};
