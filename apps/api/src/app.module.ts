import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { databaseConfig } from './shared/config/database.config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig as TypeOrmModuleOptions), UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
