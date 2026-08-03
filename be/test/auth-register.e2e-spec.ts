import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { HttpExceptionFilter } from '../src/filters/http-exception.filter';

describe('POST /api/auth/register (e2e)', () => {
  let app: INestApplication<App>;
  const register = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { register } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => jest.clearAllMocks());

  it('returns the explicit HTTP 201 contract with normalized input', async () => {
    register.mockImplementation((input: { fullName: string; email: string }) =>
      Promise.resolve({
        success: true,
        message: 'Account registered successfully.',
        data: {
          accessToken: 'signed.jwt',
          user: { id: 7, fullName: input.fullName, email: input.email },
        },
      }),
    );

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({
        fullName: '  Nguye\u0302\u0303n Văn An ',
        email: ' VISITOR@EXAMPLE.COM ',
        password: 'StrongPass1!',
        confirmPassword: 'StrongPass1!',
      })
      .expect(201)
      .expect({
        success: true,
        message: 'Account registered successfully.',
        data: {
          accessToken: 'signed.jwt',
          user: {
            id: 7,
            fullName: 'Nguyễn Văn An',
            email: 'visitor@example.com',
          },
        },
      });
  });

  it('returns the global 400 envelope and never calls the service', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Bad2 Name',
        email: 'invalid',
        password: 'short',
        confirmPassword: 'different',
        username: 'forbidden',
      })
      .expect(400);

    const body = response.body as unknown as {
      success: boolean;
      message: unknown;
    };
    expect(body.success).toBe(false);
    expect(Array.isArray(body.message)).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });

  it('returns the global 409 envelope for a duplicate normalized email', async () => {
    register.mockRejectedValue(
      new ConflictException('This email is already registered.'),
    );

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Nguyễn Văn An',
        email: 'visitor@example.com',
        password: 'StrongPass1!',
        confirmPassword: 'StrongPass1!',
      })
      .expect(409)
      .expect({
        success: false,
        message: 'This email is already registered.',
        error: 'Conflict',
      });
  });
});
