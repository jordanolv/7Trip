import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller({
  path: '',
})
export class AppController {
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.configService.get('dbconfig.dev.type');
  }

  @Get('env-check')
  checkEnv() {
    return {
      jwtSecret: this.configService.get('JWT_SECRET'),
      jwtRefreshSecret: this.configService.get('JWT_REFRESH_SECRET'),
      dbHost: this.configService.get('DB_HOST'),
      dbPort: this.configService.get('DB_PORT'),
      dbUsername: this.configService.get('DB_USERNAME'),
      dbDatabase: this.configService.get('DB_DATABASE'),
    };
  }
}
