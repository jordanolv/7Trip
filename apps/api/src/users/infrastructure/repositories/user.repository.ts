import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { 
  UserRepositoryInterface, 
  PaginationOptions, 
  PaginationResult 
} from '../../domain/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements UserRepositoryInterface {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(options?: PaginationOptions): Promise<PaginationResult<User>> {
    if (!options) {
      const data = await this.userRepository.find();
      return {
        data,
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
      };
    }

    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      withDeleted: true,
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { googleId },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async update(id: number, userData: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, userData);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.userRepository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }
}
