import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../../filters/http-exception.filter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController registration endpoint', () => {
  let app: INestApplication;
  const authService = {
    register: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
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

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authService.register.mockReset();
  });

  it('returns the HTTP 201 registration contract', async () => {
    const responseBody = {
      success: true,
      message: 'Registration successful',
      data: {
        accessToken: 'signed.jwt.token',
        user: {
          id: 1,
          fullName: 'John Doe',
          email: 'user@example.com',
        },
      },
    };
    authService.register.mockResolvedValue(responseBody);

    await request(app.getHttpServer() as App)
      .post('/api/auth/register')
      .send({
        fullName: ' John Doe ',
        email: ' USER@example.com ',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
      })
      .expect(201)
      .expect(responseBody);

    expect(authService.register).toHaveBeenCalledWith({
      fullName: 'John Doe',
      email: 'user@example.com',
      password: 'StrongP@ss1',
      confirmPassword: 'StrongP@ss1',
    });
  });

  it('returns the HTTP 400 error envelope without calling the service', async () => {
    const response = await request(app.getHttpServer() as App)
      .post('/api/auth/register')
      .send({
        fullName: '',
        email: 'invalid',
        password: '',
        confirmPassword: '',
      })
      .expect(400);

    const body = response.body as { success: boolean; message: unknown };
    expect(body.success).toBe(false);
    expect(Array.isArray(body.message)).toBe(true);
    expect(authService.register).not.toHaveBeenCalled();
  });
});
