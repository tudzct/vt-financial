import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillController } from './bill.controller';
import { Bill } from './bill.entity';
import { BillService } from './bill.service';

/** Wires the protected upcoming-bills feature. */
@Module({
  imports: [TypeOrmModule.forFeature([Bill]), AuthModule],
  controllers: [BillController],
  providers: [BillService],
})
export class BillModule {}
