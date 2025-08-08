import { User } from '../entities/user.entity';

export interface UserRepositoryInterface {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(userData: Partial<User>): Promise<User>;
  update(id: number, userData: Partial<User>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
}
