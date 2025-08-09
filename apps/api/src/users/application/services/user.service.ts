import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepositoryInterface, PaginationResult } from '../../domain/repositories/user.repository.interface';

interface PaginationOptions {
  page: number;
  limit: number;
}
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../../infrastructure/dto/create-user.dto';
import { UpdateUserDto } from '../../infrastructure/dto/update-user.dto';
import { PaginationDto } from '../../infrastructure/dto/pagination.dto';
import { UserEmailAlreadyExistsException, UserNotFoundException } from '../../../common/exceptions/user.exceptions';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  async findAll(paginationDto?: PaginationDto): Promise<PaginationResult<User>> {
    const options: PaginationOptions | undefined = paginationDto
      ? {
          page: paginationDto.page || 1,
          limit: paginationDto.limit || 10,
        }
      : undefined;

    return this.userRepository.findAll(options);
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new UserEmailAlreadyExistsException(createUserDto.email);
    }

    const userData = { ...createUserDto };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return this.userRepository.create(userData);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findById(id);

    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new UserEmailAlreadyExistsException(updateUserDto.email);
      }
    }

    const userData = { ...updateUserDto };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const updatedUser = await this.userRepository.update(id, userData);
    if (!updatedUser) {
      throw new UserNotFoundException(id);
    }
    return updatedUser;
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
