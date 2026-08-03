import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

const dto: RegisterDto = {
  fullName: 'Nguyễn Văn An',
  email: 'visitor@example.com',
  password: 'StrongPass1!',
  confirmPassword: 'StrongPass1!',
};

describe('AuthService', () => {
  const exists = jest.fn<Promise<boolean>, [object]>();
  const create = jest.fn<User, [Partial<User>]>();
  const save = jest.fn<Promise<User>, [User]>();
  const signAsync = jest.fn<Promise<string>, [object]>();
  const repository = { exists } as unknown as Repository<User>;
  const transactionRepository = { create, save } as unknown as Repository<User>;
  const dataSource = {
    transaction: jest.fn(
      async (
        work: (manager: {
          getRepository: () => Repository<User>;
        }) => Promise<unknown>,
      ) => work({ getRepository: () => transactionRepository }),
    ),
  } as unknown as DataSource;
  const jwtService = { signAsync } as unknown as JwtService;
  const service = new AuthService(repository, dataSource, jwtService);

  beforeEach(() => {
    jest.clearAllMocks();
    exists.mockResolvedValue(false);
    create.mockImplementation((input) => Object.assign(new User(), input));
    save.mockImplementation((user) =>
      Promise.resolve(Object.assign(user, { userId: 42 })),
    );
    signAsync.mockResolvedValue('signed.jwt');
  });

  it('normalizes, hashes with cost 10, persists before signing, and maps response', async () => {
    const events: string[] = [];
    save.mockImplementation((user) => {
      events.push('persist');
      return Promise.resolve(Object.assign(user, { userId: 42 }));
    });
    signAsync.mockImplementation(() => {
      events.push('sign');
      return Promise.resolve('signed.jwt');
    });

    const result = await service.register({
      ...dto,
      fullName: '  Nguye\u0302\u0303n Văn An ',
      email: ' VISITOR@EXAMPLE.COM ',
    });

    const created = create.mock.calls[0][0];
    expect(created.fullName).toBe('Nguyễn Văn An');
    expect(created.email).toBe('visitor@example.com');
    expect(created.normalizedEmail).toBe('visitor@example.com');
    expect(created.username).toBe('visitor');
    expect(created.totalBalance).toBe(0);
    expect(created).not.toHaveProperty('confirmPassword');
    expect(created).not.toHaveProperty('password');
    expect(await bcrypt.compare(dto.password, created.passwordHash!)).toBe(
      true,
    );
    expect(bcrypt.getRounds(created.passwordHash!)).toBe(10);
    expect(events).toEqual(['persist', 'sign']);
    expect(result).toEqual({
      success: true,
      message: 'Account registered successfully.',
      data: {
        accessToken: 'signed.jwt',
        user: {
          id: 42,
          fullName: 'Nguyễn Văn An',
          email: 'visitor@example.com',
        },
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/password|confirmPassword/i);
  });

  it('rejects an existing normalized email without hashing, persisting, or signing', async () => {
    exists.mockResolvedValue(true);
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(save).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('maps a database normalized-email race conflict to HTTP 409', async () => {
    save.mockRejectedValue(
      new QueryFailedError('INSERT', [], {
        code: 'ER_DUP_ENTRY',
        errno: 1062,
        message: "Duplicate entry for key 'IDX_USERS_NORMALIZED_EMAIL'",
      }),
    );

    await expect(service.register(dto)).rejects.toMatchObject({ status: 409 });
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('allows exactly one winner for concurrent normalized-email registration', async () => {
    let persisted = false;
    save.mockImplementation((user) => {
      if (!persisted) {
        persisted = true;
        return Promise.resolve(Object.assign(user, { userId: 42 }));
      }
      return Promise.reject(
        new QueryFailedError('INSERT', [], {
          code: 'ER_DUP_ENTRY',
          errno: 1062,
          message: "Duplicate entry for key 'IDX_USERS_NORMALIZED_EMAIL'",
        }),
      );
    });

    const results = await Promise.allSettled([
      service.register(dto),
      service.register({ ...dto, email: ' VISITOR@EXAMPLE.COM ' }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { status: 409 } });
    expect(signAsync).toHaveBeenCalledTimes(1);
  });

  it('does not issue a JWT when persistence fails', async () => {
    save.mockRejectedValue(new Error('database unavailable'));
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 when signing fails so the transaction can roll back', async () => {
    signAsync.mockRejectedValue(new Error('signing failed'));
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it.each(['VISITOR@EXAMPLE.COM', 'Visitor'])(
    'rejects a password matching the email identity: %s',
    async (password) => {
      await expect(
        service.register({ ...dto, password, confirmPassword: password }),
      ).rejects.toMatchObject({ status: 400 });
      expect(save).not.toHaveBeenCalled();
    },
  );
});
