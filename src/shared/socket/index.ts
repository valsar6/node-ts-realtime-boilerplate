import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../../config/env';
import { logger } from '../utils/logger';
import { registerChatNamespace } from '../../modules/chat/events';

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  registerChatNamespace(io);

  io.engine.on('connection_error', (err: Error) => {
    logger.error('Socket.io engine connection error', { message: err.message });
  });

  return io;
}
