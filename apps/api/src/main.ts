import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  try {
    console.log('Initializing application...');
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT || 8001;

    await app.listen(port);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}
bootstrap();
