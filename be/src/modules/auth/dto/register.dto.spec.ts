import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const validInput = {
  fullName: 'Nguyễn Văn An',
  email: 'visitor@example.com',
  password: 'StrongPass1!',
  confirmPassword: 'StrongPass1!',
};

const validateInput = async (overrides: Partial<typeof validInput>) => {
  const dto = plainToInstance(RegisterDto, { ...validInput, ...overrides });
  return { dto, errors: await validate(dto) };
};

describe('RegisterDto', () => {
  it('normalizes fullName with NFC/trim and email with trim/lowercase', async () => {
    const { dto, errors } = await validateInput({
      fullName: '  Nguye\u0302\u0303n Văn An  ',
      email: '  VISITOR@EXAMPLE.COM ',
    });

    expect(errors).toHaveLength(0);
    expect(dto.fullName).toBe('Nguyễn Văn An');
    expect(dto.email).toBe('visitor@example.com');
  });

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace only'],
    ['Abc', 'three characters'],
    ['A'.repeat(26), '26 characters'],
    ['John2 Doe', 'digit'],
    ['John-Doe', 'punctuation'],
    ['John  Doe', 'double spaces'],
  ])('rejects invalid fullName: %s (%s)', async (fullName) => {
    const { errors } = await validateInput({ fullName });
    expect(errors.some((error) => error.property === 'fullName')).toBe(true);
  });

  it.each(['Abcd', 'A'.repeat(25), 'Đặng Mỹ Linh'])(
    'accepts fullName boundary/Unicode value %s',
    async (fullName) => {
      const { errors } = await validateInput({ fullName });
      expect(errors).toHaveLength(0);
    },
  );

  it.each(['', '   ', 'not-an-email', `${'a'.repeat(244)}@example.com`])(
    'rejects invalid email %s',
    async (email) => {
      const { errors } = await validateInput({ email });
      expect(errors.some((error) => error.property === 'email')).toBe(true);
    },
  );

  it.each([
    'Short1!',
    `${'A'.repeat(63)}a1!`,
    'Strong Pass1!',
    'STRONGPASS1!',
    'strongpass1!',
    'StrongPassword!',
    'StrongPass12',
    'StrongPass1~',
    'Password1!',
  ])('rejects invalid password %s', async (password) => {
    const { errors } = await validateInput({
      password,
      confirmPassword: password,
    });
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it.each([
    'Aa1!aaaa',
    'Aa1@aaaa',
    'Aa1#aaaa',
    'Aa1$aaaa',
    'Aa1%aaaa',
    'Aa1^aaaa',
    'Aa1&aaaa',
    'Aa1*aaaa',
    'Aa1(aaaa',
    'Aa1{aaaa',
    'Aa1_aaaa',
    'Aa1+aaaa',
    'Aa1[aaaa',
    'Aa1,aaaa',
    'Aa1/aaaa',
    'Aa1<aaaa',
    'Aa1?aaaa',
    'Aa1\\aaaa',
    'Aa1|aaaa',
    'Aa1:aaaa',
    'Aa1;aaaa',
  ])('accepts permitted special-character password %s', async (password) => {
    const { errors } = await validateInput({
      password,
      confirmPassword: password,
    });
    expect(errors).toHaveLength(0);
  });

  it.each(['', 'strongpass1!', 'StrongPass1?'])(
    'rejects invalid confirmation %s',
    async (confirmPassword) => {
      const { errors } = await validateInput({ confirmPassword });
      expect(errors.some((error) => error.property === 'confirmPassword')).toBe(
        true,
      );
    },
  );

  it('rejects non-whitelisted properties through the global pipe', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validInput,
      username: 'not-accepted',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((error) => error.property === 'username')).toBe(true);
  });
});
