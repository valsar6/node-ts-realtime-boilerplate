import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { AccessTokenPayload } from '../types/jwt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthedSocket = Socket<any, any, any, { user: AccessTokenPayload }>;

export function socketAuthMiddleware(
  socket: AuthedSocket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth['token'] as string | undefined;

  if (!token) {
    next(new Error('Authentication token missing'));
    return;
  }

  try {
    socket.data.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error('Invalid or expired authentication token'));
  }
}
