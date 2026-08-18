import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Transaction } from '../transaction/transaction.entity';
import { AccountController } from './account.controller';
import { Account } from './account.entity';
import { AccountService } from './account.service';

/** Wires the protected owned-account lookup feature. */
@Module({
  imports: [TypeOrmModule.forFeature([Account, Transaction]), AuthModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
