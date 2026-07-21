import { Request, Response } from 'express';
import { requireAuth } from '../../src/shared/middleware/auth';
import { signAccessToken } from '../../src/shared/utils/jwt';
import { UnauthorizedError } from '../../src/shared/errors/AppError';

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe('requireAuth', () => {
  it('rejects requests with no Authorization header', () => {
    const next = jest.fn();
    requireAuth(mockReq(), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('rejects requests with a malformed token', () => {
    const next = jest.fn();
    requireAuth(mockReq({ authorization: 'Bearer not-a-real-token' }), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('attaches the decoded user and calls next() with no error for a valid token', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'user@example.com' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = jest.fn();

    requireAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(expect.objectContaining({ sub: 'user-1', email: 'user@example.com' }));
  });
});
