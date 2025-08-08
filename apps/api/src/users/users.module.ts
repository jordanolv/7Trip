import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    {
      provide: 'USER_REPOSITORY',
      useClass: UserRepository,
    },
  ],
  exports: ['USER_REPOSITORY', TypeOrmModule],
})
export class UsersModule {}
