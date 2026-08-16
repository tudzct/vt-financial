import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';

/** Wires the protected financial-goal listing feature. */
@Module({
  imports: [AuthModule],
  controllers: [GoalController],
  providers: [GoalService],
})
export class GoalModule {}
