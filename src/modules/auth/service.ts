import { prisma } from '../../shared/utils/prisma';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { LoginInput, RegisterInput } from './schemas';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends AuthTokens {
  user: { id: string; email: string };
}

function buildAuthResult(id: string, email: string, tokenVersion: number): AuthResult {
  return {
    user: { id, email },
    accessToken: signAccessToken({ sub: id, email }),
    refreshToken: signRefreshToken({ sub: id, tokenVersion }),
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: { email: input.email, passwordHash },
    });

    return buildAuthResult(user.id, user.email, user.tokenVersion);
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return buildAuthResult(user.id, user.email, user.tokenVersion);
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    return {
      accessToken: signAccessToken({ sub: user.id, email: user.email }),
      refreshToken: signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion }),
    };
  },
};
