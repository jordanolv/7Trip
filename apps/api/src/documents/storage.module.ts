import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';

/** Its own module: the trips need it too, to remove a deleted trip's files. */
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
