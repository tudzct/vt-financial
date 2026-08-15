import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Account } from '../account/account.entity';
import { Transaction } from '../transaction/transaction.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/** Registers the expense-summary API and its persistence dependencies. */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Account, Transaction])],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
