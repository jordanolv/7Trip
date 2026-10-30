import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { DocumentsController, FilesController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { StorageModule } from './storage.module.js';

@Module({
  imports: [AuthModule, TripsModule, StorageModule],
  controllers: [DocumentsController, FilesController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
