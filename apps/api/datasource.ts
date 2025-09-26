import { DataSource } from 'typeorm'
import { User } from './src/users/domain/entities/user.entity'
import { Trip, TripMember, Day, Activity, Category } from './src/trips/domain/entities'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_DATABASE || '7trip_dev',
  entities: [User, Trip, TripMember, Day, Activity, Category],
  migrations: ['src/shared/migrations/*.ts'],
  synchronize: false,
  logging: true,
})