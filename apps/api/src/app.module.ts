import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import dbConfig from './config/db.config';
import dbConfigProduction from './config/db.config.production';
import jwtConfig from './auth/config/jwt.config';
import refreshJwtConfig from './auth/config/refresh-jwt.config';
import googleOauthConfig from './auth/config/google-oauth.config';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: path.resolve(__dirname, '../../../.env.dev'),
      load: [
        dbConfig,
        dbConfigProduction,
        jwtConfig,
        refreshJwtConfig,
        googleOauthConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory:
        process.env.NODE_ENV === 'production' ? dbConfigProduction : dbConfig,
    }),
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
