import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService registration validation', () => {
  const service = new AuthService({} as DataSource, {} as JwtService);

  const validRegistration: RegisterDto = {
    fullName: 'Nguyen Van',
    email: 'visitor@example.com',
    password: 'Strong!123',
    confirmPassword: 'Strong!123',
  };

  it('accepts a registration request that satisfies the defined input rules', () => {
    expect(service.isRegistrationInputValid(validRegistration)).toBe(true);
  });

  it('normalizes full name and email before validation', () => {
    expect(
      service.isRegistrationInputValid({
        ...validRegistration,
        fullName: '  Nguyễn Văn  ',
        email: '  VISITOR@EXAMPLE.COM  ',
      }),
    ).toBe(true);
  });

  it.each([
    { password: 'short!', confirmPassword: 'short!' },
    { password: 'NoSpecial123', confirmPassword: 'NoSpecial123' },
    { password: 'Strong!123', confirmPassword: 'Different!123' },
  ])('rejects invalid password rule combinations', (passwords) => {
    expect(
      service.isRegistrationInputValid({ ...validRegistration, ...passwords }),
    ).toBe(false);
  });
});
