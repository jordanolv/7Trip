import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { RatesService } from './rates.service.js';

@Module({
  imports: [AuthModule, TripsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, RatesService],
})
export class ExpensesModule {}
