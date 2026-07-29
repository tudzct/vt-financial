import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService.register', () => {
  let service: AuthService;
  let repository: jest.Mocked<Repository<User>>;
  let jwtService: { signAsync: jest.Mock };
  let persistedUsers: User[];

  const validDto = (overrides: Partial<RegisterDto> = {}): RegisterDto => ({
    fullName: 'John Doe',
    email: 'user@example.com',
    password: 'P@ssw0rd!',
    confirmPassword: 'P@ssw0rd!',
    ...overrides,
  });

  beforeEach(() => {
    persistedUsers = [];
    let normalizedEmailQuery = '';

    const repositoryMock = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn((_query: string, parameters: { email: string }) => {
          normalizedEmailQuery = parameters.email;
          return {
            getOne: jest.fn(
              async () =>
                persistedUsers.find(
                  (user) =>
                    user.email.trim().toLowerCase() === normalizedEmailQuery,
                ) ?? null,
            ),
          };
        }),
      })),
      exists: jest.fn(async ({ where }: { where: Partial<User> }) =>
        persistedUsers.some((user) => user.username === where.username),
      ),
      create: jest.fn((data: Partial<User>) => Object.assign(new User(), data)),
      save: jest.fn(async (user: User) => {
        if (persistedUsers.some((item) => item.email === user.email)) {
          throw new QueryFailedError('INSERT', [], {
            code: 'ER_DUP_ENTRY',
            errno: 1062,
          });
        }
        user.userId = persistedUsers.length + 1;
        persistedUsers.push(user);
        return user;
      }),
    };

    const manager = {
      getRepository: jest.fn(() => repositoryMock),
      transaction: jest.fn(async (callback: (value: unknown) => unknown) =>
        callback(manager),
      ),
    };

    repository = {
      ...repositoryMock,
      manager,
    } as unknown as jest.Mocked<Repository<User>>;
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
    };
    service = new AuthService(repository, jwtService as unknown as JwtService);
  });

  it('BR-REG-01 normalizes an NFC full name and rejects invalid length/pattern', async () => {
    const response = await service.register(
      validDto({ fullName: '  Jo\u0301hn Doe  ' }),
    );
    expect(response.data?.user.fullName).toBe('Jóhn Doe');

    await expect(
      service.register(validDto({ fullName: 'Joe' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.register(validDto({ fullName: 'John  Doe' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('BR-REG-02 trims/lowercases email and rejects an invalid or oversized email', async () => {
    const response = await service.register(
      validDto({ email: '  USER@EXAMPLE.COM  ' }),
    );
    expect(response.data?.user.email).toBe('user@example.com');

    await expect(
      service.register(validDto({ email: 'not-an-email' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.register(validDto({ email: `${'a'.repeat(244)}@example.com` })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('BR-REG-03 rejects an existing normalized email before insert', async () => {
    persistedUsers.push(
      Object.assign(new User(), {
        userId: 1,
        email: ' User@Example.com ',
        username: 'existing',
      }),
    );

    await expect(
      service.register(validDto({ email: ' USER@EXAMPLE.COM ' })),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('BR-REG-04 rejects invalid length, whitespace, and missing complexity classes', async () => {
    const invalidPasswords = [
      'Short1!',
      'Password 1!',
      'PASSWORD1!',
      'password1!',
      'Password!',
      'Password1',
    ];

    for (const password of invalidPasswords) {
      await expect(
        service.register(validDto({ password, confirmPassword: password })),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('BR-REG-05 rejects characters outside the permitted password set', async () => {
    await expect(
      service.register(
        validDto({ password: 'P@ssw0rd!é', confirmPassword: 'P@ssw0rd!é' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('BR-REG-06 rejects a password equal to the email or its local part', async () => {
    await expect(
      service.register(
        validDto({
          email: 'Strong1!@example.com',
          password: 'strong1!@EXAMPLE.COM',
          confirmPassword: 'strong1!@EXAMPLE.COM',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.register(
        validDto({
          email: 'Strong1!@example.com',
          password: 'Strong1!',
          confirmPassword: 'Strong1!',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('BR-REG-07 requires confirmPassword and exact case-sensitive equality', async () => {
    await expect(
      service.register(validDto({ confirmPassword: '' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.register(validDto({ confirmPassword: 'p@ssw0rd!' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('BR-REG-08 never persists or returns confirmPassword', async () => {
    const response = await service.register(validDto());
    const createPayload = repository.create.mock.calls[0][0] as Record<
      string,
      unknown
    >;

    expect(createPayload).not.toHaveProperty('confirmPassword');
    expect(JSON.stringify(response)).not.toContain('confirmPassword');
    expect(JSON.stringify(response)).not.toContain('P@ssw0rd!');
  });

  it('BR-REG-09 creates no user and issues no JWT for invalid input', async () => {
    await expect(
      service.register(validDto({ fullName: '' })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(persistedUsers).toHaveLength(0);
  });

  it('BR-REG-10 stores a bcrypt hash with cost 10 before returning', async () => {
    const response = await service.register(validDto());
    const savedPassword = persistedUsers[0].password;

    expect(savedPassword).not.toBe('P@ssw0rd!');
    await expect(bcrypt.compare('P@ssw0rd!', savedPassword)).resolves.toBe(
      true,
    );
    expect(bcrypt.getRounds(savedPassword)).toBe(10);
    expect(JSON.stringify(response)).not.toContain(savedPassword);
  });

  it('BR-REG-11 allows exactly one concurrent insert and maps the conflict to HTTP 409', async () => {
    const results = await Promise.allSettled([
      service.register(validDto()),
      service.register(validDto()),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejection = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejection?.reason).toBeInstanceOf(ConflictException);
    expect((rejection?.reason as ConflictException).getStatus()).toBe(409);
    expect(persistedUsers).toHaveLength(1);
    expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
  });

  it('BR-REG-12 returns the persisted user and signs the specified JWT payload', async () => {
    persistedUsers.push(
      Object.assign(new User(), {
        userId: 7,
        email: 'other@example.com',
        username: 'user',
      }),
    );

    const response = await service.register(validDto());

    expect(response).toEqual({
      success: true,
      message: 'Registration successful',
      data: {
        accessToken: 'signed-access-token',
        user: {
          id: 2,
          fullName: 'John Doe',
          email: 'user@example.com',
        },
      },
    });
    expect(persistedUsers[1].username).toBe('user1');
    expect(persistedUsers[1].totalBalance).toBe(0);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 2,
      email: 'user@example.com',
    });
  });

  it('rolls back through the transaction contract when JWT creation fails', async () => {
    jwtService.signAsync.mockRejectedValue(new Error('sign failed'));

    await expect(service.register(validDto())).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
