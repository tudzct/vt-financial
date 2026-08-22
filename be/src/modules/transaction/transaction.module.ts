import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Account } from '../account/account.entity';
import { Category } from '../category/category.entity';
import { TransactionController } from './transaction.controller';
import { Transaction } from './transaction.entity';
import { TransactionService } from './transaction.service';

/** Wires transaction persistence, business logic, and HTTP endpoints. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Account, Category]),
    AuthModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
