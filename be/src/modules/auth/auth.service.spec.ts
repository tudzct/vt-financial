import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher.service';

describe('AuthService registration', () => {
  const validRegistration = {
    fullName: '  José Silva  ',
    email: '  USER@Example.com ',
    password: 'StrongP@ss1',
    confirmPassword: 'StrongP@ss1',
  };

  let users: Pick<Repository<User>, 'findOne' | 'create' | 'save'>;
  let dataSource: Pick<DataSource, 'transaction'>;
  let jwtService: Pick<JwtService, 'signAsync'>;
  let passwordHasher: Pick<PasswordHasher, 'hash' | 'matches' | 'cost'>;
  let configService: Pick<ConfigService, 'get'>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value as User),
      save: jest.fn((value) => Promise.resolve({ ...value, id: 42 } as User)),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(users),
    } as unknown as EntityManager;
    dataSource = {
      transaction: jest.fn((callback) =>
        (callback as (entityManager: EntityManager) => Promise<unknown>)(
          manager,
        ),
      ),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    };
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('$2b$10$hash'),
      matches: jest.fn(),
      cost: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue(''),
    };

    service = new AuthService(
      dataSource as DataSource,
      jwtService as JwtService,
      passwordHasher as PasswordHasher,
      configService as ConfigService,
    );
  });

  it('normalizes input, hashes at cost 10, persists once, and returns only mapped user data', async () => {
    const response = await service.register(validRegistration);

    expect(passwordHasher.hash).toHaveBeenCalledWith('StrongP@ss1', 10);
    expect(users.create).toHaveBeenCalledWith({
      fullName: 'José Silva',
      email: 'user@example.com',
      username: 'user',
      passwordHash: '$2b$10$hash',
      totalBalance: 0,
    });
    expect(users.save).toHaveBeenCalledTimes(1);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 42,
      email: 'user@example.com',
    });
    expect(response).toEqual({
      success: true,
      message: 'Registration successful',
      data: {
        accessToken: 'signed.jwt.token',
        user: {
          id: 42,
          fullName: 'José Silva',
          email: 'user@example.com',
        },
      },
    });
    expect(JSON.stringify(response)).not.toContain('StrongP@ss1');
    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });

  it('rejects mismatched passwords before opening a transaction', async () => {
    await expect(
      service.register({
        ...validRegistration,
        confirmPassword: 'DifferentP@ss1',
      }),
    ).rejects.toThrow(new BadRequestException('Passwords do not match.'));

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects a configured blacklisted password before persistence', async () => {
    configService.get = jest.fn().mockReturnValue('strongp@ss1');

    await expect(service.register(validRegistration)).rejects.toThrow(
      new BadRequestException('Password is too common.'),
    );
    expect(users.save).not.toHaveBeenCalled();
  });

  it('returns a conflict for an existing normalized email', async () => {
    (users.findOne as jest.Mock).mockResolvedValueOnce({ id: 9 });

    await expect(service.register(validRegistration)).rejects.toThrow(
      new ConflictException('This email is already registered.'),
    );
    expect(users.save).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('maps a concurrent database unique violation to HTTP 409 without issuing a token', async () => {
    (users.save as jest.Mock).mockRejectedValue({
      driverError: { code: 'ER_DUP_ENTRY' },
    });

    await expect(service.register(validRegistration)).rejects.toThrow(
      new ConflictException('This email is already registered.'),
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('enforces non-trivial email comparisons and permitted password characters', () => {
    expect(
      service.isRegistrationInputValid({
        fullName: 'John Doe',
        email: 'P@ssword1@example.com',
        password: 'P@ssword1@example.com',
        confirmPassword: 'P@ssword1@example.com',
      }),
    ).toBe(false);
    expect(
      service.isRegistrationInputValid({
        fullName: 'John Doe',
        email: 'P@ssword1@example.com',
        password: 'P@ssword1',
        confirmPassword: 'P@ssword1',
      }),
    ).toBe(false);
    expect(
      service.isRegistrationInputValid({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'StrongP@ss1`',
        confirmPassword: 'StrongP@ss1`',
      }),
    ).toBe(false);
  });
});
