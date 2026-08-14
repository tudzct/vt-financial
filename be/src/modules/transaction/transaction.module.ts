import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../account/account.entity';
import { AuthModule } from '../auth/auth.module';
import { TransactionController } from './transaction.controller';
import { Transaction } from './transaction.entity';
import { TransactionService } from './transaction.service';
import { Category } from '../category/category.entity';

/** Wires the protected transaction-history feature. */
@Module({
  imports: [TypeOrmModule.forFeature([Account, Category, Transaction]), AuthModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
