import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../../infrastructure/dto/create-user.dto';
import { UpdateUserDto } from '../../infrastructure/dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    return this.userRepository.create(createUserDto);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    // Vérifier que l'utilisateur existe
    await this.findById(id);

    // Si on change l'email, vérifier qu'il n'existe pas déjà
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already exists');
      }
    }

    const updatedUser = await this.userRepository.update(id, updateUserDto);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
