import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
    authService.register.mockReset();
  });

  it('delegates POST registration to AuthService without controller logic', async () => {
    const dto: RegisterDto = {
      fullName: 'John Doe',
      email: 'user@example.com',
      password: 'P@ssw0rd!',
      confirmPassword: 'P@ssw0rd!',
    };
    const expected = {
      success: true,
      message: 'Registration successful',
      data: {
        accessToken: 'token',
        user: { id: 1, fullName: 'John Doe', email: 'user@example.com' },
      },
    };
    authService.register.mockResolvedValue(expected);

    await expect(controller.register(dto)).resolves.toEqual(expected);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });
});
