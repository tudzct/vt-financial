import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { AccountModule } from './modules/account/account.module';
import { CategoryModule } from './modules/category/category.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { BillModule } from './modules/bill/bill.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AccountModule,
    CategoryModule,
    TransactionModule,
    ExpensesModule,
    BillModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
