import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordHasher {
  hash(password: string, rounds: number): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  matches(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  cost(hash: string): number {
    return bcrypt.getRounds(hash);
  }
}
