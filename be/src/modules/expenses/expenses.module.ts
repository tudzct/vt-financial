import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/account.entity';
import { AuthModule } from '../auth/auth.module';
import { Transaction } from '../transaction/transaction.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/** Wires the protected monthly expense summary feature. */
@Module({
  imports: [TypeOrmModule.forFeature([Account, Transaction]), AuthModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
