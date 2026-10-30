import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  chooseTransferPlanRequestSchema,
  createExpenseRequestSchema,
  createSettlementRequestSchema,
  currencySchema,
  personalBudgetRequestSchema,
  updateExpenseRequestSchema,
  type Expense,
  type PersonalBudgetView,
  type Settlement,
  type TripBalances,
} from '@7trip/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from '../trips/actor.js';
import { CurrentActor, TripMemberGuard } from '../trips/trip-member.guard.js';
import { ExpensesService, type BudgetInput, type ExpenseInput, type SettlementInput, type TransferPlanInput, type UpdateExpenseInput } from './expenses.service.js';

/** Open to every member of the trip, guests included (docs/architecture.md §5). */
@Controller('trips/:tripId')
@UseGuards(TripMemberGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('expenses')
  list(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<Expense[]> {
    return this.expenses.list(actor, tripId);
  }

  @Post('expenses')
  create(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(createExpenseRequestSchema)) body: ExpenseInput,
  ): Promise<Expense> {
    return this.expenses.create(actor, tripId, body);
  }

  @Get('expenses/:expenseId')
  get(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('expenseId') expenseId: string): Promise<Expense> {
    return this.expenses.get(actor, tripId, expenseId);
  }

  @Put('expenses/:expenseId')
  update(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('expenseId') expenseId: string,
    @Body(new ZodValidationPipe(updateExpenseRequestSchema)) body: UpdateExpenseInput,
  ): Promise<Expense> {
    return this.expenses.update(actor, tripId, expenseId, body);
  }

  @Delete('expenses/:expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('expenseId') expenseId: string): Promise<void> {
    return this.expenses.remove(actor, tripId, expenseId);
  }

  /** Today's ECB rate from `currency` to the trip's, to fill in an expense; `rate` null: to type. */
  @Get('rates/:currency')
  rate(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('currency', new ZodValidationPipe(currencySchema)) currency: string) {
    return this.expenses.rate(actor, tripId, currency);
  }

  @Get('balances')
  balances(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<TripBalances> {
    return this.expenses.balances(actor, tripId);
  }

  @Put('balances/plan')
  choosePlan(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(chooseTransferPlanRequestSchema)) body: TransferPlanInput,
  ): Promise<TripBalances> {
    return this.expenses.choosePlan(actor, tripId, body);
  }

  /** The caller's own budget: nobody else's can be read. */
  @Get('budget')
  budget(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<PersonalBudgetView> {
    return this.expenses.budget(actor, tripId);
  }

  @Put('budget')
  setBudget(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(personalBudgetRequestSchema)) body: BudgetInput,
  ): Promise<PersonalBudgetView> {
    return this.expenses.setBudget(actor, tripId, body);
  }

  @Post('settlements')
  settle(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(createSettlementRequestSchema)) body: SettlementInput,
  ): Promise<Settlement> {
    return this.expenses.settle(actor, tripId, body);
  }

  @Delete('settlements/:settlementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsettle(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('settlementId') settlementId: string): Promise<void> {
    return this.expenses.unsettle(actor, tripId, settlementId);
  }
}
