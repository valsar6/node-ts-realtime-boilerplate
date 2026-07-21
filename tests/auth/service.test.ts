import bcrypt from 'bcryptjs';
import { authService } from '../../src/modules/auth/service';
import { prisma } from '../../src/shared/utils/prisma';
import { ConflictError, UnauthorizedError } from '../../src/shared/errors/AppError';

jest.mock('../../src/shared/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

describe('authService.register', () => {
  it('throws ConflictError when the email is already registered', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      authService.register({ email: 'taken@example.com', password: 'password123' }),
    ).rejects.toThrow(ConflictError);
  });

  it('creates a user and returns tokens on success', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      tokenVersion: 0,
    });

    const result = await authService.register({
      email: 'new@example.com',
      password: 'password123',
    });

    expect(result.user).toEqual({ id: 'user-1', email: 'new@example.com' });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));

    const [createArgs] = mockedPrisma.user.create.mock.calls[0] as [
      { data: { email: string; passwordHash: string } },
    ];
    expect(createArgs.data.email).toBe('new@example.com');
    expect(createArgs.data.passwordHash).not.toBe('password123');
  });
});

describe('authService.login', () => {
  it('throws UnauthorizedError when the user does not exist', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'nobody@example.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when the password is wrong', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      tokenVersion: 0,
    });

    await expect(
      authService.login({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('returns tokens when credentials are valid', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      tokenVersion: 0,
    });

    const result = await authService.login({
      email: 'user@example.com',
      password: 'correct-password',
    });

    expect(result.user).toEqual({ id: 'user-1', email: 'user@example.com' });
  });
});
